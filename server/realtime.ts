import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { ServerResponse } from "http";
import type { Message } from "../shared/schema";
import { storage } from "./storage";
import { getSharedMiddlewares } from "./replitAuth";

// Connection registry: channelId -> Set of authenticated clients
const channelConnections = new Map<string, Set<{
  socket: WebSocket;
  userId: string;
  churchId: string | null;
  role: string;
}>>();

// User -> sockets mapping for cleanup
const userSockets = new Map<string, Set<WebSocket>>();

// Helper to apply Express session middlewares with a real ServerResponse
function applySessionMiddlewares(
  req: IncomingMessage,
  res: ServerResponse,
  callback: (err?: any) => void
) {
  // Reuse the shared middleware instances from replitAuth
  const { session, passportInit, passportSession } = getSharedMiddlewares();
  
  session(req as any, res as any, (err1: any) => {
    if (err1) return callback(err1);
    
    passportInit(req as any, res as any, (err2: any) => {
      if (err2) return callback(err2);
      
      passportSession(req as any, res as any, callback);
    });
  });
}

export function initRealtime(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade with proper session parsing
  server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
      return; // Let other handlers process non-WS upgrades
    }

    // Create a real ServerResponse for session middleware
    const res = new ServerResponse(req);
    
    // Apply Express session + passport middleware chain
    applySessionMiddlewares(req, res, (err) => {
      if (err) {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
        return;
      }

      // Check if user is authenticated
      const isAuth = (req as any).isAuthenticated && (req as any).isAuthenticated();
      const user = (req as any).user;
      
      if (!isAuth || !user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Upgrade is authenticated, let WSS handle it
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
  });

  wss.on('connection', async (ws, req) => {
    let userId: string;
    let churchId: string | null;
    let userRole: string;
    
    try {
      // Session was already validated during upgrade
      const session = (req as any).session;
      const userClaims = session?.passport?.user?.claims;
      
      if (!userClaims || !userClaims.sub) {
        ws.close(1008, 'Invalid session');
        return;
      }

      userId = userClaims.sub;
      
      // Fetch fresh user record from storage
      const user = await storage.getUser(userId);
      
      if (!user) {
        ws.close(1008, 'User not found');
        return;
      }

      // Validate user has a valid role
      if (!user.role) {
        ws.close(1008, 'Invalid user role');
        return;
      }

      // Normalize churchId to null if undefined
      churchId = user.churchId ?? null;
      userRole = user.role;

      // Track user connection
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(ws);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscribe' && message.channelId) {
            const channelId = message.channelId;
            
            // Fetch the channel to validate ownership
            let hasAccess = false;
            
            // Super admins can access all channels
            if (userRole === 'super_admin') {
              hasAccess = true;
            } else {
              // Church admins and members must have a churchId
              if (!churchId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'User not assigned to a church'
                }));
                console.error(`Access denied: User ${userId} has no churchId`);
                return;
              }
              
              // Verify channel belongs to user's church
              const channels = await storage.getChannels(churchId);
              hasAccess = channels.some(c => c.id === channelId);
            }
            
            if (!hasAccess) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Access denied to channel'
              }));
              console.error(`Access denied: User ${userId} (role: ${userRole}, church: ${churchId}) attempted to access channel ${channelId}`);
              return;
            }

            // Add to channel connections
            if (!channelConnections.has(channelId)) {
              channelConnections.set(channelId, new Set());
            }
            
            channelConnections.get(channelId)!.add({
              socket: ws,
              userId,
              churchId,
              role: userRole
            });

            ws.send(JSON.stringify({
              type: 'subscribed',
              channelId
            }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        // Clean up all subscriptions for this socket
        channelConnections.forEach((clients, channelId) => {
          const toRemove = Array.from(clients).filter(c => c.socket === ws);
          toRemove.forEach(c => clients.delete(c));
          
          if (clients.size === 0) {
            channelConnections.delete(channelId);
          }
        });

        // Clean up user socket tracking
        if (userId && userSockets.has(userId)) {
          userSockets.get(userId)!.delete(ws);
          if (userSockets.get(userId)!.size === 0) {
            userSockets.delete(userId);
          }
        }
      });

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('pong', () => {
        // Connection is alive
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Server error');
    }
  });

  return wss;
}

// Broadcast a new message to all clients subscribed to a channel
export function broadcastMessage(channelId: string, message: Message) {
  const clients = channelConnections.get(channelId);
  
  if (!clients) {
    return;
  }

  const payload = JSON.stringify({
    type: 'message',
    payload: message
  });

  clients.forEach(({ socket }) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import type { User } from "@shared/schema";
import { insertChurchSchema, insertEventSchema, insertPostSchema, insertCheckInSchema, insertMessageSchema } from "@shared/schema";

// Middleware to get current user from session
const getCurrentUser: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as any;
  if (!sessionUser?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(sessionUser.claims.sub);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  
  res.locals.user = user;
  next();
};

// Middleware to require super admin
const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const user = res.locals.user as User;
  if (user.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden: Super admin only" });
  }
  next();
};

// Middleware to require church admin
const requireChurchAdmin: RequestHandler = (req, res, next) => {
  const user = res.locals.user as User;
  if (user.role !== "church_admin" && user.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden: Church admin only" });
  }
  next();
};

export function registerRoutes(app: Express) {
  // Auth endpoint
  app.get("/api/auth/user", isAuthenticated, getCurrentUser, (req, res) => {
    res.json(res.locals.user);
  });

  // Super Admin - Church Management
  app.get("/api/admin/churches", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const churches = await storage.getAllChurches();
    res.json(churches);
  });

  app.post("/api/admin/churches/:id/approve", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const church = await storage.getChurch(id);
    
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Approve church and set admin role
    await storage.updateChurchStatus(id, "approved");
    await storage.updateUserRole(church.adminUserId, "church_admin", id);
    
    res.json({ message: "Church approved" });
  });

  app.post("/api/admin/churches/:id/reject", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    await storage.updateChurchStatus(id, "rejected");
    res.json({ message: "Church rejected" });
  });

  // Church Registration
  app.post("/api/churches/register", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    try {
      const churchData = insertChurchSchema.parse(req.body);
      const church = await storage.createChurch({
        ...churchData,
        adminUserId: user.id,
        status: "pending",
      });
      
      res.status(201).json(church);
    } catch (error) {
      res.status(400).json({ message: "Invalid church data" });
    }
  });

  // Members
  app.get("/api/members", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const members = await storage.getUsersByChurch(user.churchId);
    res.json(members);
  });

  // All users (for messaging display)
  app.get("/api/users", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const users = await storage.getUsersByChurch(user.churchId);
    res.json(users);
  });

  // Posts
  app.get("/api/posts", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const posts = await storage.getPosts(user.churchId);
    res.json(posts);
  });

  app.post("/api/posts", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost({
        ...postData,
        churchId: user.churchId,
        authorId: user.id,
      });
      
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  // Events
  app.get("/api/events", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const events = await storage.getEvents(user.churchId);
    res.json(events);
  });

  app.get("/api/events/upcoming", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const events = await storage.getEvents(user.churchId);
    const upcomingEvents = events.filter(e => new Date(e.startTime) > new Date());
    res.json(upcomingEvents);
  });

  app.post("/api/events", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent({
        ...eventData,
        churchId: user.churchId,
        creatorId: user.id,
      });
      
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // Event RSVPs
  app.get("/api/events/rsvps", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const rsvps = await storage.getRsvpsByUser(user.id);
    res.json(rsvps);
  });

  app.post("/api/events/:eventId/rsvp", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { eventId } = req.params;
    const { status } = req.body;
    
    if (!["going", "maybe", "not_going"].includes(status)) {
      return res.status(400).json({ message: "Invalid RSVP status" });
    }
    
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    if (event.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const rsvp = await storage.upsertRsvp({
      status,
      eventId,
      userId: user.id,
    });
    
    res.json(rsvp);
  });

  // Check-ins
  app.post("/api/check-ins", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    try {
      const checkInData = insertCheckInSchema.parse(req.body);
      const checkIn = await storage.createCheckIn({
        ...checkInData,
        userId: user.id,
        churchId: user.churchId,
        checkInTime: new Date(),
      });
      
      res.status(201).json(checkIn);
    } catch (error) {
      res.status(400).json({ message: "Invalid check-in data" });
    }
  });

  app.get("/api/check-ins/my-history", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const checkIns = await storage.getCheckInsByUser(user.id);
    res.json(checkIns);
  });

  app.get("/api/check-ins/recent", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const checkIns = await storage.getCheckInsByChurch(user.churchId, 20);
    res.json(checkIns);
  });

  // Message Channels
  app.get("/api/channels", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const channels = await storage.getChannels(user.churchId);
    res.json(channels);
  });

  // Messages
  app.get("/api/channels/:channelId/messages", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { channelId } = req.params;
    
    const messages = await storage.getMessages(channelId);
    res.json(messages);
  });

  app.post("/api/channels/:channelId/messages", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { channelId } = req.params;
    
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...messageData,
        channelId,
        userId: user.id,
      });
      
      // Broadcast message to all connected clients in the channel
      const { broadcastMessage } = await import("./realtime");
      broadcastMessage(channelId, message);
      
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });
}

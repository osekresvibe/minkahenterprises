import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import type { User } from "@shared/schema";
import { insertChurchSchema, updateChurchSchema, insertEventSchema, insertPostSchema, insertCheckInSchema, insertMessageSchema, insertInvitationSchema, insertMinistryTeamSchema, insertTeamMemberSchema } from "@shared/schema";
import crypto from "crypto";

// Rate limiting for invitations: 10 invites per hour per user
const inviteRateLimits = new Map<string, number[]>();
const INVITE_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function canSendInvite(userId: string): boolean {
  const now = Date.now();
  const userInvites = inviteRateLimits.get(userId) || [];
  
  // Remove timestamps older than 1 hour
  const recentInvites = userInvites.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  // Check if user has exceeded rate limit
  return recentInvites.length < INVITE_RATE_LIMIT;
}

function recordInviteSent(userId: string): void {
  const now = Date.now();
  const userInvites = inviteRateLimits.get(userId) || [];
  
  // Remove timestamps older than 1 hour
  const recentInvites = userInvites.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  // Add current timestamp
  recentInvites.push(now);
  inviteRateLimits.set(userId, recentInvites);
}

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

  // Profile management
  app.put("/api/profile", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { firstName, lastName, email, phone, address, bio } = req.body;
    
    try {
      await storage.updateUser(user.id, {
        firstName,
        lastName,
        email,
        phone,
        address,
        bio,
      });
      
      const updatedUser = await storage.getUser(user.id);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: "Failed to update profile" });
    }
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

  // Church Profile Management
  app.get("/api/churches/my-church", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(404).json({ message: "No church assigned" });
    }
    
    const church = await storage.getChurch(user.churchId);
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    res.json(church);
  });

  app.patch("/api/churches/my-church", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    try {
      const churchData = updateChurchSchema.parse(req.body);
      await storage.updateChurch(user.churchId, churchData);
      const updatedChurch = await storage.getChurch(user.churchId);
      res.json(updatedChurch);
    } catch (error) {
      res.status(400).json({ message: "Invalid church data" });
    }
  });

  // Invitations
  app.post("/api/invitations", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    // Check rate limit BEFORE processing
    if (!canSendInvite(user.id)) {
      return res.status(429).json({ 
        message: `Rate limit exceeded. You can send up to ${INVITE_RATE_LIMIT} invitations per hour.`
      });
    }
    
    try {
      const invitationData = insertInvitationSchema.parse(req.body);
      
      // Check if email is already a member of this church
      const existingMembers = await storage.getUsersByChurch(user.churchId);
      const isAlreadyMember = existingMembers.some(m => m.email === invitationData.email);
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a member of this church" });
      }
      
      // Check for existing pending invitation
      const existingInvitations = await storage.getInvitationsByChurch(user.churchId);
      const hasPendingInvite = existingInvitations.some(
        inv => inv.email === invitationData.email && 
        inv.status === "pending" && 
        new Date(inv.expiresAt) > new Date()
      );
      
      if (hasPendingInvite) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }
      
      // Generate secure token and expiration
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      const invitation = await storage.createInvitation({
        ...invitationData,
        churchId: user.churchId,
        invitedBy: user.id,
        token,
        expiresAt,
      });
      
      // Record successful invitation for rate limiting
      recordInviteSent(user.id);
      
      // TODO: Send email with invitation link (stubbed for now)
      console.log(`[MAILER STUB] Invitation email would be sent to: ${invitationData.email}`);
      console.log(`[MAILER STUB] Invitation link: ${process.env.REPLIT_DOMAINS?.split(',')[0]}/accept-invite/${token}`);
      
      res.json(invitation);
    } catch (error) {
      res.status(400).json({ message: "Invalid invitation data" });
    }
  });

  app.get("/api/invitations", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    const invitations = await storage.getInvitationsByChurch(user.churchId);
    res.json(invitations);
  });

  app.delete("/api/invitations/:id", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    // Verify invitation belongs to this church
    const invitations = await storage.getInvitationsByChurch(user.churchId);
    const invitation = invitations.find(inv => inv.id === id);
    
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    
    await storage.deleteInvitation(id);
    res.json({ message: "Invitation cancelled" });
  });

  app.post("/api/invitations/accept/:token", isAuthenticated, getCurrentUser, async (req, res) => {
    const { token } = req.params;
    const user = res.locals.user as User;
    
    // Get invitation by token
    const invitation = await storage.getInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation" });
    }
    
    // Validate invitation status and expiration
    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "This invitation has already been used" });
    }
    
    if (new Date(invitation.expiresAt) < new Date()) {
      await storage.updateInvitationStatus(token, "expired");
      return res.status(400).json({ message: "This invitation has expired" });
    }
    
    // Check if user's email matches the invitation
    if (user.email !== invitation.email) {
      return res.status(403).json({ message: "This invitation was sent to a different email address" });
    }
    
    // Update user's church and role
    await storage.updateUserRole(user.id, invitation.role, invitation.churchId);
    
    // Mark invitation as accepted
    await storage.updateInvitationStatus(token, "accepted");
    
    res.json({ message: "Invitation accepted successfully", churchId: invitation.churchId });
  });

  // Ministry Teams
  app.get("/api/ministry-teams", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const teams = await storage.getMinistryTeams(user.churchId);
    res.json(teams);
  });
  
  app.post("/api/ministry-teams", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }
    
    try {
      const teamData = insertMinistryTeamSchema.parse(req.body);
      const team = await storage.createMinistryTeam({
        ...teamData,
        churchId: user.churchId,
      });
      
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: "Invalid team data" });
    }
  });
  
  app.get("/api/ministry-teams/:id", isAuthenticated, getCurrentUser, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(team);
  });
  
  app.patch("/api/ministry-teams/:id", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const teamData = insertMinistryTeamSchema.partial().parse(req.body);
      await storage.updateMinistryTeam(id, teamData);
      
      res.json({ message: "Team updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid team data" });
    }
  });
  
  app.delete("/api/ministry-teams/:id", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await storage.deleteMinistryTeam(id);
    res.json({ message: "Team deleted successfully" });
  });
  
  // Team Members
  app.get("/api/ministry-teams/:id/members", isAuthenticated, getCurrentUser, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const members = await storage.getTeamMembersWithUserInfo(id);
    res.json(members);
  });
  
  app.post("/api/ministry-teams/:id/members", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      
      // Verify user being added belongs to the same church
      const memberUser = await storage.getUser(memberData.userId);
      if (!memberUser || memberUser.churchId !== user.churchId) {
        return res.status(400).json({ message: "User must be a member of this church" });
      }
      
      const member = await storage.addTeamMember({
        ...memberData,
        teamId: id,
      });
      
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid member data or user already on team" });
    }
  });
  
  app.delete("/api/ministry-teams/:teamId/members/:userId", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { teamId, userId } = req.params;
    const user = res.locals.user as User;
    
    const team = await storage.getMinistryTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await storage.removeTeamMember(teamId, userId);
    res.json({ message: "Member removed from team" });
  });
  
  app.patch("/api/ministry-teams/:teamId/members/:userId", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { teamId, userId } = req.params;
    const user = res.locals.user as User;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }
    
    const team = await storage.getMinistryTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await storage.updateTeamMemberRole(teamId, userId, role);
    res.json({ message: "Member role updated successfully" });
  });
  
  // Team Directory (accessible to all church members)
  app.get("/api/team-directory", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    
    if (!user.churchId) {
      return res.json([]);
    }
    
    const teamsWithMembers = await storage.getMinistryTeamsWithMembers(user.churchId);
    res.json(teamsWithMembers);
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

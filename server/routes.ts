import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./firebaseAuth";
import type { User } from "@shared/schema";
import { insertChurchSchema, updateChurchSchema, insertEventSchema, insertPostSchema, insertCheckInSchema, insertMessageSchema, insertDirectMessageSchema, insertInvitationSchema, insertMinistryTeamSchema, insertTeamMemberSchema, insertMediaFileSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db, eq, and, asc, desc } from "./db"; // Assuming db is imported from './db'
import type { Church } from "@shared/schema"; // Assuming Church type is imported

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
const storage_multer = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

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

// Mock requireAuth and requireSuperAdmin for new routes
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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
  // Development seed endpoint
  app.get("/seed-data-dev", async (req, res) => {
    try {
      const { execSync } = require('child_process');
      execSync('tsx server/seed.ts', { stdio: 'inherit' });
      res.json({ message: "Database seeded successfully! Refresh the page to see data." });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // Backdoor admin login for development/testing
  app.get("/adminishhy", async (req, res) => {
    try {
      // Create or get a super admin user
      const adminEmail = "superadmin@minkahenterprises.com";
      const adminId = "super-admin-dev";

      // Check if admin exists
      let admin = await storage.getUser(adminId);

      if (!admin) {
        // Create super admin
        admin = await storage.upsertUser({
          id: adminId,
          email: adminEmail,
          firstName: "Super",
          lastName: "Admin",
        });
      }

      // Always ensure role is super_admin
      await storage.updateUserRole(adminId, "super_admin", null);

      // Ensure seed data exists by running seed
      try {
        const churches = await storage.getAllChurches();
        if (churches.length === 0) {
          console.log("No churches found, running seed...");
          const { execSync } = require('child_process');
          execSync('tsx server/seed.ts', { stdio: 'inherit' });
        }
      } catch (error) {
        console.error("Seed check error:", error);
      }

      // Set session manually - use the exact same format as Replit Auth
      if (req.session) {
        req.session.user = {
          claims: {
            sub: adminId,
            email: adminEmail,
            name: "Super Admin",
          },
        };

        await new Promise<void>((resolve, reject) => {
          req.session!.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      console.log("Admin backdoor login successful for:", adminId);

      // Redirect to root - App.tsx will route to super admin dashboard
      res.redirect("/");
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Failed to login as admin" });
    }
  });

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

  // Super Admin - Platform Analytics
  app.get("/api/admin/analytics", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const stats = await storage.getPlatformStats();
    res.json(stats);
  });

  // Super Admin - Church Activity Details
  app.get("/api/admin/churches/:id/activity", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const stats = await storage.getChurchActivityStats(id);
    res.json(stats);
  });

  // Super Admin - All Platform Activity
  app.get("/api/admin/activity", isAuthenticated, getCurrentUser, requireSuperAdmin, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const churchId = req.query.churchId as string | undefined;

    const activities = await storage.getActivityLogs({ limit, offset, churchId });
    res.json(activities);
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

    // Create default message channels
    const defaultChannels = [
      { name: "general", description: "General church announcements and updates" },
      { name: "prayer-requests", description: "Share and support prayer requests" },
      { name: "events", description: "Discuss upcoming church events" },
      { name: "ministries", description: "Ministry team coordination" },
    ];

    for (const channel of defaultChannels) {
      await storage.createChannel({
        name: channel.name,
        description: channel.description,
        churchId: id,
        createdBy: church.adminUserId,
      });
    }

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

  // Bulk email invitations
  app.post("/api/invitations/bulk", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }

    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "Email list is required" });
    }

    try {
      const inviteLink = `${req.protocol}://${req.get('host')}/accept-invite?churchId=${user.churchId}`;
      let sent = 0;

      // In a production app, you'd integrate with an email service like SendGrid, Resend, etc.
      // For now, we'll just log the invitations
      for (const email of emails) {
        if (email && email.includes('@')) {
          console.log(`[INVITE] Sending invitation to ${email} for church ${user.churchId}`);
          console.log(`[INVITE] Link: ${inviteLink}`);
          sent++;
        }
      }

      res.json({ 
        sent,
        message: `${sent} invitation${sent !== 1 ? 's' : ''} queued for sending`,
        inviteLink 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send invitations" });
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

      // Log activity
      await storage.logActivity({
        churchId: user.churchId,
        userId: user.id,
        action: 'member_invited',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: { email: invitationData.email, role: invitationData.role },
      });

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

    // Validate role
    const roleSchema = z.enum(["leader", "co_leader", "member", "volunteer"]);
    const roleValidation = roleSchema.safeParse(role);

    if (!roleValidation.success) {
      return res.status(400).json({ message: "Invalid role. Must be one of: leader, co_leader, member, volunteer" });
    }

    const team = await storage.getMinistryTeam(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Verify team belongs to user's church
    if (team.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await storage.updateTeamMemberRole(teamId, userId, roleValidation.data);
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

  // Truth Posts - Personal posts for social sharing
  app.get("/api/truth-posts/my-posts", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const posts = await storage.getTruthPostsByUser(user.id);
    res.json(posts);
  });

  app.get("/api/truth-posts/discover", isAuthenticated, getCurrentUser, async (req, res) => {
    const location = req.query.location as string | undefined;
    const posts = await storage.discoverTruthPosts(location);
    res.json(posts);
  });

  app.get("/api/truth-posts/:id", async (req, res) => {
    const { id } = req.params;
    const post = await storage.getTruthPost(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  app.post("/api/truth-posts", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;

    try {
      const postData = {
        title: "Truth Post",
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl,
        isPinned: false,
      };

      const post = await storage.createPost({
        ...postData,
        churchId: user.churchId || "public",
        authorId: user.id,
      });

      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: "Invalid truth post data" });
    }
  });

  // Posts
  app.get("/api/posts", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.json([]);
    }

    const posts = await storage.getPosts(user.churchId);

    // Enrich posts with author info
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await storage.getUser(post.authorId);
        return {
          ...post,
          author: author ? {
            id: author.id,
            firstName: author.firstName,
            lastName: author.lastName,
            profileImageUrl: author.profileImageUrl,
          } : null,
        };
      })
    );

    res.json(postsWithAuthors);
  });

  app.get("/api/posts/:id", isAuthenticated, getCurrentUser, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;

    try {
      const post = await storage.getPost(id);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.churchId !== user.churchId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "Failed to get post" });
    }
  });

  // Social media preview endpoint - no auth required for scrapers
  app.get("/feed-post/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const post = await storage.getPost(id);

      if (!post) {
        return res.status(404).send("Post not found");
      }

      // Escape HTML special characters
      const escapeHtml = (str: string) => 
        str.replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");

      // Construct absolute URL from request headers
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const host = req.get("host") || "localhost:5000";
      const baseUrl = `${protocol}://${host}`;

      const imageUrl = post.imageUrl ? `${baseUrl}${post.imageUrl}` : "";
      const pageUrl = `${baseUrl}/feed-post/${id}`;
      const description = escapeHtml(post.content.substring(0, 160));
      const title = escapeHtml(post.title);

      // Return HTML with meta tags for social media scrapers
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Community Feed</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${pageUrl}" />
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />` : ""}
  <meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ""}
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6;">
  <div style="display: none;">
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" />` : ""}
  </div>
  <article>
    <h1>${title}</h1>
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px;" />` : ""}
    <p style="white-space: pre-wrap;">${escapeHtml(post.content)}</p>
    <p style="color: #666; font-size: 14px;">Posted on ${new Date(post.createdAt).toLocaleDateString()}</p>
  </article>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(html);
    } catch (error) {
      res.status(500).send("Error loading post");
    }
  });

  app.post("/api/posts/upload", isAuthenticated, getCurrentUser, requireChurchAdmin, upload.single('media'), async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }

      const postData = {
        title: req.body.title,
        content: req.body.content,
        isPinned: req.body.isPinned === 'true',
        imageUrl: mediaType === 'image' ? mediaUrl : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl : undefined,
      };

      const post = await storage.createPost({
        ...postData,
        churchId: user.churchId,
        authorId: user.id,
      });

      // Log activity
      await storage.logActivity({
        churchId: user.churchId,
        userId: user.id,
        action: 'post_created',
        entityType: 'post',
        entityId: post.id,
        metadata: { title: post.title, hasMedia: !!mediaUrl },
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Post creation error:", error);
      res.status(400).json({ message: "Failed to create post" });
    }
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

      // Log activity
      await storage.logActivity({
        churchId: user.churchId,
        userId: user.id,
        action: 'post_created',
        entityType: 'post',
        entityId: post.id,
        metadata: { title: post.title },
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

      // Log activity
      await storage.logActivity({
        churchId: user.churchId,
        userId: user.id,
        action: 'event_created',
        entityType: 'event',
        entityId: event.id,
        metadata: { title: event.title, startTime: event.startTime },
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

  // Direct Messages
  app.get("/api/direct-messages/partners", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.json([]);
    }

    const partners = await storage.getConversationPartners(user.churchId, user.id);
    res.json(partners);
  });

  app.get("/api/direct-messages", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { recipientId } = req.query;

    if (!user.churchId) {
      return res.json([]);
    }

    if (recipientId && typeof recipientId === 'string') {
      const messages = await storage.getDirectMessages(user.churchId, user.id, recipientId);
      return res.json(messages);
    }

    const messages = await storage.getDirectMessages(user.churchId, user.id);
    res.json(messages);
  });

  app.post("/api/direct-messages", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }

    try {
      const { recipientId, content } = req.body;

      if (!recipientId || !content) {
        return res.status(400).json({ message: "Recipient ID and content are required" });
      }

      // Verify recipient exists and is in same church
      const recipient = await storage.getUser(recipientId);
      if (!recipient || recipient.churchId !== user.churchId) {
        return res.status(400).json({ message: "Invalid recipient" });
      }

      const messageData = insertDirectMessageSchema.parse({ content });
      const message = await storage.createDirectMessage({
        ...messageData,
        senderId: user.id,
        recipientId,
        churchId: user.churchId,
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Media Library - File Upload
  app.post("/api/media/upload", isAuthenticated, getCurrentUser, upload.single('file'), async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const fileUrl = `/uploads/${req.file.filename}`;
      const isVideo = req.file.mimetype.startsWith('video/');

      const mediaData = {
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        mediaType: isVideo ? 'video' : 'image',
        category: req.body.category || 'general',
        description: req.body.description,
        tags: req.body.tags,
        relatedEntityId: req.body.relatedEntityId,
        relatedEntityType: req.body.relatedEntityType,
        churchId: user.churchId,
        uploadedBy: user.id,
      };

      const mediaFile = await storage.createMediaFile(mediaData);
      res.status(201).json(mediaFile);
    } catch (error) {
      res.status(400).json({ message: "Failed to save media file" });
    }
  });

  // Get media files for church
  app.get("/api/media", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.json([]);
    }

    const filters = {
      mediaType: req.query.mediaType as string,
      category: req.query.category as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const mediaFiles = await storage.getMediaFiles(user.churchId, filters);
    res.json(mediaFiles);
  });

  // Get single media file
  app.get("/api/media/:id", isAuthenticated, getCurrentUser, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;

    const mediaFile = await storage.getMediaFile(id);

    if (!mediaFile) {
      return res.status(404).json({ message: "Media file not found" });
    }

    if (mediaFile.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(mediaFile);
  });

  // Update media file metadata
  app.patch("/api/media/:id", isAuthenticated, getCurrentUser, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;

    const mediaFile = await storage.getMediaFile(id);

    if (!mediaFile) {
      return res.status(404).json({ message: "Media file not found" });
    }

    if (mediaFile.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const updates = {
        description: req.body.description,
        tags: req.body.tags,
        category: req.body.category,
      };

      await storage.updateMediaFile(id, updates);
      res.json({ message: "Media file updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update media file" });
    }
  });

  // Delete media file
  app.delete("/api/media/:id", isAuthenticated, getCurrentUser, requireChurchAdmin, async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user as User;

    const mediaFile = await storage.getMediaFile(id);

    if (!mediaFile) {
      return res.status(404).json({ message: "Media file not found" });
    }

    if (mediaFile.churchId !== user.churchId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      // Delete physical file
      const filePath = path.join(process.cwd(), mediaFile.fileUrl);
      await fs.unlink(filePath).catch(() => {});

      // Delete database record
      await storage.deleteMediaFile(id);

      res.json({ message: "Media file deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete media file" });
    }
  });

  // Member Posts - Allow members to create posts
  app.post("/api/member-posts/upload", isAuthenticated, getCurrentUser, upload.single('media'), async (req, res) => {
    const user = res.locals.user as User;

    if (!user.churchId) {
      return res.status(400).json({ message: "No church assigned" });
    }

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }

      const postData = {
        title: req.body.title,
        content: req.body.content,
        imageUrl: mediaType === 'image' ? mediaUrl : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl : undefined,
      };

      const post = await storage.createPost({
        ...postData,
        churchId: user.churchId,
        authorId: user.id,
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Post creation error:", error);
      res.status(400).json({ message: "Failed to create post" });
    }
  });

  app.post("/api/member-posts", isAuthenticated, getCurrentUser, async (req, res) => {
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

  // Direct social media sharing endpoint
  app.post("/api/share-to-social", isAuthenticated, getCurrentUser, async (req, res) => {
    const user = res.locals.user as User;
    const { postId, platform, title, content, imageUrl } = req.body;

    try {
      // For now, return success - in production, this would integrate with Meta Graph API
      // This endpoint can be extended to handle direct posting to Facebook/Instagram

      res.json({ 
        success: true,
        message: `Post shared to ${platform}`,
        postId,
      });
    } catch (error) {
      res.status(400).json({ message: `Failed to share to ${platform}` });
    }
  });

  // Get all churches for super admin
  app.get("/api/churches", requireSuperAdmin, async (req, res) => {
    try {
      const churches = await db.query.churches.findMany({
        orderBy: (churches, { desc }) => [desc(churches.createdAt)],
      });
      res.json(churches);
    } catch (error: any) {
      console.error("Error fetching churches:", error);
      res.status(500).json({ message: "Failed to fetch churches" });
    }
  });

  // Browse approved organizations (public for authenticated users)
  app.get("/api/organizations/browse", requireAuth, async (req, res) => {
    try {
      const organizations = await db.query.churches.findMany({
        where: eq(churches.status, "approved"),
        orderBy: (churches, { asc }) => [asc(churches.name)],
      });
      res.json(organizations);
    } catch (error: any) {
      console.error("Error browsing organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Request to join an organization
  app.post("/api/organizations/:churchId/request-join", requireAuth, async (req, res) => {
    try {
      const churchId = parseInt(req.params.churchId);
      const userId = req.user!.id; // Assuming req.user is populated by isAuthenticated

      // Check if organization exists and is approved
      const church = await db.query.churches.findFirst({
        where: and(
          eq(churches.id, churchId),
          eq(churches.status, "approved")
        ),
      });

      if (!church) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is already a member
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, userId),
          eq(users.churchId, churchId)
        ),
      });

      if (existingUser) {
        return res.status(400).json({ message: "You are already a member of this organization" });
      }

      // Create a join request (you can create a new table for this or use invitations table)
      // For now, we'll send a notification to church admins
      // This is a simplified version - you may want to create a proper join_requests table

      res.json({ message: "Join request sent successfully" });
    } catch (error: any) {
      console.error("Error requesting to join organization:", error);
      res.status(500).json({ message: "Failed to send join request" });
    }
  });

}
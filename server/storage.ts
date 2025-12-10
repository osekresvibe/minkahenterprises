import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  users,
  churches,
  posts,
  events,
  eventRsvps,
  checkIns,
  messageChannels,
  messages,
  directMessages,
  invitations,
  ministryTeams,
  teamMembers,
  mediaFiles,
  activityLogs,
  type User,
  type Church,
  type InsertChurch,
  type UpdateChurch,
  type Post,
  type InsertPost,
  type Event,
  type InsertEvent,
  type EventRsvp,
  type CheckIn,
  type InsertCheckIn,
  type MessageChannel,
  type InsertMessageChannel,
  type Message,
  type InsertMessage,
  type DirectMessage,
  type InsertDirectMessage,
  type Invitation,
  type InsertInvitation,
  type MinistryTeam,
  type InsertMinistryTeam,
  type TeamMember,
  type InsertTeamMember,
  type MediaFile,
  type InsertMediaFile,
  type ActivityLog,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(data: { id: string; email?: string; firstName?: string; lastName?: string; profileImageUrl?: string }): Promise<User>;
  updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    bio?: string;
  }): Promise<void>;
  getUsersByChurch(churchId: string): Promise<User[]>;
  updateUserRole(userId: string, role: string, churchId?: string | null): Promise<void>;

  // Church operations
  createChurch(church: InsertChurch): Promise<Church>;
  getChurch(id: string): Promise<Church | undefined>;
  getAllChurches(): Promise<Church[]>;
  updateChurch(id: string, data: UpdateChurch): Promise<void>;
  updateChurchStatus(id: string, status: string): Promise<void>;

  // Post operations
  getPosts(churchId: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  getTruthPostsByUser(userId: string): Promise<Post[]>;
  getTruthPost(postId: string): Promise<Post | undefined>;
  discoverTruthPosts(location?: string): Promise<Post[]>;
  createPost(post: InsertPost & { churchId: string; authorId: string }): Promise<Post>;

  // Event operations
  getEvents(churchId: string): Promise<Event[]>;
  createEvent(event: InsertEvent & { churchId: string; creatorId: string }): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;

  // RSVP operations
  upsertRsvp(rsvp: InsertEventRsvp & { eventId: string; userId: string }): Promise<EventRsvp>;
  getRsvpsByUser(userId: string): Promise<EventRsvp[]>;
  getRsvpsByEvent(eventId: string): Promise<EventRsvp[]>;

  // Check-in operations
  createCheckIn(checkIn: InsertCheckIn & { userId: string; churchId: string; checkInTime: Date }): Promise<CheckIn>;
  getCheckInsByUser(userId: string): Promise<CheckIn[]>;
  getCheckInsByChurch(churchId: string, limit?: number): Promise<CheckIn[]>;

  // Message channel operations
  getChannels(churchId: string): Promise<MessageChannel[]>;
  createChannel(channel: InsertMessageChannel & { churchId: string; createdBy: string }): Promise<MessageChannel>;

  // Message operations
  getMessages(channelId: string): Promise<Message[]>;
  createMessage(message: InsertMessage & { channelId: string; userId: string }): Promise<Message>;

  // Direct Message operations
  getDirectMessages(churchId: string, userId: string, otherUserId?: string): Promise<DirectMessage[]>;
  createDirectMessage(message: InsertDirectMessage & { senderId: string; recipientId: string; churchId: string }): Promise<DirectMessage>;
  getConversationPartners(churchId: string, userId: string): Promise<User[]>;

  // Invitation operations
  createInvitation(invitation: InsertInvitation & { churchId: string; invitedBy: string; token: string; expiresAt: Date }): Promise<Invitation>;
  getInvitationsByChurch(churchId: string): Promise<Invitation[]>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  updateInvitationStatus(token: string, status: string): Promise<void>;
  deleteInvitation(id: string): Promise<void>;

  // Ministry Team operations
  getMinistryTeams(churchId: string): Promise<MinistryTeam[]>;
  getMinistryTeamsWithMembers(churchId: string): Promise<(MinistryTeam & { members: (TeamMember & { user: User })[] })[]>;
  getMinistryTeam(id: string): Promise<MinistryTeam | undefined>;
  createMinistryTeam(team: InsertMinistryTeam & { churchId: string }): Promise<MinistryTeam>;
  updateMinistryTeam(id: string, data: Partial<InsertMinistryTeam>): Promise<void>;
  deleteMinistryTeam(id: string): Promise<void>;

  // Team Member operations
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  getTeamMembersWithUserInfo(teamId: string): Promise<(TeamMember & { user: User })[]>;
  getUserTeams(userId: string): Promise<(TeamMember & { team: MinistryTeam })[]>;
  addTeamMember(member: InsertTeamMember & { teamId: string }): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<void>;

  // Media File operations
  getMediaFiles(churchId: string, filters?: { mediaType?: string; category?: string; limit?: number }): Promise<MediaFile[]>;
  getMediaFile(id: string): Promise<MediaFile | undefined>;
  createMediaFile(file: InsertMediaFile & { churchId: string; uploadedBy: string }): Promise<MediaFile>;
  updateMediaFile(id: string, data: Partial<InsertMediaFile>): Promise<void>;
  deleteMediaFile(id: string): Promise<void>;
  getMediaFilesByEntity(entityType: string, entityId: string): Promise<MediaFile[]>;

  // Activity Logs operations
  logActivity(log: {
    churchId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }): Promise<void>;
  getActivityLogs(filters?: {
    churchId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]>;
  getChurchActivityStats(churchId: string): Promise<{
    totalPosts: number;
    totalEvents: number;
    totalMembers: number;
    totalCheckIns: number;
    totalInvitations: number;
    recentActivity: ActivityLog[];
  }>;
  getPlatformStats(): Promise<{
    totalChurches: number;
    totalUsers: number;
    totalPosts: number;
    totalEvents: number;
    totalCheckIns: number;
    churchesByStatus: { status: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User> {
    // First check if user exists by ID (Firebase UID)
    const existingById = await db.select().from(users).where(eq(users.id, userData.id));
    if (existingById.length > 0) {
      // Update existing user
      const [updated] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName || existingById[0].firstName,
          lastName: userData.lastName || existingById[0].lastName,
          profileImageUrl: userData.profileImageUrl || existingById[0].profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updated;
    }

    // Check if user exists by email (from a previous auth system)
    const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email));
    if (existingByEmail.length > 0) {
      // User exists with this email - update their info but keep the existing ID
      // (can't change ID due to foreign key constraints)
      const [updated] = await db
        .update(users)
        .set({
          firstName: userData.firstName || existingByEmail[0].firstName,
          lastName: userData.lastName || existingByEmail[0].lastName,
          profileImageUrl: userData.profileImageUrl || existingByEmail[0].profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.email, userData.email))
        .returning();
      return updated;
    }

    // Create new user with Firebase UID as ID
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        role: "member",
      })
      .returning();

    return user;
  }

  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    bio?: string;
  }): Promise<void> {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  async getUsersByChurch(churchId: string): Promise<User[]> {
    const rows = await db.select().from(users).where(eq(users.churchId, churchId));
    return rows;
  }

  async updateUserRole(userId: string, role: string, churchId?: string | null): Promise<void> {
    await db
      .update(users)
      .set({ role, churchId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Church operations
  async createChurch(church: InsertChurch & { adminUserId: string }): Promise<Church> {
    const record: typeof churches.$inferInsert = {
      name: church.name,
      description: church.description,
      address: church.address,
      phone: church.phone,
      email: church.email,
      website: church.website,
      logoUrl: church.logoUrl,
      bannerUrl: church.bannerUrl,
      status: church.status,
      adminUserId: church.adminUserId,
    };
    const [newChurch] = await db.insert(churches).values(record).returning();
    return newChurch;
  }

  async getChurch(id: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.id, id));
    return church;
  }

  async getAllChurches(): Promise<Church[]> {
    const rows = await db.select().from(churches).orderBy(desc(churches.createdAt));
    return rows;
  }

  async updateChurch(id: string, data: UpdateChurch): Promise<void> {
    await db
      .update(churches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(churches.id, id));
  }

  async updateChurchStatus(id: string, status: string): Promise<void> {
    await db
      .update(churches)
      .set({ status, updatedAt: new Date() })
      .where(eq(churches.id, id));
  }

  // Post operations
  async getPosts(churchId: string): Promise<Post[]> {
    return db.select().from(posts)
      .where(eq(posts.churchId, churchId))
      .orderBy(desc(posts.isPinned), desc(posts.createdAt));
  }

  async getPost(id: string): Promise<Post | undefined> {
    const result = await db.select().from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    return result[0];
  }

  async getTruthPostsByUser(userId: string): Promise<Post[]> {
    return db.select().from(posts)
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getTruthPost(postId: string): Promise<Post | undefined> {
    const result = await db.select().from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return result[0];
  }

  async discoverTruthPosts(location?: string): Promise<Post[]> {
    // For now, return all public posts
    // In production, you'd filter by location or implement a discovery algorithm
    return db.select().from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(50);
  }

  async createPost(post: InsertPost & { churchId: string; authorId: string }): Promise<Post> {
    const record: typeof posts.$inferInsert = {
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      isPinned: post.isPinned,
      churchId: post.churchId,
      authorId: post.authorId,
    };
    const [newPost] = await db.insert(posts).values(record).returning();
    return newPost;
  }

  // Event operations
  async getEvents(churchId: string): Promise<Event[]> {
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.churchId, churchId))
      .orderBy(desc(events.startTime));
    return rows;
  }

  async createEvent(event: InsertEvent & { churchId: string; creatorId: string }): Promise<Event> {
    const record: typeof events.$inferInsert = {
      title: event.title,
      description: event.description,
      location: event.location,
      imageUrl: event.imageUrl,
      startTime: event.startTime,
      endTime: event.endTime,
      maxAttendees: event.maxAttendees,
      churchId: event.churchId,
      creatorId: event.creatorId,
    };
    const [newEvent] = await db.insert(events).values(record).returning();
    return newEvent;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  // RSVP operations
  async upsertRsvp(rsvp: InsertEventRsvp & { eventId: string; userId: string }): Promise<EventRsvp> {
    const record: typeof eventRsvps.$inferInsert = {
      status: rsvp.status,
      eventId: rsvp.eventId,
      userId: rsvp.userId,
    };
    const [result] = await db
      .insert(eventRsvps)
      .values(record)
      .onConflictDoUpdate({
        target: [eventRsvps.eventId, eventRsvps.userId],
        set: { status: rsvp.status, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getRsvpsByUser(userId: string): Promise<EventRsvp[]> {
    const rows = await db.select().from(eventRsvps).where(eq(eventRsvps.userId, userId));
    return rows;
  }

  async getRsvpsByEvent(eventId: string): Promise<EventRsvp[]> {
    const rows = await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
    return rows;
  }

  // Check-in operations
  async createCheckIn(checkIn: InsertCheckIn & { userId: string; churchId: string; checkInTime: Date }): Promise<CheckIn> {
    const record: typeof checkIns.$inferInsert = {
      notes: checkIn.notes,
      userId: checkIn.userId,
      churchId: checkIn.churchId,
      checkInTime: checkIn.checkInTime,
    };
    const [newCheckIn] = await db.insert(checkIns).values(record).returning();
    return newCheckIn;
  }

  async getCheckInsByUser(userId: string): Promise<CheckIn[]> {
    const rows = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.checkInTime));
    return rows;
  }

  async getCheckInsByChurch(churchId: string, limit?: number): Promise<CheckIn[]> {
    const query = db
      .select()
      .from(checkIns)
      .where(eq(checkIns.churchId, churchId))
      .orderBy(desc(checkIns.checkInTime));

    return limit ? await query.limit(limit) : await query;
  }

  // Message channel operations
  async getChannels(churchId: string): Promise<MessageChannel[]> {
    const rows = await db
      .select()
      .from(messageChannels)
      .where(eq(messageChannels.churchId, churchId))
      .orderBy(desc(messageChannels.createdAt));
    return rows;
  }

  async createChannel(channel: InsertMessageChannel & { churchId: string; createdBy: string }): Promise<MessageChannel> {
    const record: typeof messageChannels.$inferInsert = {
      name: channel.name,
      description: channel.description,
      churchId: channel.churchId,
      createdBy: channel.createdBy,
    };
    const [newChannel] = await db.insert(messageChannels).values(record).returning();
    return newChannel;
  }

  // Message operations
  async getMessages(channelId: string): Promise<Message[]> {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(messages.createdAt);
    return rows;
  }

  async createMessage(message: InsertMessage & { channelId: string; userId: string }): Promise<Message> {
    const record: typeof messages.$inferInsert = {
      content: message.content,
      channelId: message.channelId,
      userId: message.userId,
    };
    const [newMessage] = await db.insert(messages).values(record).returning();
    return newMessage;
  }

  // Direct Message operations
  async getDirectMessages(churchId: string, userId: string, otherUserId?: string): Promise<DirectMessage[]> {
    let query = db
      .select()
      .from(directMessages)
      .where(eq(directMessages.churchId, churchId));

    if (otherUserId) {
      query = query.where(
        sql`((${directMessages.senderId} = ${userId} AND ${directMessages.recipientId} = ${otherUserId}) OR (${directMessages.senderId} = ${otherUserId} AND ${directMessages.recipientId} = ${userId}))`
      );
    } else {
      query = query.where(
        sql`(${directMessages.senderId} = ${userId} OR ${directMessages.recipientId} = ${userId})`
      );
    }

    const rows = await query.orderBy(directMessages.createdAt);
    return rows;
  }

  async createDirectMessage(message: InsertDirectMessage & { senderId: string; recipientId: string; churchId: string }): Promise<DirectMessage> {
    const record: typeof directMessages.$inferInsert = {
      content: message.content,
      senderId: message.senderId,
      recipientId: message.recipientId,
      churchId: message.churchId,
    };
    const [newMessage] = await db.insert(directMessages).values(record).returning();
    return newMessage;
  }

  async getConversationPartners(churchId: string, userId: string): Promise<User[]> {
    // Get all unique users this user has messaged (either sent or received)
    const sentTo = await db.selectDistinct({ id: directMessages.recipientId })
      .from(directMessages)
      .where(and(eq(directMessages.churchId, churchId), eq(directMessages.senderId, userId)));

    const receivedFrom = await db.selectDistinct({ id: directMessages.senderId })
      .from(directMessages)
      .where(and(eq(directMessages.churchId, churchId), eq(directMessages.recipientId, userId)));

    const partnerIds = new Set([
      ...sentTo.map(r => r.id),
      ...receivedFrom.map(r => r.id),
    ]);

    if (partnerIds.size === 0) return [];

    const partners = await db.select().from(users).where(inArray(users.id, Array.from(partnerIds)));
    return partners;
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation & { churchId: string; invitedBy: string; token: string; expiresAt: Date }): Promise<Invitation> {
    const record: typeof invitations.$inferInsert = {
      email: invitation.email,
      role: invitation.role,
      churchId: invitation.churchId,
      invitedBy: invitation.invitedBy,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      status: "pending",
    };
    const [newInvitation] = await db.insert(invitations).values(record).returning();
    return newInvitation;
  }

  async getInvitationsByChurch(churchId: string): Promise<Invitation[]> {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.churchId, churchId))
      .orderBy(desc(invitations.createdAt));
    return rows;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    return invitation;
  }

  async updateInvitationStatus(token: string, status: string): Promise<void> {
    await db
      .update(invitations)
      .set({ status, updatedAt: new Date() })
      .where(eq(invitations.token, token));
  }

  async deleteInvitation(id: string): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }

  // Ministry Team operations
  async getMinistryTeams(churchId: string): Promise<MinistryTeam[]> {
    const rows = await db
      .select()
      .from(ministryTeams)
      .where(eq(ministryTeams.churchId, churchId))
      .orderBy(ministryTeams.name);
    return rows;
  }

  async getMinistryTeamsWithMembers(churchId: string): Promise<(MinistryTeam & { members: (TeamMember & { user: User })[] })[]> {
    // Fetch all teams for the church
    const teams = await this.getMinistryTeams(churchId);

    if (teams.length === 0) {
      return [];
    }

    const teamIds = teams.map(t => t.id);

    // Fetch all team members with user info for these teams
    const allMembers = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(inArray(teamMembers.teamId, teamIds))
      .orderBy(teamMembers.role, teamMembers.joinedAt);

    // Group members by team
    const membersByTeam = new Map<string, (TeamMember & { user: User })[]>();
    for (const member of allMembers) {
      const existing = membersByTeam.get(member.teamId) || [];
      existing.push(member);
      membersByTeam.set(member.teamId, existing);
    }

    // Combine teams with their members
    return teams.map(team => ({
      ...team,
      members: membersByTeam.get(team.id) || [],
    }));
  }

  async getMinistryTeam(id: string): Promise<MinistryTeam | undefined> {
    const [team] = await db.select().from(ministryTeams).where(eq(ministryTeams.id, id));
    return team;
  }

  async createMinistryTeam(team: InsertMinistryTeam & { churchId: string }): Promise<MinistryTeam> {
    const record: typeof ministryTeams.$inferInsert = {
      name: team.name,
      description: team.description,
      churchId: team.churchId,
    };
    const [newTeam] = await db.insert(ministryTeams).values(record).returning();
    return newTeam;
  }

  async updateMinistryTeam(id: string, data: Partial<InsertMinistryTeam>): Promise<void> {
    await db
      .update(ministryTeams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ministryTeams.id, id));
  }

  async deleteMinistryTeam(id: string): Promise<void> {
    await db.delete(ministryTeams).where(eq(ministryTeams.id, id));
  }

  // Team Member operations
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.joinedAt);
    return rows;
  }

  async getTeamMembersWithUserInfo(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.role, teamMembers.joinedAt);
    return rows;
  }

  async getUserTeams(userId: string): Promise<(TeamMember & { team: MinistryTeam })[]> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        team: ministryTeams,
      })
      .from(teamMembers)
      .innerJoin(ministryTeams, eq(teamMembers.teamId, ministryTeams.id))
      .where(eq(teamMembers.userId, userId))
      .orderBy(ministryTeams.name);
    return rows;
  }

  async addTeamMember(member: InsertTeamMember & { teamId: string }): Promise<TeamMember> {
    const record: typeof teamMembers.$inferInsert = {
      teamId: member.teamId,
      userId: member.userId,
      role: member.role,
    };
    const [newMember] = await db.insert(teamMembers).values(record).returning();
    return newMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<void> {
    await db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  // Media File operations
  async getMediaFiles(churchId: string, filters?: { mediaType?: string; category?: string; limit?: number }): Promise<MediaFile[]> {
    let query = db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.churchId, churchId))
      .orderBy(desc(mediaFiles.createdAt));

    if (filters?.mediaType) {
      query = query.where(and(eq(mediaFiles.churchId, churchId), eq(mediaFiles.mediaType, filters.mediaType)));
    }

    if (filters?.category) {
      query = query.where(and(eq(mediaFiles.churchId, churchId), eq(mediaFiles.category, filters.category)));
    }

    if (filters?.limit) {
      return await query.limit(filters.limit);
    }

    return await query;
  }

  async getMediaFile(id: string): Promise<MediaFile | undefined> {
    const [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id));
    return file;
  }

  async createMediaFile(file: InsertMediaFile & { churchId: string; uploadedBy: string }): Promise<MediaFile> {
    const record: typeof mediaFiles.$inferInsert = {
      churchId: file.churchId,
      uploadedBy: file.uploadedBy,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      thumbnailUrl: file.thumbnailUrl,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      mediaType: file.mediaType,
      category: file.category,
      width: file.width,
      height: file.height,
      duration: file.duration,
      description: file.description,
      tags: file.tags,
      relatedEntityId: file.relatedEntityId,
      relatedEntityType: file.relatedEntityType,
    };
    const [newFile] = await db.insert(mediaFiles).values(record).returning();
    return newFile;
  }

  async updateMediaFile(id: string, data: Partial<InsertMediaFile>): Promise<void> {
    await db
      .update(mediaFiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mediaFiles.id, id));
  }

  async deleteMediaFile(id: string): Promise<void> {
    await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
  }

  async getMediaFilesByEntity(entityType: string, entityId: string): Promise<MediaFile[]> {
    const rows = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.relatedEntityType, entityType), eq(mediaFiles.relatedEntityId, entityId)))
      .orderBy(desc(mediaFiles.createdAt));
    return rows;
  }

  // Activity Logs operations
  async logActivity(log: {
    churchId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        churchId: log.churchId,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getActivityLogs(filters?: {
    churchId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs).$dynamic();

    if (filters?.churchId) {
      query = query.where(eq(activityLogs.churchId, filters.churchId));
    }
    if (filters?.userId) {
      query = query.where(eq(activityLogs.userId, filters.userId));
    }
    if (filters?.action) {
      query = query.where(eq(activityLogs.action, filters.action));
    }

    query = query.orderBy(desc(activityLogs.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getChurchActivityStats(churchId: string): Promise<{
    totalPosts: number;
    totalEvents: number;
    totalMembers: number;
    totalCheckIns: number;
    totalInvitations: number;
    recentActivity: ActivityLog[];
  }> {
    const [postsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.churchId, churchId));

    const [eventsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.churchId, churchId));

    const [membersCount] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.churchId, churchId));

    const [checkInsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(checkIns)
      .where(eq(checkIns.churchId, churchId));

    const [invitationsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(invitations)
      .where(eq(invitations.churchId, churchId));

    const recentActivity = await this.getActivityLogs({ churchId, limit: 10 });

    return {
      totalPosts: postsCount.count,
      totalEvents: eventsCount.count,
      totalMembers: membersCount.count,
      totalCheckIns: checkInsCount.count,
      totalInvitations: invitationsCount.count,
      recentActivity,
    };
  }

  async getPlatformStats(): Promise<{
    totalChurches: number;
    totalUsers: number;
    totalPosts: number;
    totalEvents: number;
    totalCheckIns: number;
    churchesByStatus: { status: string; count: number }[];
  }> {
    const [churchesCount] = await db.select({ count: sql<number>`count(*)` })
      .from(churches);

    const [usersCount] = await db.select({ count: sql<number>`count(*)` })
      .from(users);

    const [postsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(posts);

    const [eventsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(events);

    const [checkInsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(checkIns);

    const churchesByStatus = await db.select({
      status: churches.status,
      count: sql<number>`count(*)`,
    })
      .from(churches)
      .groupBy(churches.status);

    return {
      totalChurches: churchesCount.count,
      totalUsers: usersCount.count,
      totalPosts: postsCount.count,
      totalEvents: eventsCount.count,
      totalCheckIns: checkInsCount.count,
      churchesByStatus,
    };
  }
}

export const storage = new DatabaseStorage();
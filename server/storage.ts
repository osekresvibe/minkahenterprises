import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  churches,
  posts,
  events,
  eventRsvps,
  checkIns,
  messageChannels,
  messages,
  invitations,
  type User,
  type Church,
  type InsertChurch,
  type UpdateChurch,
  type Post,
  type InsertPost,
  type Event,
  type InsertEvent,
  type EventRsvp,
  type InsertEventRsvp,
  type CheckIn,
  type InsertCheckIn,
  type MessageChannel,
  type InsertMessageChannel,
  type Message,
  type InsertMessage,
  type Invitation,
  type InsertInvitation,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(data: { id: string; email?: string; firstName?: string; lastName?: string; profileImageUrl?: string }): Promise<User>;
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
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation & { churchId: string; invitedBy: string; token: string; expiresAt: Date }): Promise<Invitation>;
  getInvitationsByChurch(churchId: string): Promise<Invitation[]>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  updateInvitationStatus(token: string, status: string): Promise<void>;
  deleteInvitation(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(data: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User> {
    const insertData: typeof users.$inferInsert = {
      id: data.id,
      email: data.email ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      profileImageUrl: data.profileImageUrl ?? null,
      role: "member",
      churchId: null,
    };
    const [user]: User[] = await db
      .insert(users)
      .values(insertData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email ?? null,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          profileImageUrl: data.profileImageUrl ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.churchId, churchId))
      .orderBy(desc(posts.isPinned), desc(posts.createdAt));
    return rows;
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
}

export const storage = new DatabaseStorage();

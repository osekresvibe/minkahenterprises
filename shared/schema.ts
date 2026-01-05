// Complete schema for MinkahEnterprises Church Community Platform
// Referenced from javascript_log_in_with_replit and javascript_database blueprints

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "church_admin", "member"]);
export const churchStatusEnum = pgEnum("church_status", ["pending", "approved", "rejected"]);
export const organizationTypeEnum = pgEnum("organization_type", ["church", "nonprofit", "business", "club", "community", "other"]);
export const eventRsvpStatusEnum = pgEnum("event_rsvp_status", ["going", "maybe", "not_going"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "declined", "expired"]);
export const ministryTeamRoleEnum = pgEnum("ministry_team_role", ["leader", "co_leader", "member", "volunteer"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const mediaCategoryEnum = pgEnum("media_category", ["event", "post", "profile", "general", "ministry"]);

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Churches table - multi-tenant core entity (supports churches and other organizations)
// Defined first to avoid circular reference issues
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  logoUrl: varchar("logo_url"),
  bannerUrl: varchar("banner_url"),
  organizationType: organizationTypeEnum("organization_type").notNull().default("church"),
  status: churchStatusEnum("status").notNull().default("pending"),
  adminUserId: varchar("admin_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("churches_status_idx").on(table.status),
  index("churches_admin_idx").on(table.adminUserId),
  index("churches_type_idx").on(table.organizationType),
]);

// Users table - extended for Replit Auth with multi-tenant role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  bio: text("bio"),
  dateOfBirth: varchar("date_of_birth"),
  occupation: varchar("occupation"),
  education: varchar("education"),
  maritalStatus: varchar("marital_status"),
  familyInfo: text("family_info"),
  hobbies: text("hobbies"),
  servingAreas: text("serving_areas"),
  baptismDate: varchar("baptism_date"),
  memberSince: varchar("member_since"),
  socialMediaLinks: text("social_media_links"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  role: userRoleEnum("role").notNull().default("member"),
  churchId: varchar("church_id").references(() => churches.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_church_idx").on(table.churchId),
  index("users_role_idx").on(table.role),
]);

// Invitations table - for inviting new members to churches
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("invitations_church_idx").on(table.churchId),
  index("invitations_email_idx").on(table.email),
  index("invitations_status_idx").on(table.status),
  index("invitations_token_idx").on(table.token),
]);

// Posts/Announcements table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("posts_church_idx").on(table.churchId),
  index("posts_created_idx").on(table.createdAt),
  index("posts_pinned_idx").on(table.isPinned),
]);

// Standalone Posts table - for users without organization
export const standalonePosts = pgTable("standalone_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("standalone_posts_author_idx").on(table.authorId),
  index("standalone_posts_created_idx").on(table.createdAt),
]);

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  imageUrl: varchar("image_url"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  maxAttendees: integer("max_attendees"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("events_church_idx").on(table.churchId),
  index("events_start_time_idx").on(table.startTime),
]);

// Event RSVPs table
export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: eventRsvpStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("event_rsvps_unique_idx").on(table.eventId, table.userId),
  index("event_rsvps_event_idx").on(table.eventId),
  index("event_rsvps_user_idx").on(table.userId),
]);

// Check-ins table - attendance tracking
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull(),
  userId: varchar("user_id").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("check_ins_church_idx").on(table.churchId),
  index("check_ins_user_idx").on(table.userId),
  index("check_ins_time_idx").on(table.checkInTime),
]);

// Message channels table
export const messageChannels = pgTable("message_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("channels_church_idx").on(table.churchId),
]);

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => messageChannels.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("messages_channel_idx").on(table.channelId),
  index("messages_created_idx").on(table.createdAt),
]);

// Direct Messages table - for 1-on-1 messaging between members and admins
export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("direct_messages_church_idx").on(table.churchId),
  index("direct_messages_sender_idx").on(table.senderId),
  index("direct_messages_recipient_idx").on(table.recipientId),
]);

// Ministry Teams table - for organizing church members into ministry groups
export const ministryTeams = pgTable("ministry_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ministry_teams_church_idx").on(table.churchId),
]);

// Media Files table - for photo and video uploads
export const mediaFiles = pgTable("media_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  category: mediaCategoryEnum("category").notNull().default("general"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // for videos, in seconds
  description: text("description"),
  tags: text("tags"), // comma-separated
  relatedEntityId: varchar("related_entity_id"), // ID of related event, post, etc.
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'event', 'post', 'ministry_team', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("media_files_church_idx").on(table.churchId),
  index("media_files_uploader_idx").on(table.uploadedBy),
  index("media_files_type_idx").on(table.mediaType),
  index("media_files_category_idx").on(table.category),
]);

// Activity Logs table - for super admin monitoring
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").references(() => churches.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // 'post_created', 'event_created', 'member_invited', etc.
  entityType: varchar("entity_type", { length: 50 }), // 'post', 'event', 'invitation', etc.
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"), // Additional context about the action
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_logs_church_idx").on(table.churchId),
  index("activity_logs_user_idx").on(table.userId),
  index("activity_logs_action_idx").on(table.action),
  index("activity_logs_created_idx").on(table.createdAt),
]);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  church: one(churches, {
    fields: [activityLogs.churchId],
    references: [churches.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Team Members table - junction table for ministry team assignments
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => ministryTeams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: ministryTeamRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  index("team_members_team_idx").on(table.teamId),
  index("team_members_user_idx").on(table.userId),
]);

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  church: one(churches, {
    fields: [users.churchId],
    references: [churches.id],
  }),
  posts: many(posts),
  events: many(events),
  eventRsvps: many(eventRsvps),
  checkIns: many(checkIns),
  messages: many(messages),
}));

export const churchesRelations = relations(churches, ({ one, many }) => ({
  admin: one(users, {
    fields: [churches.adminUserId],
    references: [users.id],
  }),
  members: many(users),
  posts: many(posts),
  events: many(events),
  checkIns: many(checkIns),
  messageChannels: many(messageChannels),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  church: one(churches, {
    fields: [posts.churchId],
    references: [churches.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export const standalonePostsRelations = relations(standalonePosts, ({ one }) => ({
  author: one(users, {
    fields: [standalonePosts.authorId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  church: one(churches, {
    fields: [events.churchId],
    references: [churches.id],
  }),
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  church: one(churches, {
    fields: [checkIns.churchId],
    references: [churches.id],
  }),
  user: one(users, {
    fields: [checkIns.userId],
    references: [users.id],
  }),
}));

export const messageChannelsRelations = relations(messageChannels, ({ one, many }) => ({
  church: one(churches, {
    fields: [messageChannels.churchId],
    references: [churches.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  channel: one(messageChannels, {
    fields: [messages.channelId],
    references: [messageChannels.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  church: one(churches, {
    fields: [directMessages.churchId],
    references: [churches.id],
  }),
}));

export const ministryTeamsRelations = relations(ministryTeams, ({ one, many }) => ({
  church: one(churches, {
    fields: [ministryTeams.churchId],
    references: [churches.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(ministryTeams, {
    fields: [teamMembers.teamId],
    references: [ministryTeams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  church: one(churches, {
    fields: [mediaFiles.churchId],
    references: [churches.id],
  }),
  uploader: one(users, {
    fields: [mediaFiles.uploadedBy],
    references: [users.id],
  }),
}));

// Insert schemas for validation
export const upsertUserSchema = createInsertSchema(users).extend({
  email: z.string().email().nullable().optional(),
});

export const insertChurchSchema = createInsertSchema(churches).pick({
  name: true,
  description: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  logoUrl: true,
  bannerUrl: true,
  organizationType: true,
});

export const updateChurchSchema = insertChurchSchema.partial().extend({
  name: z.string().min(1, "Church name is required"),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  imageUrl: true,
  videoUrl: true,
  isPinned: true,
});

export const insertStandalonePostSchema = createInsertSchema(standalonePosts).pick({
  title: true,
  content: true,
  imageUrl: true,
  videoUrl: true,
});
export type InsertStandalonePost = z.infer<typeof insertStandalonePostSchema>;
export type StandalonePost = typeof standalonePosts.$inferSelect;

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  location: true,
  imageUrl: true,
  startTime: true,
  endTime: true,
  maxAttendees: true,
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).pick({
  status: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).pick({
  notes: true,
});

export const insertMessageChannelSchema = createInsertSchema(messageChannels).pick({
  name: true,
  description: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).pick({
  content: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  role: true,
}).extend({
  email: z.string().email("Invalid email address"),
});

export const insertMinistryTeamSchema = createInsertSchema(ministryTeams).pick({
  name: true,
  description: true,
}).extend({
  name: z.string().min(1, "Team name is required"),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  userId: true,
  role: true,
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).pick({
  fileName: true,
  fileUrl: true,
  thumbnailUrl: true,
  fileSize: true,
  mimeType: true,
  mediaType: true,
  category: true,
  width: true,
  height: true,
  duration: true,
  description: true,
  tags: true,
  relatedEntityId: true,
  relatedEntityType: true,
}).extend({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().positive("File size must be positive"),
  mimeType: z.string().min(1, "MIME type is required"),
});

// TypeScript types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type UpdateChurch = z.infer<typeof updateChurchSchema>;
export type Church = typeof churches.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;
export type InsertMessageChannel = z.infer<typeof insertMessageChannelSchema>;
export type MessageChannel = typeof messageChannels.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertMinistryTeam = z.infer<typeof insertMinistryTeamSchema>;
export type MinistryTeam = typeof ministryTeams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "church_admin", "member"]);
export const churchStatusEnum = pgEnum("church_status", ["pending", "approved", "rejected"]);
export const eventRsvpStatusEnum = pgEnum("event_rsvp_status", ["going", "maybe", "not_going"]);

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

// Users table - extended for Replit Auth with multi-tenant role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("member"),
  churchId: varchar("church_id").references(() => churches.id, { onDelete: "cascade" }), // null for super_admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_church_idx").on(table.churchId),
  index("users_role_idx").on(table.role),
]);

// Churches table - multi-tenant core entity
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
  status: churchStatusEnum("status").notNull().default("pending"),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("churches_status_idx").on(table.status),
  index("churches_admin_idx").on(table.adminUserId),
]);

// Posts/Announcements table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("posts_church_idx").on(table.churchId),
  index("posts_created_idx").on(table.createdAt),
  index("posts_pinned_idx").on(table.isPinned),
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
  index("event_rsvps_event_idx").on(table.eventId),
  index("event_rsvps_user_idx").on(table.userId),
]);

// Check-ins table - attendance tracking
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull(),
  userId: varchar("user_id").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
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
});

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  imageUrl: true,
  isPinned: true,
});

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

// TypeScript types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
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

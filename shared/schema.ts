import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Room Categories
export const roomCategories = pgTable("room_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalUnits: integer("total_units").notNull(),
  maxOccupancy: integer("max_occupancy").notNull().default(2),
  bedConfiguration: varchar("bed_configuration", { length: 100 }).notNull().default("1 Double Bed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users (including regular users and trustees)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isTrustee: boolean("is_trustee").default(false),
  trusteeAutoBookDates: varchar("trustee_auto_book_dates", { length: 100 }), // e.g., "1,15"
  trusteeRoomCategoryId: integer("trustee_room_category_id").references(() => roomCategories.id),
  trusteeStatus: varchar("trustee_status", { length: 20 }).default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

// Room Bookings
export const roomBookings = pgTable("room_bookings", {
  id: serial("id").primaryKey(),
  bookingId: varchar("booking_id", { length: 50 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roomCategoryId: integer("room_category_id").references(() => roomCategories.id).notNull(),
  checkinDate: timestamp("checkin_date").notNull(),
  checkoutDate: timestamp("checkout_date").notNull(),
  guests: integer("guests").notNull().default(1),
  status: varchar("status", { length: 50 }).notNull().default("confirmed"), // confirmed, cancelled, checked_in, checked_out
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("unpaid"), // paid, unpaid, pending
  paymentMethod: varchar("payment_method", { length: 50 }), // online, checkin
  isAutoBooking: boolean("is_auto_booking").default(false),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  roomNumber: varchar("room_number", { length: 20 }),
  roomsBooked: integer("rooms_booked").default(1),
  paymentReference: varchar("payment_reference", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ID Proofs
export const idProofs = pgTable("id_proofs", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => roomBookings.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Admin Users
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trustee Auto Bookings
export const trusteeAutoBookings = pgTable("trustee_auto_bookings", {
  id: serial("id").primaryKey(),
  trusteeId: integer("trustee_id").references(() => users.id).notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  optOutStatus: varchar("opt_out_status", { length: 50 }).default("pending"), // pending, confirmed, opted_out
  bookingId: integer("booking_id").references(() => roomBookings.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const roomCategoriesRelations = relations(roomCategories, ({ many }) => ({
  bookings: many(roomBookings),
  trustees: many(users),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(roomBookings),
  trusteeAutoBookings: many(trusteeAutoBookings),
  trusteeRoomCategory: one(roomCategories, {
    fields: [users.trusteeRoomCategoryId],
    references: [roomCategories.id],
  }),
}));

export const roomBookingsRelations = relations(roomBookings, ({ one, many }) => ({
  user: one(users, {
    fields: [roomBookings.userId],
    references: [users.id],
  }),
  roomCategory: one(roomCategories, {
    fields: [roomBookings.roomCategoryId],
    references: [roomCategories.id],
  }),
  idProofs: many(idProofs),
  trusteeAutoBooking: one(trusteeAutoBookings, {
    fields: [roomBookings.id],
    references: [trusteeAutoBookings.bookingId],
  }),
}));

export const idProofsRelations = relations(idProofs, ({ one }) => ({
  booking: one(roomBookings, {
    fields: [idProofs.bookingId],
    references: [roomBookings.id],
  }),
}));

export const trusteeAutoBookingsRelations = relations(trusteeAutoBookings, ({ one }) => ({
  trustee: one(users, {
    fields: [trusteeAutoBookings.trusteeId],
    references: [users.id],
  }),
  booking: one(roomBookings, {
    fields: [trusteeAutoBookings.bookingId],
    references: [roomBookings.id],
  }),
}));

// Insert schemas
export const insertRoomCategorySchema = createInsertSchema(roomCategories).omit({
  id: true,
  createdAt: true,
}).extend({
  maxOccupancy: z.number().min(1).max(10),
  bedConfiguration: z.string().min(1).max(100),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRoomBookingSchema = createInsertSchema(roomBookings).omit({
  id: true,
  createdAt: true,
  bookingId: true,
});

export const insertIdProofSchema = createInsertSchema(idProofs).omit({
  id: true,
  uploadedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertTrusteeAutoBookingSchema = createInsertSchema(trusteeAutoBookings).omit({
  id: true,
  createdAt: true,
});

// Types
export type RoomCategory = typeof roomCategories.$inferSelect;
export type InsertRoomCategory = z.infer<typeof insertRoomCategorySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RoomBooking = typeof roomBookings.$inferSelect;
export type InsertRoomBooking = z.infer<typeof insertRoomBookingSchema>;

export type IdProof = typeof idProofs.$inferSelect;
export type InsertIdProof = z.infer<typeof insertIdProofSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type TrusteeAutoBooking = typeof trusteeAutoBookings.$inferSelect;
export type InsertTrusteeAutoBooking = z.infer<typeof insertTrusteeAutoBookingSchema>;

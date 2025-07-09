import {
  roomCategories,
  users,
  roomBookings,
  idProofs,
  adminUsers,
  trusteeAutoBookings,
  type RoomCategory,
  type User,
  type RoomBooking,
  type IdProof,
  type AdminUser,
  type TrusteeAutoBooking,
  type InsertRoomCategory,
  type InsertUser,
  type InsertRoomBooking,
  type InsertIdProof,
  type InsertAdminUser,
  type InsertTrusteeAutoBooking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Room Categories
  getRoomCategories(): Promise<RoomCategory[]>;
  getRoomCategory(id: number): Promise<RoomCategory | undefined>;
  createRoomCategory(category: InsertRoomCategory): Promise<RoomCategory>;
  updateRoomCategory(id: number, category: Partial<InsertRoomCategory>): Promise<RoomCategory>;
  deleteRoomCategory(id: number): Promise<void>;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getTrustees(): Promise<User[]>;

  // Room Bookings
  getRoomBookings(): Promise<RoomBooking[]>;
  getRoomBooking(id: number): Promise<RoomBooking | undefined>;
  getRoomBookingByBookingId(bookingId: string): Promise<RoomBooking | undefined>;
  createRoomBooking(booking: InsertRoomBooking & { bookingId: string }): Promise<RoomBooking>;
  updateRoomBooking(id: number, booking: Partial<RoomBooking>): Promise<RoomBooking>;
  getBookingsByDateRange(startDate: Date, endDate: Date): Promise<RoomBooking[]>;
  getTodaysCheckins(): Promise<RoomBooking[]>;
  getTodaysCheckouts(): Promise<RoomBooking[]>;
  getRecentBookings(limit: number): Promise<RoomBooking[]>;

  // ID Proofs
  getIdProofsByBookingId(bookingId: number): Promise<IdProof[]>;
  createIdProof(idProof: InsertIdProof): Promise<IdProof>;

  // Admin Users
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;

  // Trustee Auto Bookings
  getTrusteeAutoBookings(): Promise<TrusteeAutoBooking[]>;
  createTrusteeAutoBooking(autoBooking: InsertTrusteeAutoBooking): Promise<TrusteeAutoBooking>;
  updateTrusteeAutoBooking(id: number, autoBooking: Partial<TrusteeAutoBooking>): Promise<TrusteeAutoBooking>;
  getTrusteeAutoBookingsByMonth(year: number, month: number): Promise<TrusteeAutoBooking[]>;
}

export class DatabaseStorage implements IStorage {
  // Room Categories
  async getRoomCategories(): Promise<RoomCategory[]> {
    return await db.select().from(roomCategories).orderBy(asc(roomCategories.name));
  }

  async getRoomCategory(id: number): Promise<RoomCategory | undefined> {
    const [category] = await db.select().from(roomCategories).where(eq(roomCategories.id, id));
    return category;
  }

  async createRoomCategory(category: InsertRoomCategory): Promise<RoomCategory> {
    const [newCategory] = await db.insert(roomCategories).values(category).returning();
    return newCategory;
  }

  async updateRoomCategory(id: number, category: Partial<InsertRoomCategory>): Promise<RoomCategory> {
    const [updatedCategory] = await db
      .update(roomCategories)
      .set(category)
      .where(eq(roomCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteRoomCategory(id: number): Promise<void> {
    await db.delete(roomCategories).where(eq(roomCategories.id, id));
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async getTrustees(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isTrustee, true)).orderBy(asc(users.name));
  }

  // Room Bookings
  async getRoomBookings(): Promise<RoomBooking[]> {
    return await db.select().from(roomBookings).orderBy(desc(roomBookings.createdAt));
  }

  async getRoomBooking(id: number): Promise<RoomBooking | undefined> {
    const [booking] = await db.select().from(roomBookings).where(eq(roomBookings.id, id));
    return booking;
  }

  async getRoomBookingByBookingId(bookingId: string): Promise<RoomBooking | undefined> {
    const [booking] = await db.select().from(roomBookings).where(eq(roomBookings.bookingId, bookingId));
    return booking;
  }

  async createRoomBooking(booking: InsertRoomBooking & { bookingId: string }): Promise<RoomBooking> {
    const [newBooking] = await db.insert(roomBookings).values(booking).returning();
    return newBooking;
  }

  async updateRoomBooking(id: number, booking: Partial<RoomBooking>): Promise<RoomBooking> {
    const [updatedBooking] = await db
      .update(roomBookings)
      .set(booking)
      .where(eq(roomBookings.id, id))
      .returning();
    return updatedBooking;
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<RoomBooking[]> {
    return await db
      .select()
      .from(roomBookings)
      .where(
        and(
          gte(roomBookings.checkinDate, startDate),
          lte(roomBookings.checkoutDate, endDate)
        )
      )
      .orderBy(asc(roomBookings.checkinDate));
  }

  async getTodaysCheckins(): Promise<RoomBooking[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(roomBookings)
      .where(
        and(
          gte(roomBookings.checkinDate, today),
          lte(roomBookings.checkinDate, tomorrow),
          eq(roomBookings.status, "confirmed")
        )
      )
      .orderBy(asc(roomBookings.checkinDate));
  }

  async getTodaysCheckouts(): Promise<RoomBooking[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(roomBookings)
      .where(
        and(
          gte(roomBookings.checkoutDate, today),
          lte(roomBookings.checkoutDate, tomorrow),
          eq(roomBookings.status, "checked_in")
        )
      )
      .orderBy(asc(roomBookings.checkoutDate));
  }

  async getRecentBookings(limit: number): Promise<RoomBooking[]> {
    return await db
      .select()
      .from(roomBookings)
      .orderBy(desc(roomBookings.createdAt))
      .limit(limit);
  }

  // ID Proofs
  async getIdProofsByBookingId(bookingId: number): Promise<IdProof[]> {
    return await db.select().from(idProofs).where(eq(idProofs.bookingId, bookingId));
  }

  async createIdProof(idProof: InsertIdProof): Promise<IdProof> {
    const [newIdProof] = await db.insert(idProofs).values(idProof).returning();
    return newIdProof;
  }

  // Admin Users
  async getAdminUser(id: number): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
    return newAdmin;
  }

  // Trustee Auto Bookings
  async getTrusteeAutoBookings(): Promise<TrusteeAutoBooking[]> {
    return await db.select().from(trusteeAutoBookings).orderBy(desc(trusteeAutoBookings.createdAt));
  }

  async createTrusteeAutoBooking(autoBooking: InsertTrusteeAutoBooking): Promise<TrusteeAutoBooking> {
    const [newAutoBooking] = await db.insert(trusteeAutoBookings).values(autoBooking).returning();
    return newAutoBooking;
  }

  async updateTrusteeAutoBooking(id: number, autoBooking: Partial<TrusteeAutoBooking>): Promise<TrusteeAutoBooking> {
    const [updatedAutoBooking] = await db
      .update(trusteeAutoBookings)
      .set(autoBooking)
      .where(eq(trusteeAutoBookings.id, id))
      .returning();
    return updatedAutoBooking;
  }

  async getTrusteeAutoBookingsByMonth(year: number, month: number): Promise<TrusteeAutoBooking[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return await db
      .select()
      .from(trusteeAutoBookings)
      .where(
        and(
          gte(trusteeAutoBookings.bookingDate, startDate),
          lte(trusteeAutoBookings.bookingDate, endDate)
        )
      )
      .orderBy(asc(trusteeAutoBookings.bookingDate));
  }
}

export const storage = new DatabaseStorage();

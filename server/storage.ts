import {
  roomCategories,
  users,
  roomBookings,
  idProofs,
  adminUsers,
  foodSettings,
  passwordResetTokens,
  whatsappConfig,
  whatsappTemplates,
  trusteeReservedDates,
  paymentGateways,
  paymentTransactions,
  type RoomCategory,
  type User,
  type RoomBooking,
  type IdProof,
  type AdminUser,
  type FoodSettings,
  type WhatsAppConfig,
  type WhatsAppTemplate,
  type TrusteeReservedDate,
  type PaymentGateway,
  type PaymentTransaction,
  type InsertRoomCategory,
  type InsertUser,
  type InsertRoomBooking,
  type InsertIdProof,
  type InsertAdminUser,
  type InsertFoodSettings,
  type InsertWhatsAppConfig,
  type InsertWhatsAppTemplate,
  type InsertTrusteeReservedDate,
  type InsertPaymentGateway,
  type InsertPaymentTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, lt, gt, ne, sql } from "drizzle-orm";

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
  deleteUser(id: number): Promise<void>;
  getTrustees(): Promise<User[]>;

  // Room Bookings
  getRoomBookings(): Promise<RoomBooking[]>;
  getRoomBooking(id: number): Promise<RoomBooking | undefined>;
  getRoomBookingByBookingId(bookingId: string): Promise<RoomBooking | undefined>;
  createRoomBooking(booking: InsertRoomBooking & { bookingId: string }): Promise<RoomBooking>;
  updateRoomBooking(id: number, booking: Partial<RoomBooking>): Promise<RoomBooking>;
  getBookingsByDateRange(startDate: Date | string, endDate: Date | string): Promise<RoomBooking[]>;
  getTodaysCheckins(): Promise<RoomBooking[]>;
  getTodaysCheckouts(): Promise<RoomBooking[]>;
  getRecentBookings(limit: number, offset?: number): Promise<RoomBooking[]>;
  getTotalBookingsCount(): Promise<number>;

  // ID Proofs
  getIdProofsByBookingId(bookingId: number): Promise<IdProof[]>;
  createIdProof(idProof: InsertIdProof): Promise<IdProof>;

  // Admin Users
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;

  
  // Food Settings
  getFoodSettings(): Promise<FoodSettings | undefined>;
  updateFoodSettings(settings: Partial<InsertFoodSettings>): Promise<FoodSettings>;

  // Password Reset Tokens
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: number; used: boolean; expiresAt: string } | undefined>;
  markPasswordResetTokenAsUsed(tokenId: number): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;

  // WhatsApp Configuration
  getWhatsAppConfig(): Promise<WhatsAppConfig | undefined>;
  createOrUpdateWhatsAppConfig(config: InsertWhatsAppConfig): Promise<WhatsAppConfig>;

  // WhatsApp Templates
  getWhatsAppTemplates(): Promise<WhatsAppTemplate[]>;
  createWhatsAppTemplate(template: InsertWhatsAppTemplate): Promise<WhatsAppTemplate>;
  updateWhatsAppTemplate(id: number, template: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate>;
  deleteWhatsAppTemplate(id: number): Promise<void>;

  // Trustee Reserved Dates
  getTrusteeReservedDates(): Promise<TrusteeReservedDate[]>;
  createTrusteeReservedDate(reservedDate: InsertTrusteeReservedDate): Promise<TrusteeReservedDate>;
  updateTrusteeReservedDate(id: number, reservedDate: Partial<TrusteeReservedDate>): Promise<TrusteeReservedDate>;
  deleteTrusteeReservedDate(id: number): Promise<void>;
  getTrusteeReservedDatesEnabled(): Promise<TrusteeReservedDate[]>;

  // Payment Gateways
  getPaymentGateways(): Promise<PaymentGateway[]>;
  getActivePaymentGateways(): Promise<PaymentGateway[]>;
  getPaymentGateway(id: number): Promise<PaymentGateway | undefined>;
  getPaymentGatewayByName(gatewayName: string): Promise<PaymentGateway | undefined>;
  createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: number, gateway: Partial<PaymentGateway>): Promise<PaymentGateway>;
  deletePaymentGateway(id: number): Promise<void>;

  // Payment Transactions
  getPaymentTransactions(): Promise<PaymentTransaction[]>;
  getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByTransactionId(transactionId: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionsByBookingId(bookingId: number): Promise<PaymentTransaction[]>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(id: number, transaction: Partial<PaymentTransaction>): Promise<PaymentTransaction>;
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

  async deleteUser(id: number): Promise<void> {
    // Get user details before deletion for backup reference
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Update all user's bookings to preserve them with guest info
    // For now, we'll skip updating userId to null since the schema requires it
    // The bookings will remain linked to preserve referential integrity
    // In a production system, you might want to create a "deleted users" table
    // await db
    //   .update(roomBookings)
    //   .set({
    //     guestName: user.name,
    //     guestEmail: user.email,
    //     guestMobile: user.mobile || "",
    //   })
    //   .where(eq(roomBookings.userId, id));
    
    // Keep ID proofs - they remain linked to bookings
    // No need to delete ID proofs as they're linked to bookings, not users directly
    
    // Finally delete only the user account
    await db.delete(users).where(eq(users.id, id));
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

  async getBookingsByDateRange(startDate: Date | string, endDate: Date | string): Promise<RoomBooking[]> {
    // Get all bookings and filter in JavaScript to avoid date conversion issues
    const allBookings = await db
      .select()
      .from(roomBookings)
      .where(ne(roomBookings.status, "cancelled"))
      .orderBy(asc(roomBookings.checkinDate));
    
    // Convert input dates to Date objects for comparison
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Filter bookings that overlap with the requested date range
    // Overlap occurs when: booking.checkinDate < endDate AND booking.checkoutDate > startDate
    return allBookings.filter(booking => {
      const checkin = new Date(booking.checkinDate);
      const checkout = new Date(booking.checkoutDate);
      
      return checkin < end && checkout > start;
    });
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

  async getRecentBookings(limit: number, offset: number = 0): Promise<RoomBooking[]> {
    return await db
      .select()
      .from(roomBookings)
      .orderBy(desc(roomBookings.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getTotalBookingsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(roomBookings);
    return result[0]?.count || 0;
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
  // Trustee auto-booking methods - REMOVED per user request
  // async getTrusteeAutoBookings(): Promise<TrusteeAutoBooking[]> {
  //   return await db.select().from(trusteeAutoBookings).orderBy(desc(trusteeAutoBookings.createdAt));
  // }

  // async createTrusteeAutoBooking(autoBooking: InsertTrusteeAutoBooking): Promise<TrusteeAutoBooking> {
  //   const [newAutoBooking] = await db.insert(trusteeAutoBookings).values(autoBooking).returning();
  //   return newAutoBooking;
  // }

  // async updateTrusteeAutoBooking(id: number, autoBooking: Partial<TrusteeAutoBooking>): Promise<TrusteeAutoBooking> {
  //   const [updatedAutoBooking] = await db
  //     .update(trusteeAutoBookings)
  //     .set(autoBooking)
  //     .where(eq(trusteeAutoBookings.id, id))
  //     .returning();
  //   return updatedAutoBooking;
  // }

  // async getTrusteeAutoBookingsByMonth(year: number, month: number): Promise<TrusteeAutoBooking[]> {
  //   const startDate = new Date(year, month - 1, 1);
  //   const endDate = new Date(year, month, 0);

  //   return await db
  //     .select()
  //     .from(trusteeAutoBookings)
  //     .where(
  //       and(
  //         gte(trusteeAutoBookings.bookingDate, startDate),
  //         lte(trusteeAutoBookings.bookingDate, endDate)
  //       )
  //     )
  //     .orderBy(asc(trusteeAutoBookings.bookingDate));
  // }

  // Food Settings
  async getFoodSettings(): Promise<FoodSettings | undefined> {
    const [settings] = await db.select().from(foodSettings).limit(1);
    return settings;
  }

  async updateFoodSettings(updates: Partial<InsertFoodSettings>): Promise<FoodSettings> {
    // Get existing settings or use default ID 1
    const existing = await this.getFoodSettings();
    
    if (existing) {
      const [updated] = await db
        .update(foodSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(foodSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings if none exist
      const [created] = await db
        .insert(foodSettings)
        .values(updates)
        .returning();
      return created;
    }
  }

  // Password Reset Tokens
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
    });
  }

  async getPasswordResetToken(token: string): Promise<{ id: number; userId: number; used: boolean; expiresAt: string } | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    
    if (!resetToken) return undefined;
    
    return {
      id: resetToken.id,
      userId: resetToken.userId,
      used: resetToken.used || false,
      expiresAt: resetToken.expiresAt.toISOString()
    };
  }

  async markPasswordResetTokenAsUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // WhatsApp Configuration operations
  async getWhatsAppConfig(): Promise<WhatsAppConfig | undefined> {
    const [config] = await db.select().from(whatsappConfig).limit(1);
    return config;
  }

  async createOrUpdateWhatsAppConfig(data: InsertWhatsAppConfig): Promise<WhatsAppConfig> {
    const existingConfig = await this.getWhatsAppConfig();
    
    if (existingConfig) {
      const [updated] = await db
        .update(whatsappConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(whatsappConfig.id, existingConfig.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(whatsappConfig)
        .values(data)
        .returning();
      return created;
    }
  }

  // WhatsApp Template operations
  async getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    return await db.select().from(whatsappTemplates).orderBy(whatsappTemplates.notificationType);
  }

  async getWhatsAppTemplateByType(notificationType: string): Promise<WhatsAppTemplate | undefined> {
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.notificationType, notificationType),
          eq(whatsappTemplates.isActive, true)
        )
      );
    return template;
  }

  async createWhatsAppTemplate(data: InsertWhatsAppTemplate): Promise<WhatsAppTemplate> {
    const [template] = await db
      .insert(whatsappTemplates)
      .values(data)
      .returning();
    return template;
  }

  async updateWhatsAppTemplate(id: number, data: Partial<InsertWhatsAppTemplate>): Promise<WhatsAppTemplate> {
    const [updated] = await db
      .update(whatsappTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whatsappTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteWhatsAppTemplate(id: number): Promise<void> {
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
  }

  // Trustee Reserved Dates
  async getTrusteeReservedDates(): Promise<TrusteeReservedDate[]> {
    return await db.select().from(trusteeReservedDates).orderBy(asc(trusteeReservedDates.reservedDate));
  }

  async createTrusteeReservedDate(reservedDate: InsertTrusteeReservedDate): Promise<TrusteeReservedDate> {
    const [newReservedDate] = await db.insert(trusteeReservedDates).values(reservedDate).returning();
    return newReservedDate;
  }

  async updateTrusteeReservedDate(id: number, reservedDate: Partial<TrusteeReservedDate>): Promise<TrusteeReservedDate> {
    const [updatedReservedDate] = await db
      .update(trusteeReservedDates)
      .set({ ...reservedDate, updatedAt: new Date() })
      .where(eq(trusteeReservedDates.id, id))
      .returning();
    return updatedReservedDate;
  }

  async deleteTrusteeReservedDate(id: number): Promise<void> {
    await db.delete(trusteeReservedDates).where(eq(trusteeReservedDates.id, id));
  }

  async getTrusteeReservedDatesEnabled(): Promise<TrusteeReservedDate[]> {
    return await db.select().from(trusteeReservedDates)
      .where(eq(trusteeReservedDates.isEnabled, true))
      .orderBy(asc(trusteeReservedDates.reservedDate));
  }

  // Payment Gateways
  async getPaymentGateways(): Promise<PaymentGateway[]> {
    return await db.select().from(paymentGateways).orderBy(asc(paymentGateways.displayName));
  }

  async getActivePaymentGateways(): Promise<PaymentGateway[]> {
    return await db.select().from(paymentGateways)
      .where(eq(paymentGateways.isActive, true))
      .orderBy(asc(paymentGateways.displayName));
  }

  async getPaymentGateway(id: number): Promise<PaymentGateway | undefined> {
    const [gateway] = await db.select().from(paymentGateways).where(eq(paymentGateways.id, id));
    return gateway;
  }

  async getPaymentGatewayByName(gatewayName: string): Promise<PaymentGateway | undefined> {
    const [gateway] = await db.select().from(paymentGateways).where(eq(paymentGateways.gatewayName, gatewayName));
    return gateway;
  }

  async createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway> {
    const [newGateway] = await db.insert(paymentGateways).values(gateway).returning();
    return newGateway;
  }

  async updatePaymentGateway(id: number, gateway: Partial<PaymentGateway>): Promise<PaymentGateway> {
    // Remove timestamp fields from the update data as they should be handled by the database
    const { id: _, createdAt, updatedAt, ...updateData } = gateway;
    
    const [updated] = await db
      .update(paymentGateways)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(paymentGateways.id, id))
      .returning();
    return updated;
  }

  async deletePaymentGateway(id: number): Promise<void> {
    await db.delete(paymentGateways).where(eq(paymentGateways.id, id));
  }

  // Payment Transactions
  async getPaymentTransactions(): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt));
  }

  async getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined> {
    const [transaction] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return transaction;
  }

  async getPaymentTransactionByTransactionId(transactionId: string): Promise<PaymentTransaction | undefined> {
    const [transaction] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.transactionId, transactionId));
    return transaction;
  }

  async getPaymentTransactionsByBookingId(bookingId: number): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.bookingId, bookingId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [newTransaction] = await db.insert(paymentTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updatePaymentTransaction(id: number, transaction: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const [updated] = await db
      .update(paymentTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

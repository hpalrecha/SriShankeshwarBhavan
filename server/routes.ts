import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRoomBookingSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import session from "express-session";

// Session middleware for user authentication
interface AuthenticatedRequest extends Express.Request {
  user?: { id: number; email: string; name: string; isTrustee: boolean };
}

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, mobile, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        name,
        email,
        mobile,
        password: hashedPassword,
      });

      res.status(201).json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).userEmail = user.email;

      res.json({ 
        message: "Login successful", 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          isTrustee: user.isTrustee 
        } 
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email,
        isTrustee: user.isTrustee 
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Room Categories
  app.get("/api/room-categories", async (req, res) => {
    try {
      const categories = await storage.getRoomCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching room categories:", error);
      res.status(500).json({ message: "Failed to fetch room categories" });
    }
  });

  // Get current availability for admin dashboard
  app.get("/api/admin/current-availability", async (req, res) => {
    try {
      const categories = await storage.getRoomCategories();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const availability: Record<number, { available: number; booked: number }> = {};

      for (const category of categories) {
        const bookings = await storage.getBookingsByDateRange(today, tomorrow);
        const bookedRooms = bookings
          .filter(booking => 
            booking.roomCategoryId === category.id && 
            booking.status !== 'cancelled'
          )
          .reduce((sum, booking) => sum + (booking.roomsBooked || 1), 0);

        availability[category.id] = {
          available: Math.max(0, category.totalUnits - bookedRooms),
          booked: bookedRooms
        };
      }

      res.json(availability);
    } catch (error) {
      console.error("Error fetching current availability:", error);
      res.status(500).json({ message: "Failed to fetch current availability" });
    }
  });

  // ID Proof Management
  app.get("/api/admin/id-proofs/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const idProofs = await storage.getIdProofsByBookingId(bookingId);
      res.json(idProofs);
    } catch (error) {
      console.error("Error fetching ID proofs:", error);
      res.status(500).json({ message: "Failed to fetch ID proofs" });
    }
  });

  app.post("/api/admin/id-proofs", async (req, res) => {
    try {
      // Note: In a real implementation, you'd handle file upload with multer or similar
      const { bookingId, fileName, fileType } = req.body;
      
      const idProof = await storage.createIdProof({
        bookingId: parseInt(bookingId),
        fileName: fileName || "id_proof.jpg",
        fileType: fileType || "image/jpeg",
        filePath: `/uploads/${bookingId}/${fileName || "id_proof.jpg"}`,
      });
      
      res.status(201).json(idProof);
    } catch (error) {
      console.error("Error creating ID proof:", error);
      res.status(500).json({ message: "Failed to upload ID proof" });
    }
  });

  // Room availability check
  app.get("/api/rooms/availability", async (req, res) => {
    try {
      const { checkinDate, checkoutDate, roomCategoryId } = req.query;
      
      if (!checkinDate || !checkoutDate || !roomCategoryId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const startDate = new Date(checkinDate as string);
      const endDate = new Date(checkoutDate as string);
      const categoryId = parseInt(roomCategoryId as string);

      // Get bookings in the date range for this room category
      const bookings = await storage.getBookingsByDateRange(startDate, endDate);
      const categoryBookings = bookings.filter(booking => 
        booking.roomCategoryId === categoryId && 
        booking.status !== "cancelled"
      );

      // Get room category to check total units
      const category = await storage.getRoomCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      const availableUnits = category.totalUnits - categoryBookings.length;
      
      res.json({
        available: availableUnits > 0,
        availableUnits,
        totalUnits: category.totalUnits,
        category
      });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingSchema = z.object({
        user: insertUserSchema.omit({ password: true }),
        booking: insertRoomBookingSchema.extend({
          checkinDate: z.string(),
          checkoutDate: z.string(),
        }).omit({ userId: true }), // Remove userId from validation since we'll add it server-side
      });

      const { user: userData, booking: bookingData } = bookingSchema.parse(req.body);

      // Check if user exists or create new user
      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        // Create user with a default password for guest bookings
        const hashedPassword = await bcrypt.hash("guest123", 10);
        user = await storage.createUser({
          ...userData,
          password: hashedPassword,
        });
      }

      // Generate booking ID
      const bookingId = `SSH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Calculate total amount
      const category = await storage.getRoomCategory(bookingData.roomCategoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      const checkinDate = new Date(bookingData.checkinDate);
      const checkoutDate = new Date(bookingData.checkoutDate);
      const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = parseFloat(category.price) * nights;

      const booking = await storage.createRoomBooking({
        ...bookingData,
        bookingId,
        userId: user.id,
        checkinDate,
        checkoutDate,
        totalAmount: totalAmount.toString(),
      });

      res.json({ booking, user, bookingId });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Get booking by booking ID
  app.get("/api/bookings/:bookingId", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const booking = await storage.getRoomBookingByBookingId(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const user = await storage.getUser(booking.userId);
      const category = await storage.getRoomCategory(booking.roomCategoryId);

      res.json({ booking, user, category });
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Add user bookings route
  app.get("/api/my-bookings", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const bookings = await storage.getRoomBookings();
      
      // Filter bookings for current user and add category details
      const userBookings = [];
      for (const booking of bookings) {
        if (booking.userId === userId) {
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          const user = await storage.getUser(booking.userId);
          userBookings.push({
            booking,
            user,
            category,
          });
        }
      }
      
      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Cancel booking route
  app.patch("/api/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = (req.session as any).userId;
      
      const booking = await storage.getRoomBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "confirmed") {
        return res.status(400).json({ message: "Booking cannot be cancelled" });
      }

      await storage.updateRoomBooking(bookingId, { status: "cancelled" });
      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Admin room category management routes
  app.post("/api/admin/room-categories", async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createRoomCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating room category:", error);
      res.status(500).json({ message: "Failed to create room category" });
    }
  });

  app.patch("/api/admin/room-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const category = await storage.updateRoomCategory(id, updates);
      res.json(category);
    } catch (error) {
      console.error("Error updating room category:", error);
      res.status(500).json({ message: "Failed to update room category" });
    }
  });

  app.delete("/api/admin/room-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if there are any bookings for this category
      const bookings = await storage.getRoomBookings();
      const hasBookings = bookings.some(booking => booking.roomCategoryId === id && booking.status !== "cancelled");
      
      if (hasBookings) {
        return res.status(400).json({ 
          message: "Cannot delete room category with active bookings" 
        });
      }
      
      await storage.deleteRoomCategory(id);
      res.json({ message: "Room category deleted successfully" });
    } catch (error) {
      console.error("Error deleting room category:", error);
      res.status(500).json({ message: "Failed to delete room category" });
    }
  });

  // Admin Routes
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysBookings = await storage.getBookingsByDateRange(today, tomorrow);
      const checkedInToday = todaysBookings.filter(b => b.status === "checked_in").length;
      const todaysRevenue = todaysBookings
        .filter(b => b.paymentStatus === "paid")
        .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

      // Calculate occupancy rate
      const categories = await storage.getRoomCategories();
      const totalRooms = categories.reduce((sum, cat) => sum + cat.totalUnits, 0);
      const occupiedRooms = todaysBookings.filter(b => b.status === "checked_in").length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      res.json({
        todayBookings: todaysBookings.length,
        checkedIn: checkedInToday,
        revenue: todaysRevenue,
        occupancy: `${occupancyRate}%`
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/recent-bookings", async (req, res) => {
    try {
      const bookings = await storage.getRecentBookings(10);
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          const user = await storage.getUser(booking.userId);
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          return { booking, user, category };
        })
      );
      res.json(bookingsWithDetails);
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      res.status(500).json({ message: "Failed to fetch recent bookings" });
    }
  });

  app.get("/api/admin/todays-checkins", async (req, res) => {
    try {
      const checkins = await storage.getTodaysCheckins();
      const checkinsWithDetails = await Promise.all(
        checkins.map(async (booking) => {
          const user = await storage.getUser(booking.userId);
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          return { booking, user, category };
        })
      );
      res.json(checkinsWithDetails);
    } catch (error) {
      console.error("Error fetching today's checkins:", error);
      res.status(500).json({ message: "Failed to fetch today's checkins" });
    }
  });

  app.get("/api/admin/todays-checkouts", async (req, res) => {
    try {
      const checkouts = await storage.getTodaysCheckouts();
      const checkoutsWithDetails = await Promise.all(
        checkouts.map(async (booking) => {
          const user = await storage.getUser(booking.userId);
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          return { booking, user, category };
        })
      );
      res.json(checkoutsWithDetails);
    } catch (error) {
      console.error("Error fetching today's checkouts:", error);
      res.status(500).json({ message: "Failed to fetch today's checkouts" });
    }
  });

  // Update booking status
  app.patch("/api/admin/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedBooking = await storage.updateRoomBooking(id, updates);
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Trustee Routes
  app.get("/api/trustees", async (req, res) => {
    try {
      const trustees = await storage.getTrustees();
      res.json(trustees);
    } catch (error) {
      console.error("Error fetching trustees:", error);
      res.status(500).json({ message: "Failed to fetch trustees" });
    }
  });

  app.post("/api/trustees", async (req, res) => {
    try {
      const trusteeData = { ...req.body, isTrustee: true };
      const trustee = await storage.createUser(trusteeData);
      res.json(trustee);
    } catch (error) {
      console.error("Error creating trustee:", error);
      res.status(500).json({ message: "Failed to create trustee" });
    }
  });

  app.patch("/api/trustees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedTrustee = await storage.updateUser(id, updates);
      res.json(updatedTrustee);
    } catch (error) {
      console.error("Error updating trustee:", error);
      res.status(500).json({ message: "Failed to update trustee" });
    }
  });

  // Auto-booking trigger
  app.post("/api/trustees/auto-booking", async (req, res) => {
    try {
      // This would typically be triggered by a cron job
      const trustees = await storage.getTrustees();
      const results = [];

      for (const trustee of trustees) {
        if (trustee.trusteeStatus === "active" && trustee.trusteeAutoBookDates && trustee.trusteeRoomCategoryId) {
          const autoBooking = await storage.createTrusteeAutoBooking({
            trusteeId: trustee.id,
            bookingDate: new Date(), // This would be calculated based on auto-book dates
            optOutStatus: "pending",
          });
          results.push(autoBooking);
        }
      }

      res.json({ message: "Auto-booking triggered", results });
    } catch (error) {
      console.error("Error triggering auto-booking:", error);
      res.status(500).json({ message: "Failed to trigger auto-booking" });
    }
  });

  // Seed initial data
  app.get("/api/seed", async (req, res) => {
    try {
      // Create room categories
      let deluxeCategory, standardCategory;
      try {
        deluxeCategory = await storage.createRoomCategory({
          name: "Deluxe Room",
          description: "Spacious deluxe room with modern amenities, AC, WiFi, and attached bathroom",
          price: "2500.00",
          totalUnits: 10,
        });
      } catch (error) {
        console.log("Deluxe room category already exists");
      }

      try {
        standardCategory = await storage.createRoomCategory({
          name: "Standard Room", 
          description: "Comfortable standard room with essential amenities, AC, WiFi, and attached bathroom",
          price: "1800.00",
          totalUnits: 15,
        });
      } catch (error) {
        console.log("Standard room category already exists");
      }

      // Create test user for demo purposes
      let testUser;
      try {
        const hashedPassword = await bcrypt.hash("password123", 10);
        testUser = await storage.createUser({
          name: "Test User",
          email: "test@example.com",
          mobile: "9876543210",
          password: hashedPassword,
        });
      } catch (error) {
        console.log("Test user already exists");
        testUser = await storage.getUserByEmail("test@example.com");
      }

      // Create admin user for demo purposes
      let adminUser;
      try {
        const hashedAdminPassword = await bcrypt.hash("admin123", 10);
        adminUser = await storage.createAdminUser({
          name: "Admin User",
          email: "admin@example.com",
          password: hashedAdminPassword,
        });
      } catch (error) {
        console.log("Admin user already exists");
        adminUser = await storage.getAdminUserByEmail("admin@example.com");
      }

      const categories = await storage.getRoomCategories();

      res.json({ 
        message: "Database seeded successfully",
        categories,
        testUser: testUser ? { email: testUser.email, password: "password123" } : null,
        adminUser: adminUser ? { email: adminUser.email, password: "admin123" } : null
      });
    } catch (error) {
      console.error("Seeding error:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

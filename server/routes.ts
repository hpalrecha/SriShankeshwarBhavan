import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRoomBookingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
        user: insertUserSchema,
        booking: insertRoomBookingSchema.extend({
          checkinDate: z.string(),
          checkoutDate: z.string(),
        }),
      });

      const { user: userData, booking: bookingData } = bookingSchema.parse(req.body);

      // Check if user exists or create new user
      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        user = await storage.createUser(userData);
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

  const httpServer = createServer(app);
  return httpServer;
}

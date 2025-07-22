import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRoomBookingSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import session from "express-session";
import { sendBookingConfirmationEmail, sendBookingCancellationEmail, sendPasswordResetEmail } from "./email";
import { sendEmailViaSES } from "./emailSES";
import { debugSESConfiguration } from "./debug-email-ses";
import { testDirectSMTP } from "./test-direct-smtp";
import { testSimpleSMTP } from "./test-simple-smtp";
import { checkVerifiedEmails } from "./check-ses-emails";
import { checkDomainCredentials } from "./check-domain-credentials";
import { testAllEmailTemplates } from "./test-all-email-templates";
import { whatsappService } from "./whatsapp";
import { insertWhatsAppConfigSchema, insertWhatsAppTemplateSchema } from "@shared/schema";
import { checkEmailVerification } from "./verify-email-check";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a general uploads directory first, will organize by booking ID in the route handler
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFileName = `${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}_${timestamp}${path.extname(file.originalname)}`;
    cb(null, safeFileName);
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

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

  // Forgot Password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save reset token
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send password reset email
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset Password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Find and validate reset token
      const resetTokenData = await storage.getPasswordResetToken(token);
      if (!resetTokenData || resetTokenData.used || new Date() > new Date(resetTokenData.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUserPassword(resetTokenData.userId, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetTokenData.id);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Verify Reset Token endpoint
  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const resetTokenData = await storage.getPasswordResetToken(token);
      if (!resetTokenData || resetTokenData.used || new Date() > new Date(resetTokenData.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired reset token", valid: false });
      }

      res.json({ message: "Token is valid", valid: true });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "Failed to verify token", valid: false });
    }
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
      today.setHours(0, 0, 0, 0); // Start of today
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const availability: Record<number, { available: number; booked: number }> = {};

      for (const category of categories) {
        // Get all active bookings (confirmed or checked in) for today
        const allBookings = await storage.getRoomBookings();
        // Show rooms as unavailable if they are:
        // 1. Currently occupied (checkin <= today < checkout)
        // 2. Confirmed for today (checkin = today) 
        // 3. Checked in but not checked out
        const bookedRooms = allBookings
          .filter(booking => {
            const checkin = new Date(booking.checkinDate);
            const checkout = new Date(booking.checkoutDate);
            checkin.setHours(0, 0, 0, 0);
            checkout.setHours(0, 0, 0, 0);
            
            const isRoomCategoryMatch = booking.roomCategoryId === category.id;
            const isActiveStatus = booking.status !== 'cancelled' && booking.status !== 'checked_out';
            
            // Room is unavailable if:
            // - Currently occupying (checkin <= today < checkout)
            // - OR booking is for today (checkin = today)
            // - OR status is checked_in (regardless of dates)
            const isCurrentlyOccupying = checkin <= today && checkout > today;
            const isBookingForToday = checkin.getTime() === today.getTime();
            const isCheckedIn = booking.status === 'checked_in';
            
            const isUnavailable = isCurrentlyOccupying || isBookingForToday || isCheckedIn;
            

            
            return isRoomCategoryMatch && isActiveStatus && isUnavailable;
          })
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

  // Updated endpoint for actual file uploads
  app.post("/api/admin/id-proofs", upload.single('file'), async (req, res) => {
    try {
      const { bookingId, guestName, idType } = req.body;
      const file = req.file;
      
      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
      }

      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }

      // Move file from temp directory to booking-specific directory
      const bookingDir = path.join(process.cwd(), 'uploads', bookingId.toString());
      fs.mkdirSync(bookingDir, { recursive: true });
      
      const oldPath = file.path;
      const newPath = path.join(bookingDir, file.filename);
      
      // Move the file to the correct directory
      fs.renameSync(oldPath, newPath);
      
      const idProof = await storage.createIdProof({
        bookingId: parseInt(bookingId),
        fileName: file.filename,
        fileType: file.mimetype,
        filePath: `/uploads/${bookingId}/${file.filename}`,
        idType: idType || "government_id",
        guestName: guestName || null,
      });
      
      res.status(201).json(idProof);
    } catch (error) {
      console.error("Error uploading ID proof:", error);
      res.status(500).json({ message: "Failed to upload ID proof" });
    }
  });

  // Room availability check
  app.get("/api/rooms/availability", async (req, res) => {
    try {
      const { checkinDate, checkoutDate, roomCategoryId, guests } = req.query;
      
      if (!checkinDate || !checkoutDate || !roomCategoryId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const startDate = new Date(checkinDate as string);
      const endDate = new Date(checkoutDate as string);
      const categoryId = parseInt(roomCategoryId as string);
      const guestCount = parseInt(guests as string) || 1;

      // Get bookings in the date range for this room category
      const bookings = await storage.getBookingsByDateRange(startDate, endDate);
      const categoryBookings = bookings.filter(booking => 
        booking.roomCategoryId === categoryId && 
        booking.status !== "cancelled"
      );

      // Get room category to check total units and capacity
      const category = await storage.getRoomCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      const availableUnits = category.totalUnits - categoryBookings.length;
      const roomsNeeded = Math.ceil(guestCount / category.maxOccupancy);
      
      res.json({
        available: availableUnits >= roomsNeeded,
        availableUnits,
        totalUnits: category.totalUnits,
        category,
        roomsNeeded,
        guestsPerRoom: category.maxOccupancy,
        canAccommodateGuests: availableUnits >= roomsNeeded
      });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Create combination booking route (for admin)
  app.post("/api/admin/bookings/combination", async (req, res) => {
    try {
      const { user: userData, booking: bookingData } = req.body;

      // Create or get user
      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        const hashedPassword = await bcrypt.hash("guest123", 10);
        user = await storage.createUser({
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          password: hashedPassword,
        });
      }

      // Calculate total amount from all room selections
      let totalAmount = 0;
      let totalRooms = 0;
      const checkinDate = new Date(bookingData.checkinDate);
      const checkoutDate = new Date(bookingData.checkoutDate);
      const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));

      // Create separate bookings for each room type selected
      const createdBookings = [];
      
      for (const selection of bookingData.roomSelections) {
        if (selection.quantity > 0) {
          const roomCategory = await storage.getRoomCategory(selection.categoryId);
          if (!roomCategory) {
            return res.status(400).json({ message: `Invalid room category: ${selection.categoryId}` });
          }

          // Validate room capacity vs guests for each room type
          const totalCapacity = roomCategory.maxOccupancy * selection.quantity;
          
          if (bookingData.guests > totalCapacity) {
            const minRoomsNeeded = Math.ceil(bookingData.guests / roomCategory.maxOccupancy);
            return res.status(400).json({ 
              message: `Insufficient capacity for ${roomCategory.name}. ${bookingData.guests} guests need at least ${minRoomsNeeded} rooms (max ${roomCategory.maxOccupancy} guests per room). Currently selecting ${selection.quantity} rooms.`
            });
          }

          const selectionAmount = nights * parseFloat(roomCategory.price) * selection.quantity;
          totalAmount += selectionAmount;
          totalRooms += selection.quantity;

          // Generate booking ID for each room type
          const bookingId = `SSH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

          const booking = await storage.createRoomBooking({
            userId: user.id,
            bookingId,
            roomCategoryId: selection.categoryId,
            checkinDate: bookingData.checkinDate,
            checkoutDate: bookingData.checkoutDate,
            guests: bookingData.guests,
            roomsBooked: selection.quantity,
            totalAmount: selectionAmount.toString(),
            paymentMethod: bookingData.paymentMethod || "cash",
            paymentStatus: bookingData.paymentMethod === "cash" ? "paid" : "pending",
            status: bookingData.status || "confirmed",
            paymentReference: bookingData.paymentReference,
          });

          createdBookings.push(booking);
          
          // Send booking confirmation email for each booking
          try {
            await sendBookingConfirmationEmail({
              booking,
              user,
              category: roomCategory,
            });
          } catch (error) {
            console.error(`Error sending booking confirmation email for ${booking.bookingId}:`, error);
          }
        }
      }

      res.json({ 
        bookings: createdBookings, 
        user,
        totalAmount,
        totalRooms,
        message: `Created ${createdBookings.length} bookings for ${totalRooms} rooms`
      });
    } catch (error) {
      console.error("Error creating combination booking:", error);
      res.status(500).json({ message: "Failed to create combination booking" });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingSchema = z.object({
        user: insertUserSchema.omit({ password: true }).extend({
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          pincode: z.string().optional(),
          country: z.string().default("India"),
        }),
        booking: insertRoomBookingSchema.extend({
          checkinDate: z.string(),
          checkoutDate: z.string(),
          arrivingFrom: z.string().optional(),
          goingTo: z.string().optional(),
          estimatedArrivalTime: z.string().optional(),
          estimatedDepartureTime: z.string().optional(),
          breakfastDays: z.number().default(0),
          lunchDays: z.number().default(0),
          dinnerDays: z.number().default(0),
        }).omit({ userId: true }), // Remove userId from validation since we'll add it server-side
      });

      const { user: userData, booking: bookingData } = bookingSchema.parse(req.body);

      // Get room category to check capacity
      const category = await storage.getRoomCategory(bookingData.roomCategoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      // Validate room capacity vs guests
      const roomsBooked = bookingData.roomsBooked || 1;
      const totalCapacity = category.maxOccupancy * roomsBooked;
      
      if (bookingData.guests && bookingData.guests > totalCapacity) {
        const minRoomsNeeded = Math.ceil(bookingData.guests / category.maxOccupancy);
        return res.status(400).json({ 
          message: `Insufficient room capacity. ${bookingData.guests || 0} guests need at least ${minRoomsNeeded} rooms of ${category.name} (max ${category.maxOccupancy} guests per room). Currently booking ${roomsBooked} rooms.`,
          suggestedRooms: minRoomsNeeded,
          roomCapacity: category.maxOccupancy,
          totalGuests: bookingData.guests
        });
      }

      // Check if user exists or create new user
      let user = await storage.getUserByEmail(userData.email);
      let isNewUser = false;
      if (!user) {
        // Create user with a default password for guest bookings
        const hashedPassword = await bcrypt.hash("guest123", 10);
        user = await storage.createUser({
          ...userData,
          password: hashedPassword,
        });
        isNewUser = true;
      }

      // Generate booking ID
      const bookingId = `SSH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const checkinDate = new Date(bookingData.checkinDate);
      const checkoutDate = new Date(bookingData.checkoutDate);
      const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      const roomAmount = parseFloat(category.price) * nights * roomsBooked;
      
      // Calculate food amount
      const foodSettings = await storage.getFoodSettings();
      const breakfastPrice = foodSettings ? parseFloat(foodSettings.breakfastPrice) : 50;
      const lunchPrice = foodSettings ? parseFloat(foodSettings.lunchPrice) : 100;
      const dinnerPrice = foodSettings ? parseFloat(foodSettings.dinnerPrice) : 100;
      
      const foodAmount = (bookingData.breakfastDays || 0) * breakfastPrice + 
                        (bookingData.lunchDays || 0) * lunchPrice + 
                        (bookingData.dinnerDays || 0) * dinnerPrice;
      
      const totalAmount = roomAmount + foodAmount;

      const booking = await storage.createRoomBooking({
        ...bookingData,
        bookingId,
        userId: user.id,
        checkinDate,
        checkoutDate,
        estimatedArrivalTime: bookingData.estimatedArrivalTime ? new Date(bookingData.estimatedArrivalTime) : undefined,
        estimatedDepartureTime: bookingData.estimatedDepartureTime ? new Date(bookingData.estimatedDepartureTime) : undefined,
        totalAmount: totalAmount.toString(),
        foodAmount: foodAmount.toString(),
      });

      // Send booking confirmation email
      try {
        await sendBookingConfirmationEmail({
          booking,
          user,
          category,
        });
      } catch (error) {
        console.error("Error sending booking confirmation email:", error);
      }

      // Auto-login new users by creating a session
      if (isNewUser && req.session) {
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session for new user:", err);
          }
        });
      }

      res.json({ 
        booking, 
        user, 
        bookingId, 
        autoLoggedIn: isNewUser,
        defaultPassword: isNewUser ? "guest123" : undefined
      });
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
      
      // Send booking cancellation email
      try {
        const category = await storage.getRoomCategory(booking.roomCategoryId);
        const user = await storage.getUser(booking.userId);
        if (category) {
          await sendBookingCancellationEmail({
            booking: { ...booking, status: "cancelled" },
            user,
            category,
          });
        }
      } catch (error) {
        console.error("Error sending booking cancellation email:", error);
      }
      
      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Room Category Image Upload
  app.post("/api/admin/room-category-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // Move file to room-categories directory
      const roomCategoriesDir = path.join(process.cwd(), 'uploads', 'room-categories');
      if (!fs.existsSync(roomCategoriesDir)) {
        fs.mkdirSync(roomCategoriesDir, { recursive: true });
      }

      const finalPath = path.join(roomCategoriesDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);

      // Generate public URL for the uploaded image
      const imageUrl = `/uploads/room-categories/${req.file.filename}`;

      res.json({
        imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (error) {
      console.error('Room category image upload error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
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

  // Trustee auto-booking management
  app.get("/api/admin/trustee-auto-bookings", async (req, res) => {
    try {
      const { year, month } = req.query;
      if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required" });
      }
      
      const autoBookings = await storage.getTrusteeAutoBookingsByMonth(
        parseInt(year as string), 
        parseInt(month as string)
      );
      res.json(autoBookings);
    } catch (error) {
      console.error("Error fetching trustee auto-bookings:", error);
      res.status(500).json({ message: "Failed to fetch trustee auto-bookings" });
    }
  });

  app.post("/api/admin/trustee-auto-bookings", async (req, res) => {
    try {
      const { year, month, dates, roomCategoryId } = req.body;
      
      const autoBooking = await storage.createTrusteeAutoBooking({
        trusteeId: 1, // This should be the actual trustee ID from request
        bookingDate: new Date(year, month - 1, dates[0]), // Use first date as primary
        status: "active"
      });
      
      res.status(201).json(autoBooking);
    } catch (error) {
      console.error("Error creating trustee auto-booking:", error);
      res.status(500).json({ message: "Failed to create trustee auto-booking" });
    }
  });

  // Get all trustees
  app.get("/api/admin/trustees", async (req, res) => {
    try {
      const trustees = await storage.getTrustees();
      
      // Add booking statistics for each trustee
      const trusteesWithStats = await Promise.all(
        trustees.map(async (trustee) => {
          const bookings = await storage.getRoomBookings();
          const trusteeBookings = bookings.filter(b => b.userId === trustee.id);
          
          return {
            ...trustee,
            totalBookings: trusteeBookings.length,
            lastBooking: trusteeBookings.length > 0 
              ? trusteeBookings.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))[0].createdAt
              : null
          };
        })
      );
      
      res.json(trusteesWithStats);
    } catch (error) {
      console.error("Error fetching trustees:", error);
      res.status(500).json({ message: "Failed to fetch trustees" });
    }
  });

  // Users management route
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      // Add booking statistics for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const bookings = await storage.getRoomBookings();
          const userBookings = bookings.filter(b => b.userId === user.id);
          
          return {
            ...user,
            totalBookings: userBookings.length,
            lastBooking: userBookings.length > 0 
              ? userBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
              : null
          };
        })
      );
      
      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user route
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user route
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get user bookings route
  app.get("/api/admin/user-bookings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const bookings = await storage.getRoomBookings();
      const userBookings = bookings.filter(b => b.userId === userId);
      
      const bookingsWithDetails = await Promise.all(
        userBookings.map(async (booking) => {
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          return { booking, category };
        })
      );
      
      res.json(bookingsWithDetails);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch user bookings" });
    }
  });

  // Update booking status with check-in/out times
  app.patch("/api/admin/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Add actual check-in/out times based on status
      if (updates.status === "checked_in" && !updates.actualCheckinTime) {
        updates.actualCheckinTime = new Date();
      }
      if (updates.status === "checked_out" && !updates.actualCheckoutTime) {
        updates.actualCheckoutTime = new Date();
      }
      
      const updatedBooking = await storage.updateRoomBooking(id, updates);
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Food Settings Routes
  app.get("/api/admin/food-settings", async (req, res) => {
    try {
      const settings = await storage.getFoodSettings();
      res.json(settings || { breakfastPrice: "50", lunchPrice: "100", dinnerPrice: "100" });
    } catch (error) {
      console.error("Error fetching food settings:", error);
      res.status(500).json({ message: "Failed to fetch food settings" });
    }
  });

  app.patch("/api/admin/food-settings", async (req, res) => {
    try {
      const updates = req.body;
      const updatedSettings = await storage.updateFoodSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating food settings:", error);
      res.status(500).json({ message: "Failed to update food settings" });
    }
  });

  // Multiple ID Proofs Upload
  app.post("/api/admin/bookings/:id/id-proofs", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { fileName, fileType, filePath, idType, guestName } = req.body;
      
      const idProof = await storage.createIdProof({
        bookingId,
        fileName,
        fileType: fileType || "image/jpeg",
        filePath,
        idType: idType || "government_id",
        guestName,
      });
      
      res.status(201).json(idProof);
    } catch (error) {
      console.error("Error uploading ID proof:", error);
      res.status(500).json({ message: "Failed to upload ID proof" });
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
          maxOccupancy: 3,
          bedConfiguration: "1 King Bed + 1 Sofa Bed",
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
          maxOccupancy: 2,
          bedConfiguration: "1 Double Bed",
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

  // Debug email configuration endpoint
  app.get("/api/debug-email", async (req, res) => {
    try {
      const isWorking = await debugSESConfiguration();
      res.json({ 
        message: "AWS SES configuration debug completed",
        isWorking,
        checkConsole: "Check console for detailed logs"
      });
    } catch (error) {
      console.error("Debug AWS SES error:", error);
      res.status(500).json({ message: "Debug AWS SES error" });
    }
  });

  // Test direct SMTP with working credentials
  app.post("/api/test-direct-smtp", async (req, res) => {
    try {
      const success = await testDirectSMTP();
      if (success) {
        res.json({ 
          message: "Direct SMTP test successful - email sent!",
          status: "success"
        });
      } else {
        res.status(500).json({ 
          message: "Direct SMTP test failed - check console for details",
          status: "failed"
        });
      }
    } catch (error) {
      console.error("Direct SMTP test error:", error);
      res.status(500).json({ message: "Direct SMTP test error" });
    }
  });

  // Test simple SMTP with proper imports
  app.post("/api/test-simple-smtp", async (req, res) => {
    try {
      const success = await testSimpleSMTP();
      if (success) {
        res.json({ 
          message: "Simple SMTP test successful - email sent!",
          status: "success"
        });
      } else {
        res.status(500).json({ 
          message: "Simple SMTP test failed - check console for details",
          status: "failed"
        });
      }
    } catch (error) {
      console.error("Simple SMTP test error:", error);
      res.status(500).json({ message: "Simple SMTP test error" });
    }
  });

  // Check SES verified emails
  app.get("/api/check-ses-emails", async (req, res) => {
    try {
      await checkVerifiedEmails();
      res.json({ 
        message: "SES email verification check completed - see console logs",
        checkConsole: true
      });
    } catch (error) {
      console.error("SES email check error:", error);
      res.status(500).json({ message: "SES email check error" });
    }
  });

  // Check domain credentials
  app.post("/api/check-domain-credentials", async (req, res) => {
    try {
      await checkDomainCredentials();
      res.json({ 
        message: "Domain credentials check completed - see console logs and check email",
        status: "success"
      });
    } catch (error) {
      console.error("Domain credentials check error:", error);
      res.status(500).json({ message: "Domain credentials check error" });
    }
  });

  // Test all email templates
  app.post("/api/test-all-email-templates", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      await testAllEmailTemplates(email);
      res.json({ 
        message: "All email templates sent successfully",
        email: email,
        templatesCount: 6,
        templates: [
          "Booking Confirmation",
          "Booking Cancellation", 
          "Password Reset",
          "Pre Check-in Reminder",
          "Check-in Day Welcome",
          "Post Checkout Feedback"
        ]
      });
    } catch (error) {
      console.error("Email templates test error:", error);
      res.status(500).json({ message: "Failed to send email templates" });
    }
  });

  // WhatsApp Configuration Routes
  app.get("/api/whatsapp/config", async (req, res) => {
    try {
      const config = await storage.getWhatsAppConfig();
      res.json(config || {});
    } catch (error: any) {
      console.error("Error fetching WhatsApp config:", error);
      res.status(500).json({ error: error.message || "Failed to fetch WhatsApp configuration" });
    }
  });

  app.post("/api/whatsapp/config", async (req, res) => {
    try {
      const validatedData = insertWhatsAppConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateWhatsAppConfig(validatedData);
      
      // Initialize WhatsApp service with new config
      whatsappService.setConfig({
        ...config,
        isEnabled: config.isEnabled ?? false,
      });
      
      res.json(config);
    } catch (error: any) {
      console.error("Error updating WhatsApp config:", error);
      res.status(500).json({ error: error.message || "Failed to update WhatsApp configuration" });
    }
  });

  // WhatsApp Template Routes
  // WhatsApp template management - fetch from Meta API
  app.get("/api/whatsapp/templates/meta", async (req, res) => {
    try {
      const templates = await whatsappService.fetchTemplatesFromMeta();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching WhatsApp templates from Meta:", error);
      res.status(500).json({ error: error.message || "Failed to fetch templates from Meta" });
    }
  });

  // WhatsApp template mappings (local database)
  app.get("/api/whatsapp/templates", async (req, res) => {
    try {
      const templates = await storage.getWhatsAppTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching WhatsApp templates:", error);
      res.status(500).json({ error: error.message || "Failed to fetch WhatsApp templates" });
    }
  });

  app.post("/api/whatsapp/templates", async (req, res) => {
    try {
      const validatedData = insertWhatsAppTemplateSchema.parse(req.body);
      const template = await storage.createWhatsAppTemplate(validatedData);
      res.json(template);
    } catch (error: any) {
      console.error("Error creating WhatsApp template:", error);
      res.status(500).json({ error: error.message || "Failed to create WhatsApp template" });
    }
  });

  app.put("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWhatsAppTemplateSchema.partial().parse(req.body);
      const template = await storage.updateWhatsAppTemplate(id, validatedData);
      res.json(template);
    } catch (error: any) {
      console.error("Error updating WhatsApp template:", error);
      res.status(500).json({ error: error.message || "Failed to update WhatsApp template" });
    }
  });

  app.delete("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhatsAppTemplate(id);
      res.json({ message: "Template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting WhatsApp template:", error);
      res.status(500).json({ error: error.message || "Failed to delete WhatsApp template" });
    }
  });

  // WhatsApp Test Connection Route
  app.post("/api/whatsapp/test-connection", async (req, res) => {
    try {
      const isConnected = await whatsappService.testConnection();
      
      res.json({
        success: isConnected,
        message: isConnected 
          ? "WhatsApp connection successful" 
          : "WhatsApp connection failed - please check your configuration",
      });
    } catch (error: any) {
      console.error("Error testing WhatsApp connection:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to test WhatsApp connection: " + error.message 
      });
    }
  });

  // Manual SMTP test endpoint
  app.get("/api/test-manual-smtp", async (req, res) => {
    try {
      const isWorking = await testManualSMTP();
      res.json({ 
        message: "Manual SMTP test completed",
        isWorking,
        checkConsole: "Check console for detailed logs"
      });
    } catch (error) {
      console.error("Manual SMTP test error:", error);
      res.status(500).json({ message: "Manual SMTP test failed" });
    }
  });

  // Check email verification endpoint
  app.get("/api/check-email-verification", async (req, res) => {
    try {
      const isVerified = await checkEmailVerification();
      res.json({ 
        message: "Email verification check completed",
        isVerified,
        checkConsole: "Check console for detailed logs"
      });
    } catch (error) {
      console.error("Email verification check error:", error);
      res.status(500).json({ message: "Email verification check failed" });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Create a sample booking for testing
      const sampleBooking = {
        id: 999,
        bookingId: "TEST-" + Date.now(),
        userId: 1,
        roomCategoryId: 1,
        guests: 2,
        checkinDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        checkoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        totalAmount: "2700.00",
        paymentStatus: "pending",
        paymentMethod: "pay_at_checkin",
        paymentReference: null,
        guestName: "Test Guest",
        guestEmail: email,
        guestMobile: "9876543210",
        guestAddress: "Test Address, Gujarat",
        status: "confirmed",
        createdAt: new Date(),
        updatedAt: new Date(),
        actualCheckinTime: null,
        actualCheckoutTime: null,
        arrivingFrom: "Test City",
        goingTo: "Test City",
        eta: "10:00 AM",
        etd: "12:00 PM",
        foodBooking: false,
        breakfast: false,
        lunch: false,
        dinner: false,
        foodTotal: "0.00"
      };

      const sampleCategory = {
        id: 1,
        name: "Deluxe Room Premium",
        description: "Spacious deluxe room with modern amenities",
        price: "2700.00",
        totalUnits: 8,
        maxOccupancy: 4,
        bedConfiguration: "3 Single Beds",
        imageUrl: null,
        createdAt: new Date()
      };

      // Send the test email using AWS SES
      const emailSent = await sendBookingConfirmationEmail({
        booking: sampleBooking,
        user: null,
        category: sampleCategory,
        guestName: "Test Guest",
        guestEmail: email
      });

      if (emailSent) {
        res.json({ 
          message: "Test booking confirmation email sent successfully",
          email: email,
          bookingId: sampleBooking.bookingId
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send email - check AWS SES configuration" 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

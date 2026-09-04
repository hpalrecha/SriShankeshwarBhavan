import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, InsufficientAvailabilityError } from "./storage";
import { insertUserSchema, insertRoomBookingSchema, type RoomBooking } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import session from "express-session";
import { sendBookingConfirmationEmail, sendBookingCancellationEmail, sendPasswordResetEmail, sendOTPEmail } from "./email";
import { sendEmailViaSES } from "./emailSES";
import { debugSESConfiguration } from "./debug-email-ses";
import { testDirectSMTP } from "./test-direct-smtp";
import { testSimpleSMTP } from "./test-simple-smtp";
import { checkVerifiedEmails } from "./check-ses-emails";
import { checkDomainCredentials } from "./check-domain-credentials";
import { testAllEmailTemplates } from "./test-all-email-templates";
import { whatsappService } from "./whatsapp";
import { smsService } from "./sms-service";
import { insertWhatsAppConfigSchema, insertWhatsAppTemplateSchema, insertPaymentGatewaySchema } from "@shared/schema";
import { PaymentGatewayFactory, PaymentService } from "./payment-gateways";
import { findUnmatchedRazorpayPayments } from "./payment-reconciliation";
import { createICICIGateway } from "./icici-gateway";
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

const isAdminAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session?.adminId) {
    return res.status(401).json({ message: "Admin authentication required" });
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

// Refunds an online payment when its booking is cancelled. Safe to call on
// any booking - it's a no-op unless the booking was actually paid online and
// hasn't already been refunded, so both cancellation routes can call it
// unconditionally. Never throws: a refund failure must not block the
// cancellation itself, it just leaves the booking flagged "refund_failed" so
// staff can see it in the admin panel and refund manually.
async function refundOnlinePaymentIfApplicable(
  booking: RoomBooking
): Promise<{ attempted: boolean; success?: boolean; error?: string }> {
  if (booking.paymentMethod !== "pay_online" || booking.paymentStatus !== "paid_online") {
    return { attempted: false };
  }

  if (!booking.paymentReference) {
    console.error(`Cannot auto-refund booking ${booking.bookingId}: no payment reference on file`);
    await storage.updateRoomBooking(booking.id, { paymentStatus: "refund_failed" });
    return { attempted: true, success: false, error: "No payment reference on file" };
  }

  try {
    const transactions = await storage.getPaymentTransactionsByBookingId(booking.id);
    // The client-driven /api/payment/verify path marks a transaction
    // "success", but every gateway's webhook handler (Razorpay/ICICI/PayU)
    // marks the same outcome "completed" instead - checking only "success"
    // meant a booking confirmed via webhook could never be matched to its
    // real transaction here, silently falling back to whichever gateway
    // happens to be named "razorpay" even when the actual payment went
    // through ICICI or PayU, and refunding through the wrong gateway.
    const successfulTransaction = transactions.find(t => t.status === "success" || t.status === "completed");
    const gateway = successfulTransaction
      ? await storage.getPaymentGateway(successfulTransaction.gatewayId)
      : await storage.getPaymentGatewayByName("razorpay");

    if (!gateway) {
      throw new Error("Payment gateway configuration not found");
    }

    const paymentGateway = PaymentGatewayFactory.createGateway(gateway);
    await paymentGateway.refundPayment(booking.paymentReference, parseFloat(booking.totalAmount));

    if (successfulTransaction) {
      await storage.updatePaymentTransaction(successfulTransaction.id, { status: "refunded" });
    }
    await storage.updateRoomBooking(booking.id, { paymentStatus: "refunded" });
    console.log(`✅ Refunded ₹${booking.totalAmount} for cancelled booking ${booking.bookingId}`);
    return { attempted: true, success: true };
  } catch (error: any) {
    const message = error?.error?.description || error?.message || "Refund failed";
    console.error(`❌ Auto-refund failed for booking ${booking.bookingId}:`, message);
    await storage.updateRoomBooking(booking.id, { paymentStatus: "refund_failed" });
    return { attempted: true, success: false, error: message };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment debugging
  app.get("/api/health", async (req, res) => {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: false,
      whatsapp: false,
      details: {} as any
    };

    try {
      // Test database connection
      const testQuery = await storage.getWhatsAppConfig();
      health.database = true;
      health.details.database = "Connected successfully";
      
      // Test WhatsApp configuration
      health.whatsapp = !!(testQuery && testQuery.isEnabled);
      health.details.whatsapp = testQuery ? {
        enabled: testQuery.isEnabled,
        hasToken: !!testQuery.accessToken && testQuery.accessToken.length > 50,
        hasPhoneId: !!testQuery.phoneNumberId,
        hasBusinessId: !!testQuery.businessAccountId
      } : "No configuration found";
    } catch (error: any) {
      health.database = false;
      health.details.error = error.message;
      health.status = "error";
    }

    res.json(health);
  });

  // Behind Cloudflare -> nginx -> Express over plain HTTP. Without this,
  // req.secure is false, so express-session silently refuses to send the
  // session cookie when cookie.secure is true, and every login is lost.
  // It also makes req.protocol report https for password-reset links.
  app.set("trust proxy", 1);

  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // same-site app; 'none' needlessly requires cross-site rules
    }
  }));

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, mobile, password } = req.body;

      // Email is now required - it's the primary identifier for OTP and
      // password login, not just an optional contact field.
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();

      const existingByMobile = await storage.getUserByMobile(mobile);
      if (existingByMobile) {
        return res.status(400).json({ message: "Mobile number already registered" });
      }
      // Case-insensitive, matching getUserByEmail - prevents a second
      // account ("Foo@x.com" vs "foo@x.com") that login could never
      // reliably distinguish between.
      const existingByEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingByEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        name,
        email: normalizedEmail,
        mobile,
        password: hashedPassword,
      });

      res.status(201).json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Send OTP endpoint - two explicit, non-overlapping modes. Email is the
  // preferred default; WhatsApp is only ever used when the customer
  // deliberately chooses the "mobile number" option on the login page -
  // there is no automatic fallback from one to the other in either
  // direction. SMS (ComBirds/Edumarc) is intentionally absent from both -
  // it accepts every submission but the operator/DLT layer silently drops
  // delivery afterwards, which made OTPs unusable.
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { method, email, mobile } = req.body;

      if (method === "email") {
        if (!email || typeof email !== "string") {
          return res.status(400).json({ message: "Email is required" });
        }
        const user = await storage.getUserByEmail(email.trim().toLowerCase());
        if (!user) {
          return res.status(404).json({ message: "No account found with this email. Please sign up, or use your mobile number instead." });
        }

        // Some accounts have "+91"-prefixed mobiles stored, others don't (see
        // the WhatsApp-mobile-cleaning path below) - verify-otp always strips
        // "+91" before its lookup, so storing/returning the raw, unstripped
        // user.mobile here made every OTP for a "+91"-prefixed account
        // unfindable at verify time (guaranteed 401). Normalize once here so
        // what's stored, returned to the client, and looked up all agree.
        const userCleanMobile = user.mobile.replace(/^\+91/, '').replace(/\s+/g, '');

        await storage.cleanupExpiredOTPs();
        const recentOTP = await storage.getLatestOTPVerification(userCleanMobile);
        if (recentOTP?.createdAt && Date.now() - new Date(recentOTP.createdAt).getTime() < 60000) {
          return res.status(429).json({ message: "Please wait before requesting another OTP" });
        }

        const otp = smsService.generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        // OTP records are still keyed by mobile - the schema has no email
        // column, and every account already has a mobile number, so this
        // needs no migration. The customer never sees this; verify-otp
        // continues to work exactly as it does for the WhatsApp path.
        await storage.createOTPVerification({ mobile: userCleanMobile, otp, expiresAt, verified: false, attempts: 0 });

        const emailSent = await sendOTPEmail(user.email!, otp);
        if (!emailSent) {
          console.error(`❌ Email OTP send failed for ${user.email}`);
          return res.status(503).json({ message: "We couldn't send a code to that email right now. Please try again, or use your mobile number instead." });
        }

        console.log(`✅ OTP sent to ${userCleanMobile} via email (${user.email}): ${otp}`);
        const [name, domain] = user.email!.split("@");
        const maskedEmail = `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
        return res.json({ message: "OTP sent successfully", mobile: userCleanMobile, channel: "email", maskedEmail, expiresIn: 300 });
      }

      if (method === "whatsapp") {
        if (!mobile) {
          return res.status(400).json({ message: "Mobile number is required" });
        }
        const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
          return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
        }

        await storage.cleanupExpiredOTPs();
        const recentOTP = await storage.getLatestOTPVerification(cleanMobile);
        if (recentOTP?.createdAt && Date.now() - new Date(recentOTP.createdAt).getTime() < 60000) {
          return res.status(429).json({ message: "Please wait before requesting another OTP" });
        }

        const otp = smsService.generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await storage.createOTPVerification({ mobile: cleanMobile, otp, expiresAt, verified: false, attempts: 0 });

        // Sending number is a temporary stand-in ("P91 India"), unrelated to
        // this business, borrowed until the real number's account access is
        // sorted out - see the deploy notes. Fine for an explicitly-chosen
        // alternate channel; would not have been fine as a silent default.
        const whatsappSent = await whatsappService.sendOTP(cleanMobile, otp);
        if (!whatsappSent) {
          console.error(`❌ WhatsApp OTP send failed for ${cleanMobile}`);
          return res.status(503).json({ message: "We couldn't send a WhatsApp code right now. Please try again, or use email / password login instead." });
        }

        console.log(`✅ OTP sent to ${cleanMobile} via WhatsApp: ${otp}`);
        return res.json({ message: "OTP sent successfully", mobile: cleanMobile, channel: "whatsapp", expiresIn: 300 });
      }

      return res.status(400).json({ message: "method must be 'email' or 'whatsapp'" });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP and Login endpoint
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      console.log('OTP verification request:', {
        body: req.body,
        contentType: req.headers['content-type'],
        method: req.method,
        url: req.url
      });
      
      const { mobile, otp } = req.body;

      if (!mobile || !otp) {
        console.log('Missing mobile or OTP:', { mobile, otp, bodyKeys: Object.keys(req.body || {}) });
        return res.status(400).json({ message: "Mobile number and OTP are required" });
      }

      // Clean mobile number
      const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
      
      // Find and validate OTP
      const otpVerification = await storage.getOTPVerification(cleanMobile, otp);
      
      if (!otpVerification) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      // Check attempts limit
      if ((otpVerification.attempts || 0) >= 3) {
        return res.status(401).json({ message: "Too many failed attempts. Please request a new OTP" });
      }

      // Check if OTP is expired
      if (new Date() > new Date(otpVerification.expiresAt)) {
        return res.status(401).json({ message: "OTP has expired. Please request a new one" });
      }

      // Mark OTP as verified
      await storage.markOTPAsVerified(otpVerification.id);

      // Find or create user
      let user = await storage.getUserByMobile(cleanMobile);
      if (!user) {
        // Create new user for first-time mobile users
        const hashedPassword = await bcrypt.hash("mobile-otp-user", 10);
        user = await storage.createUser({
          mobile: cleanMobile,
          name: `User ${cleanMobile}`, // Temporary name, user can update later
          password: hashedPassword,
          email: null // Email is optional now
        });
      }

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).userMobile = user.mobile;

      res.json({ 
        message: "Login successful",
        user: { 
          id: user.id, 
          name: user.name, 
          mobile: user.mobile,
          email: user.email,
          isTrustee: user.isTrustee 
        }
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  // Traditional password login (keep for backward compatibility)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
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
      (req.session as any).userMobile = user.mobile;

      res.json({ 
        message: "Login successful", 
        user: { 
          id: user.id, 
          name: user.name, 
          mobile: user.mobile,
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

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find admin user
      const admin = await storage.getAdminUserByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set admin session
      (req.session as any).adminId = admin.id;
      (req.session as any).adminEmail = admin.email;

      res.json({ 
        message: "Admin login successful", 
        admin: { 
          id: admin.id, 
          name: admin.name, 
          email: admin.email,
          role: admin.role 
        } 
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  // Read-only meal pricing, needed by the public guest booking form to show
  // food option costs before a booking exists - kept ahead of the admin auth
  // gate below so guests aren't blocked from seeing prices. Nothing else
  // here is guest-facing; every other /api/admin/* route requires a session.
  app.get("/api/admin/food-settings", async (req, res) => {
    try {
      const settings = await storage.getFoodSettings();
      res.json(settings || { breakfastPrice: "50", lunchPrice: "100", dinnerPrice: "100" });
    } catch (error) {
      console.error("Error fetching food settings:", error);
      res.status(500).json({ message: "Failed to fetch food settings" });
    }
  });

  // Every /api/admin/* route below this point (except the login route and
  // the public food-settings read above, both registered before this) was
  // reachable by anyone with no session at all - this closes that gap.
  app.use("/api/admin", isAdminAuthenticated);

  // Forgot Password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { mobile } = req.body;

      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      // Find user by mobile number
      const user = await storage.getUserByMobile(mobile);
      if (!user) {
        // Don't reveal if mobile number exists or not for security
        return res.json({ message: "If an account with that mobile number exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save reset token
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send password reset email if user has email
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      console.log(`🔗 Password reset URL for ${user.mobile}: ${resetUrl}`);
      
      if (user.email) {
        const emailSent = await sendPasswordResetEmail(user.email, user.name, resetUrl);
        console.log(`📧 Password reset email sent to ${user.email}: ${emailSent}`);
      } else {
        console.log(`⚠️ No email found for user ${user.mobile}, reset link: ${resetUrl}`);
      }

      res.json({ message: "If an account with that mobile number exists, a password reset link has been sent." });
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
        mobile: user.mobile,
        email: user.email,
        isTrustee: user.isTrustee 
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
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

  // Date-based availability check - the only useful availability endpoint
  app.post("/api/rooms/availability", async (req, res) => {
    try {
      const { checkinDate, checkoutDate } = req.body;
      
      if (!checkinDate || !checkoutDate) {
        return res.status(400).json({ message: "Missing required parameters: checkinDate and checkoutDate" });
      }

      const startDate = new Date(checkinDate);
      const endDate = new Date(checkoutDate);

      if (startDate >= endDate) {
        return res.status(400).json({ message: "Check-out date must be after check-in date" });
      }

      // This endpoint is also used by the admin inventory panel, which
      // needs the TRUE physical count (staff can still book a trustee into
      // a trustee-reserved date) - so unlike the guest-facing
      // /api/rooms/availability GET, this doesn't zero out availableRooms.
      // It just flags the date as trustee-reserved so the admin UI can show
      // why a guest search for the same dates comes back empty.
      const trusteeReservedDates = await storage.getTrusteeReservedDatesEnabled();
      const bookingDates: string[] = [];
      for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        bookingDates.push(d.toISOString().split('T')[0]);
      }
      const trusteeOnly = bookingDates.some(bd =>
        trusteeReservedDates.some(rd => new Date(rd.reservedDate).toISOString().split('T')[0] === bd)
      );

      const categories = await storage.getRoomCategories();
      const availability: Record<number, { available: number; booked: number; trusteeOnly: boolean }> = {};

      for (const category of categories) {
        // Get overlapping bookings for this category and date range
        const overlappingBookings = await storage.getBookingsByDateRange(startDate, endDate);

        // Filter bookings for this specific room category
        const categoryBookings = overlappingBookings.filter(booking =>
          booking.roomCategoryId === category.id
        );

        // Calculate total rooms booked (not just number of bookings)
        const totalRoomsBooked = categoryBookings.reduce((sum, booking) => {
          return sum + (booking.roomsBooked || 1);
        }, 0);

        const availableRooms = Math.max(0, category.totalUnits - totalRoomsBooked);

        availability[category.id] = {
          available: availableRooms,
          booked: totalRoomsBooked,
          trusteeOnly
        };
      }

      res.json(availability);
    } catch (error) {
      console.error("Error checking date-based availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
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

      // Get bookings that overlap with the date range for this room category
      const bookings = await storage.getBookingsByDateRange(startDate, endDate);
      const categoryBookings = bookings.filter(booking => 
        booking.roomCategoryId === categoryId
      );



      // Get room category to check total units and capacity
      const category = await storage.getRoomCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      // Calculate total rooms booked (not just number of bookings)
      const totalRoomsBooked = categoryBookings.reduce((sum, booking) => {
        return sum + (booking.roomsBooked || 1);
      }, 0);
      
      // Check for trustee reserved dates that would make rooms unavailable to non-trustees
      let availableUnits = category.totalUnits - totalRoomsBooked;
      const roomsNeeded = Math.ceil(guestCount / category.maxOccupancy);
      
      // Check if any dates in the booking range are trustee-reserved
      const trusteeReservedDates = await storage.getTrusteeReservedDatesEnabled();
      const bookingDates = [];
      for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
        bookingDates.push(new Date(date));
      }
      
      const hasTrusteeReservedDates = bookingDates.some(bookingDate => {
        const bookingDateString = bookingDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        return trusteeReservedDates.some(rd => {
          const reservedDateString = new Date(rd.reservedDate).toISOString().split('T')[0];
          return reservedDateString === bookingDateString;
        });
      });
      
      // If there are trustee reserved dates, mark as unavailable for non-trustees
      if (hasTrusteeReservedDates) {
        // For non-trustees, rooms are effectively unavailable on these dates
        availableUnits = 0;
      }

      res.json({
        available: availableUnits >= roomsNeeded,
        availableUnits,
        totalUnits: category.totalUnits,
        category,
        roomsNeeded,
        guestsPerRoom: category.maxOccupancy,
        canAccommodateGuests: availableUnits >= roomsNeeded,
        // Lets the client show "reserved for trustees" instead of a generic
        // "no rooms available" - without this, a genuinely full date and a
        // deliberately trustee-only date look identical to the guest.
        trusteeOnly: hasTrusteeReservedDates
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

      // Validate booking dates are within 12 months from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxBookingDate = new Date();
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 1);
      maxBookingDate.setHours(23, 59, 59, 999);
      
      const checkinDateCheck = new Date(bookingData.checkinDate);
      const checkoutDateCheck = new Date(bookingData.checkoutDate);
      
      if (checkinDateCheck > maxBookingDate || checkoutDateCheck > maxBookingDate) {
        return res.status(400).json({
          message: "Booking dates cannot be more than 12 months from today. Please select dates within the next 12 months."
        });
      }

      if (checkoutDateCheck <= checkinDateCheck) {
        return res.status(400).json({
          message: "Check-out date must be after the check-in date."
        });
      }

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
      const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Extra beds are a guest/stay-level thing, not per room-category
      // selection - attached to just the first booking created below so a
      // multi-room-type booking doesn't duplicate the charge across rows.
      const extraBedsRequested = bookingData.extraBeds || 0;
      let extraBedAmount = 0;
      if (extraBedsRequested > 0) {
        const extraBedInventory = await storage.getExtraBedInventory();
        const totalBedInventory = extraBedInventory?.totalInventory || 50;
        const pricePerBed = extraBedInventory ? parseFloat(extraBedInventory.pricePerBed) : 200;
        const reservedBeds = await storage.getExtraBedsReservedForDateRange(
          bookingData.checkinDate,
          bookingData.checkoutDate
        );
        const availableBeds = Math.max(0, totalBedInventory - reservedBeds);
        if (extraBedsRequested > availableBeds) {
          return res.status(400).json({
            message: `Only ${availableBeds} extra bed${availableBeds === 1 ? '' : 's'} available for these dates. Please reduce the number of extra beds.`,
            availableBeds,
            requestedExtraBeds: extraBedsRequested
          });
        }
        extraBedAmount = extraBedsRequested * pricePerBed * nights;
        totalAmount += extraBedAmount;
      }
      let extraBedsAssigned = false;

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

          // Extra beds ride on the first booking row created, not repeated
          // for every room-category selection.
          const assignExtraBeds = !extraBedsAssigned && extraBedsRequested > 0;
          if (assignExtraBeds) extraBedsAssigned = true;

          // Generate booking ID for each room type
          const bookingId = `SSH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

          const booking = await storage.createRoomBooking({
            userId: user.id,
            bookingId,
            roomCategoryId: selection.categoryId,
            // Drizzle's timestamp column mapper calls value.toISOString() -
            // passing the raw date string through (unlike the guest booking
            // route, which already converts) crashed every admin-created
            // booking with "value.toISOString is not a function".
            checkinDate: new Date(bookingData.checkinDate),
            checkoutDate: new Date(bookingData.checkoutDate),
            guests: bookingData.guests,
            roomsBooked: selection.quantity,
            totalAmount: (assignExtraBeds ? selectionAmount + extraBedAmount : selectionAmount).toString(),
            extraBeds: assignExtraBeds ? extraBedsRequested : 0,
            extraBedAmount: assignExtraBeds ? extraBedAmount.toString() : "0",
            paymentMethod: bookingData.paymentMethod || "cash",
            // Cash is always collected on the spot, so it's paid by
            // definition. Any other method (UPI/card/bank transfer) is also
            // paid once the admin has a reference for it - e.g. reconciling
            // an already-completed Razorpay payment that never got matched
            // to a booking automatically. Only a genuinely unconfirmed entry
            // (no reference given) is left "pending".
            paymentStatus: (bookingData.paymentMethod === "cash" || bookingData.paymentReference) ? "paid" : "pending",
            status: bookingData.status || "confirmed",
            paymentReference: bookingData.paymentReference,
          });

          createdBookings.push(booking);
          
          // Send notifications asynchronously for better performance
          setImmediate(async () => {
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

            // Send booking confirmation WhatsApp notification for each booking
            try {
              await whatsappService.sendBookingConfirmation(booking, user, roomCategory);
            } catch (error) {
              console.error(`Error sending booking confirmation WhatsApp for ${booking.bookingId}:`, error);
            }
          });
        }
      }

      res.json({ 
        bookings: createdBookings, 
        user,
        totalAmount,
        totalRooms,
        message: `Created ${createdBookings.length} bookings for ${totalRooms} rooms`
      });
    } catch (error: any) {
      console.error("Error creating combination booking:", error);
      // A concurrent booking took the last room(s) for one of the selected
      // categories between the capacity check above and the actual insert.
      // Note: if this is the second or later room-type selection in a
      // multi-room-type admin booking, any earlier selections in this same
      // request have already been committed as separate bookings - this
      // isn't a fully atomic multi-room booking (a pre-existing property of
      // this route, not something this check changes).
      if (error instanceof InsufficientAvailabilityError) {
        return res.status(409).json({ message: error.message });
      }
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

      // Validate booking dates are within 12 months from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxBookingDate = new Date();
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 1);
      maxBookingDate.setHours(23, 59, 59, 999);
      
      const checkinDateCheck = new Date(bookingData.checkinDate);
      const checkoutDateCheck = new Date(bookingData.checkoutDate);
      
      if (checkinDateCheck > maxBookingDate || checkoutDateCheck > maxBookingDate) {
        return res.status(400).json({
          message: "Booking dates cannot be more than 12 months from today. Please select dates within the next 12 months."
        });
      }

      if (checkoutDateCheck <= checkinDateCheck) {
        return res.status(400).json({
          message: "Check-out date must be after the check-in date."
        });
      }

      // Get room category to check capacity
      const category = await storage.getRoomCategory(bookingData.roomCategoryId);
      if (!category) {
        return res.status(404).json({ message: "Room category not found" });
      }

      // Check if user exists (by mobile, then by email) or create a new one.
      // Moved ahead of the trustee-reserved-dates check below so that check
      // can use the real, stored isTrustee value instead of trusting
      // whatever the client claims about itself in the request body.
      //
      // Mobile alone isn't enough: a guest typing their number in a
      // different format than what's on file (leading zero, missing "+91")
      // won't match an existing account by mobile, and createUser then
      // crashes on the database's email-uniqueness constraint instead of a
      // clean error - this was surfacing as an opaque "Booking Failed" for
      // returning guests with a real, already-registered email.
      let user = await storage.getUserByMobile(userData.mobile);
      if (!user && userData.email) {
        user = await storage.getUserByEmail(userData.email);
      }
      let isNewUser = false;
      if (!user) {
        try {
          // Create user with a default password for guest bookings. A guest
          // registering themselves through this public endpoint can never
          // grant themselves trustee status - that's only ever set via the
          // admin panel - regardless of what isTrustee value they send.
          const hashedPassword = await bcrypt.hash("guest123", 10);
          user = await storage.createUser({
            ...userData,
            isTrustee: false,
            password: hashedPassword,
          });
          isNewUser = true;
        } catch (createUserError: any) {
          // Last-resort fallback for a genuine mobile/email collision this
          // lookup didn't catch (e.g. a format neither check matched) -
          // re-fetch the existing account instead of crashing the booking.
          if (createUserError?.code === "23505") {
            user = (userData.email && await storage.getUserByEmail(userData.email))
              || await storage.getUserByMobile(userData.mobile);
          }
          if (!user) throw createUserError;
        }
      }

      // Check for trustee reserved dates
      const trusteeReservedDates = await storage.getTrusteeReservedDatesEnabled();
      const bookingCheckinDate = new Date(bookingData.checkinDate);
      const bookingCheckoutDate = new Date(bookingData.checkoutDate);

      // Check each day in the booking range against trustee reserved dates
      const bookingDates = [];
      for (let date = new Date(bookingCheckinDate); date < bookingCheckoutDate; date.setDate(date.getDate() + 1)) {
        bookingDates.push(new Date(date));
      }

      const conflictingDates = [];
      for (const bookingDate of bookingDates) {
        const bookingDateString = bookingDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const isReservedDate = trusteeReservedDates.some(rd => {
          const reservedDateString = new Date(rd.reservedDate).toISOString().split('T')[0];
          return reservedDateString === bookingDateString;
        });

        if (isReservedDate) {
          // Only allow trustees to book on reserved dates - the real,
          // stored status on the looked-up/created account above, never the
          // client-supplied claim in the request body.
          if (!user.isTrustee) {
            conflictingDates.push({
              date: bookingDate.toDateString(),
              reservedDate: bookingDateString
            });
          }
        }
      }

      if (conflictingDates.length > 0) {
        return res.status(400).json({
          message: `Booking not allowed on trustee reserved dates: ${conflictingDates.map(d => d.date).join(', ')}. These dates are reserved exclusively for trustees.`,
          conflictingDates: conflictingDates,
          trusteeOnly: true
        });
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

      // Validate that rooms booked don't exceed number of guests
      if (bookingData.guests && roomsBooked > bookingData.guests) {
        return res.status(400).json({ 
          message: `Cannot book more rooms than guests. You have ${bookingData.guests} guest${bookingData.guests === 1 ? '' : 's'} but are trying to book ${roomsBooked} room${roomsBooked === 1 ? '' : 's'}. Maximum rooms you can book: ${bookingData.guests}.`,
          maxRoomsAllowed: bookingData.guests,
          roomsRequested: roomsBooked,
          totalGuests: bookingData.guests
        });
      }

      // Validate extra beds
      const extraBedsRequested = bookingData.extraBeds || 0;
      if (extraBedsRequested > 0) {
        // Check per-room max extra beds
        const maxExtraBedsPerRoom = category.extraBedMax || 0;
        const maxExtraBeds = maxExtraBedsPerRoom * roomsBooked;
        
        if (extraBedsRequested > maxExtraBeds) {
          return res.status(400).json({ 
            message: `Maximum ${maxExtraBedsPerRoom} extra bed${maxExtraBedsPerRoom === 1 ? '' : 's'} allowed per ${category.name}. You can book up to ${maxExtraBeds} extra beds for ${roomsBooked} room${roomsBooked === 1 ? '' : 's'}.`,
            maxExtraBedsPerRoom,
            maxExtraBeds,
            requestedExtraBeds: extraBedsRequested
          });
        }
        
        // Check global inventory availability
        const inventory = await storage.getExtraBedInventory();
        const totalInventory = inventory?.totalInventory || 50;
        const reservedBeds = await storage.getExtraBedsReservedForDateRange(
          bookingData.checkinDate,
          bookingData.checkoutDate
        );
        const availableBeds = Math.max(0, totalInventory - reservedBeds);
        
        if (extraBedsRequested > availableBeds) {
          return res.status(400).json({ 
            message: `Only ${availableBeds} extra bed${availableBeds === 1 ? '' : 's'} available for your selected dates. Please reduce the number of extra beds.`,
            availableBeds,
            requestedExtraBeds: extraBedsRequested
          });
        }
      }

      // Generate booking ID
      const bookingId = `SSH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const checkinDate = new Date(bookingData.checkinDate);
      const checkoutDate = new Date(bookingData.checkoutDate);
      const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));
      const roomAmount = parseFloat(category.price) * nights * roomsBooked;
      
      // Calculate food amount
      const foodSettings = await storage.getFoodSettings();
      const breakfastPrice = foodSettings ? parseFloat(foodSettings.breakfastPrice) : 50;
      const lunchPrice = foodSettings ? parseFloat(foodSettings.lunchPrice) : 100;
      const dinnerPrice = foodSettings ? parseFloat(foodSettings.dinnerPrice) : 100;
      
      const foodAmount = (bookingData.breakfastDays || 0) * breakfastPrice + 
                        (bookingData.lunchDays || 0) * lunchPrice + 
                        (bookingData.dinnerDays || 0) * dinnerPrice;
      
      // Calculate extra bed amount
      const extraBedInventory = await storage.getExtraBedInventory();
      const extraBedPricePerNight = extraBedInventory ? parseFloat(extraBedInventory.pricePerBed) : 200;
      const extraBedAmount = (bookingData.extraBeds || 0) * extraBedPricePerNight * nights;
      
      const totalAmount = roomAmount + foodAmount + extraBedAmount;

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
        extraBeds: bookingData.extraBeds || 0,
        extraBedAmount: extraBedAmount.toString(),
      });

      // Send notifications asynchronously (fire-and-forget for better performance).
      // Skipped when this booking is awaiting online payment - it isn't actually
      // confirmed yet, and telling the guest otherwise before money has moved
      // would be wrong. /api/payment/verify sends this same notification once
      // payment is genuinely confirmed.
      const awaitingOnlinePayment = booking.paymentMethod === "pay_online" && booking.paymentStatus === "unpaid";
      if (!awaitingOnlinePayment) {
        setImmediate(async () => {
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

          // Send booking confirmation WhatsApp notification
          console.log(`🚀 ATTEMPTING WhatsApp notification for booking: ${booking.bookingId}`);
          console.log(`📞 Phone number from booking: ${booking.primaryGuestPhone}`);
          console.log(`📞 Phone number from user: ${user?.mobile || 'N/A'}`);

          try {
            const whatsappResult = await whatsappService.sendBookingConfirmation(booking, user, category);
            console.log(`📱 WhatsApp booking confirmation result: ${whatsappResult}`);
            if (whatsappResult) {
              console.log(`✅ SUCCESS: WhatsApp message sent for booking ${booking.bookingId}`);
            } else {
              console.log(`❌ FAILED: WhatsApp message not sent for booking ${booking.bookingId}`);
            }
          } catch (error) {
            console.error("❌ Error sending booking confirmation WhatsApp:", error);
            console.error("❌ Full error details:", JSON.stringify(error, null, 2));
          }
        });
      }

      // Auto-login users asynchronously for better performance
      if (req.session) {
        (req.session as any).userId = user.id;
        // Save session asynchronously
        setImmediate(() => {
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session:", err);
            } else {
              console.log(`🔐 Auto-logged in user: ${user.id} with session: ${req.session.id}`);
            }
          });
        });
      }

      res.json({
        booking,
        user,
        bookingId,
        autoLoggedIn: isNewUser || true, // Always return true to indicate login attempt
        defaultPassword: isNewUser ? "guest123" : undefined
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      // A ZodError here means the guest's own input didn't pass validation
      // (e.g. an empty required field) - that's a 400 the guest can act on,
      // not a generic 500 "try again" that hides what's actually wrong and
      // makes this unreportable from the outside.
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.issues[0]?.message || "Invalid booking details",
          issues: error.issues,
        });
      }
      // A concurrent booking took the last room(s) between this request's
      // earlier capacity check and the actual insert.
      if (error instanceof InsufficientAvailabilityError) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error?.message || "Failed to create booking" });
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

      // Atomic: only succeeds if this request is the one that actually
      // flips confirmed -> cancelled. A double-click or client retry that
      // loses this race gets told "cannot be cancelled" (it's already
      // cancelled) instead of also triggering its own refund attempt - see
      // cancelRoomBookingIfConfirmed for why a plain read-then-write here
      // isn't safe.
      const cancelledBooking = await storage.cancelRoomBookingIfConfirmed(bookingId);
      if (!cancelledBooking) {
        return res.status(400).json({ message: "Booking cannot be cancelled" });
      }

      // Refund first, so the email/WhatsApp below can report the real outcome
      // instead of promising a refund that hasn't happened yet.
      const refundResult = await refundOnlinePaymentIfApplicable(booking);

      // Send booking cancellation email and WhatsApp notification
      try {
        const category = await storage.getRoomCategory(booking.roomCategoryId);
        const user = await storage.getUser(booking.userId);
        if (category) {
          // Send cancellation email
          await sendBookingCancellationEmail({
            booking: { ...booking, status: "cancelled" },
            user,
            category,
          });

          // Send cancellation WhatsApp notification
          try {
            await whatsappService.sendBookingCancellation(booking, user || null, category);
            console.log(`📱 WhatsApp cancellation notification sent for booking: ${booking.bookingId}`);
          } catch (whatsappError) {
            console.error("❌ Error sending WhatsApp cancellation notification:", whatsappError);
          }
        }
      } catch (error) {
        console.error("Error sending booking cancellation notifications:", error);
      }

      res.json({
        message: "Booking cancelled successfully",
        refund: refundResult.attempted
          ? (refundResult.success
              ? { status: "refunded" }
              : { status: "refund_failed", error: refundResult.error })
          : undefined,
      });
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

      // Get all bookings created today (regardless of check-in date)
      const allBookings = await storage.getRoomBookings();
      const bookingsCreatedToday = allBookings.filter(booking => {
        const createdDate = booking.createdAt ? new Date(booking.createdAt) : new Date();
        // Use toDateString() to compare just the date part
        return createdDate.toDateString() === today.toDateString();
      });

      // Get bookings checking in today (active only)
      const todaysCheckins = await storage.getBookingsByDateRange(today, tomorrow);
      const checkedInToday = todaysCheckins.filter(b => b.status === "checked_in").length;

      // Total arrivals/departures scheduled for today, regardless of whether
      // front desk has actually processed them yet - "Checked In" above only
      // counts guests already marked in, so a guest arriving later today with
      // nobody checked out yet was invisible on the dashboard until now.
      const arrivalsToday = allBookings.filter(b => {
        const checkin = new Date(b.checkinDate);
        return checkin.toDateString() === today.toDateString() && b.status !== "cancelled";
      }).length;
      const departuresToday = allBookings.filter(b => {
        const checkout = new Date(b.checkoutDate);
        return checkout.toDateString() === today.toDateString() && b.status !== "cancelled";
      }).length;

      // Calculate revenue from today's created bookings that are paid.
      // "paid" alone is a legacy status string current code never sets -
      // online payments write "paid_online" and cash ones "paid_checkin" -
      // so this undercounted (usually to zero) regardless of real revenue.
      const paidStatuses = new Set(["paid", "paid_online", "paid_checkin"]);
      const todaysRevenue = bookingsCreatedToday
        .filter(b => paidStatuses.has(b.paymentStatus) && b.status !== "cancelled")
        .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

      // Calculate occupancy rate based on rooms actually occupied today
      const categories = await storage.getRoomCategories();
      const totalRooms = categories.reduce((sum, cat) => sum + cat.totalUnits, 0);
      const occupiedRooms = todaysCheckins.filter(b => b.status === "checked_in").length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      res.json({
        todayBookings: bookingsCreatedToday.length,
        checkedIn: checkedInToday,
        arrivalsToday,
        departuresToday,
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30; // Show 30 per page by default
      const offset = (page - 1) * limit;
      const filters = {
        search: (req.query.search as string) || undefined,
        checkinFrom: (req.query.checkinFrom as string) || undefined,
        checkinTo: (req.query.checkinTo as string) || undefined,
      };

      const bookings = await storage.getRecentBookings(limit, offset, filters);
      const totalBookings = await storage.getTotalBookingsCount(filters);
      
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          const user = await storage.getUser(booking.userId);
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          return { booking, user, category };
        })
      );
      
      const totalPages = Math.ceil(totalBookings / limit);
      
      res.json({
        bookings: bookingsWithDetails,
        pagination: {
          page: page,
          limit: limit,
          total: totalBookings,
          totalPages: totalPages,
          hasMore: offset + bookings.length < totalBookings
        }
      });
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
  // Trustee auto-booking routes - REMOVED per user request
  // app.get("/api/admin/trustee-auto-bookings", async (req, res) => {
  //   try {
  //     const { year, month } = req.query;
  //     if (!year || !month) {
  //       return res.status(400).json({ message: "Year and month are required" });
  //     }
      
  //     const autoBookings = await storage.getTrusteeAutoBookingsByMonth(
  //       parseInt(year as string), 
  //       parseInt(month as string)
  //     );
  //     res.json(autoBookings);
  //   } catch (error) {
  //     console.error("Error fetching trustee auto-bookings:", error);
  //     res.status(500).json({ message: "Failed to fetch trustee auto-bookings" });
  //   }
  // });

  // app.post("/api/admin/trustee-auto-bookings", async (req, res) => {
  //   try {
  //     const { year, month, dates, roomCategoryId } = req.body;
      
  //     const autoBooking = await storage.createTrusteeAutoBooking({
  //       trusteeId: 1, // This should be the actual trustee ID from request
  //       bookingDate: new Date(year, month - 1, dates[0]), // Use first date as primary
  //     });
      
  //     res.status(201).json(autoBooking);
  //   } catch (error) {
  //     console.error("Error creating trustee auto-booking:", error);
  //     res.status(500).json({ message: "Failed to create trustee auto-booking" });
  //   }
  // });

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
              ? userBookings.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))[0].createdAt
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
      
      // Get the original booking before updating
      const originalBooking = await storage.getRoomBooking(id);
      if (!originalBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Add actual check-in/out times based on status
      if (updates.status === "checked_in" && !updates.actualCheckinTime) {
        updates.actualCheckinTime = new Date();
      }
      if (updates.status === "checked_out" && !updates.actualCheckoutTime) {
        updates.actualCheckoutTime = new Date();
      }

      // Same class of bug as the admin combination-booking route: Drizzle's
      // timestamp mapper calls value.toISOString(), which crashes on a raw
      // string. Defensive here since this route accepts arbitrary updates.
      for (const dateField of ["checkinDate", "checkoutDate", "estimatedArrivalTime", "estimatedDepartureTime", "actualCheckinTime", "actualCheckoutTime"] as const) {
        if (updates[dateField] && typeof updates[dateField] === "string") {
          updates[dateField] = new Date(updates[dateField]);
        }
      }

      let updatedBooking: RoomBooking;
      // Cancelling is split out from a plain field update: the status
      // transition has to be atomic (only one concurrent request can be the
      // one that actually cancels a still-active booking), so whether a
      // refund is owed is decided by whether THIS request won that
      // transition (cancelledByThisRequest below) - not by re-checking the
      // stale originalBooking.status read at the top of this handler, which
      // two concurrent requests would both still see as "not cancelled yet".
      const isCancelling = updates.status === "cancelled";
      let cancelledByThisRequest = false;
      if (isCancelling) {
        const { status: _status, ...otherUpdates } = updates;
        const cancelledBooking = await storage.cancelRoomBookingIfNotCancelled(id);
        cancelledByThisRequest = !!cancelledBooking;
        updatedBooking = Object.keys(otherUpdates).length > 0
          ? await storage.updateRoomBooking(id, otherUpdates)
          : (cancelledBooking || originalBooking);
      } else {
        updatedBooking = await storage.updateRoomBooking(id, updates);
      }

      // Only refund/notify if this request is the one that actually
      // cancelled the booking, not a loser of the race above (which means
      // it was already cancelled by someone else).
      if (cancelledByThisRequest) {
        // originalBooking still has the pre-cancel paymentStatus/paymentReference
        // needed to decide whether a refund is owed; the status update above
        // doesn't touch those fields.
        const refundResult = await refundOnlinePaymentIfApplicable(originalBooking);
        if (refundResult.attempted) {
          updatedBooking = await storage.getRoomBooking(id) || updatedBooking;
        }

        console.log(`📱 Admin cancelled booking ${originalBooking.bookingId}, sending notifications asynchronously...`);

        // Send all cancellation notifications asynchronously (fire-and-forget)
        setImmediate(async () => {
          try {
            const category = await storage.getRoomCategory(originalBooking.roomCategoryId);
            const user = await storage.getUser(originalBooking.userId);
            
            if (category) {
              // Send cancellation email asynchronously
              try {
                await sendBookingCancellationEmail({
                  booking: { ...originalBooking, status: "cancelled" },
                  user,
                  category,
                });
                console.log(`✅ Cancellation email sent for booking: ${originalBooking.bookingId}`);
              } catch (emailError) {
                console.error("❌ Error sending cancellation email:", emailError);
              }

              // Send cancellation WhatsApp notification asynchronously
              try {
                await whatsappService.sendBookingCancellation(originalBooking, user || null, category);
                console.log(`✅ WhatsApp cancellation notification sent for booking: ${originalBooking.bookingId}`);
              } catch (whatsappError) {
                console.error("❌ Error sending WhatsApp cancellation notification:", whatsappError);
              }
            }
          } catch (notificationError) {
            console.error("Error processing booking cancellation notifications:", notificationError);
          }
        });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Food Settings Routes
  // GET is registered earlier (public, before the admin auth gate) since
  // the guest booking form needs meal prices too.
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

  // Extra Bed Inventory Routes
  app.get("/api/admin/extra-bed-inventory", async (req, res) => {
    try {
      const inventory = await storage.getExtraBedInventory();
      const bedsInUse = await storage.getExtraBedsReservedForDateRange(
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 86400000).toISOString().split('T')[0]
      );
      
      // Transform to frontend expected field names
      res.json({
        id: inventory?.id || 1,
        totalBeds: inventory?.totalInventory || 50,
        bedsInUse: bedsInUse || 0,
        pricePerNight: inventory?.pricePerBed || "200",
        lastUpdated: inventory?.updatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching extra bed inventory:", error);
      res.status(500).json({ message: "Failed to fetch extra bed inventory" });
    }
  });

  app.patch("/api/admin/extra-bed-inventory", async (req, res) => {
    try {
      const { totalBeds, pricePerNight } = req.body;
      
      // Map frontend field names to database field names
      const updates: any = {};
      if (totalBeds !== undefined) updates.totalInventory = totalBeds;
      if (pricePerNight !== undefined) updates.pricePerBed = pricePerNight;
      
      const updatedInventory = await storage.updateExtraBedInventory(updates);
      
      // Return in frontend expected format
      res.json({
        id: updatedInventory.id,
        totalBeds: updatedInventory.totalInventory,
        bedsInUse: 0,
        pricePerNight: updatedInventory.pricePerBed,
        lastUpdated: updatedInventory.updatedAt
      });
    } catch (error) {
      console.error("Error updating extra bed inventory:", error);
      res.status(500).json({ message: "Failed to update extra bed inventory" });
    }
  });

  // Get available extra beds for a date range (for booking form)
  app.get("/api/extra-beds/availability", async (req, res) => {
    try {
      const { checkinDate, checkoutDate } = req.query;
      if (!checkinDate || !checkoutDate) {
        return res.status(400).json({ message: "Check-in and check-out dates are required" });
      }
      
      const inventory = await storage.getExtraBedInventory();
      const totalInventory = inventory?.totalInventory || 50;
      const pricePerBed = inventory?.pricePerBed || "200";
      
      const reservedBeds = await storage.getExtraBedsReservedForDateRange(
        checkinDate as string, 
        checkoutDate as string
      );
      
      const availableBeds = Math.max(0, totalInventory - reservedBeds);
      
      res.json({ 
        totalInventory,
        reservedBeds,
        availableBeds,
        pricePerBed
      });
    } catch (error) {
      console.error("Error checking extra bed availability:", error);
      res.status(500).json({ message: "Failed to check extra bed availability" });
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

  // Auto-booking trigger - REMOVED per user request
  // app.post("/api/trustees/auto-booking", async (req, res) => {
  //   try {
  //     // This would typically be triggered by a cron job
  //     const trustees = await storage.getTrustees();
  //     const results = [];

  //     for (const trustee of trustees) {
  //       if (trustee.trusteeStatus === "active" && trustee.trusteeAutoBookDates && trustee.trusteeRoomCategoryId) {
  //         const autoBooking = await storage.createTrusteeAutoBooking({
  //           trusteeId: trustee.id,
  //           bookingDate: new Date(), // This would be calculated based on auto-book dates
  //           optOutStatus: "pending",
  //         });
  //         results.push(autoBooking);
  //       }
  //     }

  //     res.json({ message: "Auto-booking triggered", results });
  //   } catch (error) {
  //     console.error("Error triggering auto-booking:", error);
  //     res.status(500).json({ message: "Failed to trigger auto-booking" });
  //   }
  // });

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
        webhookVerifyToken: config.webhookVerifyToken || undefined,
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

  // WhatsApp Notification Recipients Routes
  app.get("/api/whatsapp/recipients", async (req, res) => {
    try {
      const recipients = await storage.getWhatsAppNotificationRecipients();
      res.json(recipients);
    } catch (error: any) {
      console.error("Error fetching WhatsApp notification recipients:", error);
      res.status(500).json({ error: error.message || "Failed to fetch recipients" });
    }
  });

  app.post("/api/whatsapp/recipients", async (req, res) => {
    try {
      const recipient = await storage.createWhatsAppNotificationRecipient(req.body);
      res.json(recipient);
    } catch (error: any) {
      console.error("Error creating WhatsApp notification recipient:", error);
      res.status(500).json({ error: error.message || "Failed to create recipient" });
    }
  });

  app.put("/api/whatsapp/recipients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recipient = await storage.updateWhatsAppNotificationRecipient(id, req.body);
      res.json(recipient);
    } catch (error: any) {
      console.error("Error updating WhatsApp notification recipient:", error);
      res.status(500).json({ error: error.message || "Failed to update recipient" });
    }
  });

  app.delete("/api/whatsapp/recipients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhatsAppNotificationRecipient(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting WhatsApp notification recipient:", error);
      res.status(500).json({ error: error.message || "Failed to delete recipient" });
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

  // Debug WhatsApp Status Route
  app.get("/api/debug/whatsapp-status", async (req, res) => {
    try {
      const config = whatsappService.getConfig();
      
      res.json({
        configExists: !!config,
        configEnabled: config?.isEnabled || false,
        configHasCredentials: !!(config?.accessToken && config?.phoneNumberId && config?.businessAccountId),
        databaseConfigOnly: true,
        hardcodedEnvVarsRemoved: true,
        isConfigured: whatsappService.isConfigured(),
        nodeEnv: process.env.NODE_ENV || 'development'
      });
    } catch (error: any) {
      console.error("Error checking WhatsApp status:", error);
      res.status(500).json({ 
        error: "Failed to check WhatsApp status: " + error.message 
      });
    }
  });

  // Fetch WhatsApp templates from Meta
  app.get("/api/debug/whatsapp-templates", async (req, res) => {
    try {
      const templates = await whatsappService.fetchTemplatesFromMeta();
      res.json({
        success: true,
        templates: templates.map(t => ({
          name: t.name,
          status: t.status,
          language: t.language,
          components: t.components
        }))
      });
    } catch (error: any) {
      console.error("Error fetching WhatsApp templates:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to fetch templates" 
      });
    }
  });

  // Send test daily room report
  app.post("/api/test-daily-report", async (req, res) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const recipients = await storage.getActiveWhatsAppNotificationRecipients('daily_report');
      
      let successCount = 0;
      for (const recipient of recipients) {
        const success = await whatsappService.sendDailyRoomReport(
          recipient.phoneNumber,
          7,     // totalRoomsBooked
          8,     // totalRoomsAvailable  
          14,    // totalGuests
          dateStr // targetDate
        );
        
        if (success) successCount++;
      }
      
      res.json({ 
        success: true, 
        message: `Daily report sent to ${successCount}/${recipients.length} recipients`,
        recipients: recipients.length
      });
    } catch (error: any) {
      console.error("Test daily report error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Internal server error" 
      });
    }
  });

  // Send test sold out alert
  app.post("/api/test-sold-out", async (req, res) => {
    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = today.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      const recipients = await storage.getActiveWhatsAppNotificationRecipients('sold_out_alert');
      
      let successCount = 0;
      for (const recipient of recipients) {
        const success = await whatsappService.sendSoldOutAlert(
          recipient.phoneNumber,
          dateStr // targetDate
        );
        
        if (success) successCount++;
      }
      
      res.json({ 
        success: true, 
        message: `Sold out alert sent to ${successCount}/${recipients.length} recipients`,
        recipients: recipients.length
      });
    } catch (error: any) {
      console.error("Test sold out alert error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Internal server error" 
      });
    }
  });

  // Test route to manually trigger WhatsApp for last booking
  app.post("/api/debug/test-whatsapp-booking", async (req, res) => {
    try {
      console.log('🧪 MANUAL WhatsApp test triggered for phone:', req.body.phoneOverride || 'latest booking');
      
      // Get the most recent booking
      const recentBookings = await storage.getRecentBookings(1);
      if (recentBookings.length === 0) {
        return res.json({ success: false, message: 'No bookings found to test' });
      }
      
      const booking = recentBookings[0];
      console.log('📋 Testing with booking:', booking.bookingId);
      
      // Override phone number if provided (create a modified booking object)
      let testBooking = { ...booking };
      if (req.body.phoneOverride) {
        testBooking.primaryGuestPhone = req.body.phoneOverride;
        console.log('📞 Using override phone:', req.body.phoneOverride);
      }
      
      // Get user and category
      const user = await storage.getUser(booking.userId);
      const category = await storage.getRoomCategory(booking.roomCategoryId);
      
      if (!category) {
        return res.json({ success: false, message: 'Category not found' });
      }
      
      console.log('📞 Phone from booking:', testBooking.primaryGuestPhone);
      console.log('📞 Phone from user:', user?.mobile);
      
      // Test WhatsApp notification
      console.log('🚀 ATTEMPTING WhatsApp notification for test booking');
      const result = await whatsappService.sendBookingConfirmation(testBooking, user || null, category);
      console.log('📱 WhatsApp test result:', result);
      
      res.json({ 
        success: result, 
        bookingId: testBooking.bookingId,
        phoneUsed: testBooking.primaryGuestPhone || user?.mobile,
        message: result ? 'WhatsApp sent successfully' : 'WhatsApp failed to send'
      });
    } catch (error: any) {
      console.error('❌ WhatsApp test error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Manual SMTP test endpoint
  app.get("/api/test-manual-smtp", async (req, res) => {
    try {
      const isWorking = await testSimpleSMTP();
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
        extraBedMax: 2,
        createdAt: new Date()
      };

      // Send the test email using AWS SES
      const emailSent = await sendBookingConfirmationEmail({
        booking: sampleBooking as any,
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

  // Trustee Reserved Dates Routes
  app.get("/api/admin/trustee-reserved-dates", async (req, res) => {
    try {
      const reservedDates = await storage.getTrusteeReservedDates();
      res.json(reservedDates);
    } catch (error: any) {
      console.error("Error fetching trustee reserved dates:", error);
      res.status(500).json({ error: error.message || "Failed to fetch trustee reserved dates" });
    }
  });

  app.post("/api/admin/trustee-reserved-dates", async (req, res) => {
    try {
      const { reservedDate, description, isEnabled } = req.body;
      
      // Validate date format
      if (!reservedDate || !Date.parse(reservedDate)) {
        return res.status(400).json({ error: "Valid date is required (YYYY-MM-DD format)" });
      }
      
      const newReservedDate = await storage.createTrusteeReservedDate({
        reservedDate,
        description: description || "Trustee Reserved Day",
        isEnabled: isEnabled !== false, // Default to true
      });
      
      res.status(201).json(newReservedDate);
    } catch (error: any) {
      console.error("Error creating trustee reserved date:", error);
      res.status(500).json({ error: error.message || "Failed to create trustee reserved date" });
    }
  });

  app.patch("/api/admin/trustee-reserved-dates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Validate reserved date if provided
      if (updates.reservedDate && !Date.parse(updates.reservedDate)) {
        return res.status(400).json({ error: "Valid date is required (YYYY-MM-DD format)" });
      }
      
      const updatedReservedDate = await storage.updateTrusteeReservedDate(id, updates);
      res.json(updatedReservedDate);
    } catch (error: any) {
      console.error("Error updating trustee reserved date:", error);
      res.status(500).json({ error: error.message || "Failed to update trustee reserved date" });
    }
  });

  app.delete("/api/admin/trustee-reserved-dates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrusteeReservedDate(id);
      res.json({ message: "Trustee reserved date deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting trustee reserved date:", error);
      res.status(500).json({ error: error.message || "Failed to delete trustee reserved date" });
    }
  });

  // Initialize default trustee reserved dates if they don't exist
  app.post("/api/admin/initialize-default-trustee-dates", async (req, res) => {
    try {
      const existingDates = await storage.getTrusteeReservedDates();
      
      if (existingDates.length === 0) {
        // Create default dates for specific dates (August 14th and 15th, 2025)
        await storage.createTrusteeReservedDate({
          reservedDate: "2025-08-14",
          description: "Trustee Reserved Day - August 14th",
          isEnabled: true,
        });
        
        await storage.createTrusteeReservedDate({
          reservedDate: "2025-08-15",
          description: "Trustee Reserved Day - August 15th", 
          isEnabled: true,
        });
        
        res.json({ message: "Default trustee reserved dates (August 14th and 15th, 2025) created successfully" });
      } else {
        res.json({ message: "Trustee reserved dates already exist", count: existingDates.length });
      }
    } catch (error: any) {
      console.error("Error initializing default trustee dates:", error);
      res.status(500).json({ error: error.message || "Failed to initialize default trustee dates" });
    }
  });

  // Payment Gateway Configuration Routes
  app.get("/api/admin/payment-gateways", async (req, res) => {
    try {
      const gateways = await storage.getPaymentGateways();
      res.json(gateways);
    } catch (error: any) {
      console.error("Error fetching payment gateways:", error);
      res.status(500).json({ error: error.message || "Failed to fetch payment gateways" });
    }
  });

  app.get("/api/payment-gateways/active", async (req, res) => {
    try {
      const activeGateways = await storage.getActivePaymentGateways();
      // Remove sensitive information for client
      const clientSafeGateways = activeGateways.map(gateway => ({
        id: gateway.id,
        gatewayName: gateway.gatewayName,
        displayName: gateway.displayName,
        isTestMode: gateway.isTestMode,
        supportedCurrencies: gateway.supportedCurrencies,
        minimumAmount: gateway.minimumAmount,
        maximumAmount: gateway.maximumAmount,
        processingFee: gateway.processingFee,
        publicKey: gateway.publicKey, // Only public key is safe for client
      }));
      res.json(clientSafeGateways);
    } catch (error: any) {
      console.error("Error fetching active payment gateways:", error);
      res.status(500).json({ error: error.message || "Failed to fetch active payment gateways" });
    }
  });

  app.post("/api/admin/payment-gateways", async (req, res) => {
    try {
      const validatedData = insertPaymentGatewaySchema.parse(req.body);
      const gateway = await storage.createPaymentGateway(validatedData);
      res.status(201).json(gateway);
    } catch (error: any) {
      console.error("Error creating payment gateway:", error);
      res.status(500).json({ error: error.message || "Failed to create payment gateway" });
    }
  });

  app.put("/api/admin/payment-gateways/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Use partial validation to allow partial updates and remove timestamp fields
      const validatedData = insertPaymentGatewaySchema.partial().parse(req.body);
      const updatedGateway = await storage.updatePaymentGateway(id, validatedData);
      res.json(updatedGateway);
    } catch (error: any) {
      console.error("Error updating payment gateway:", error);
      res.status(500).json({ error: error.message || "Failed to update payment gateway" });
    }
  });

  app.delete("/api/admin/payment-gateways/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePaymentGateway(id);
      res.json({ message: "Payment gateway deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting payment gateway:", error);
      res.status(500).json({ error: error.message || "Failed to delete payment gateway" });
    }
  });

  // Test endpoint for debugging
  app.post("/api/payment/test", async (req, res) => {
    res.json({ message: "Payment endpoint working without auth!", body: req.body });
  });

  // Cross-checks what Razorpay actually captured against payment_transactions,
  // so a payment that never got recorded (webhook down, browser closed, a
  // future bug) surfaces here instead of only being noticed via a bank
  // statement weeks later.
  app.get("/api/admin/razorpay-reconciliation", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 14;
      const result = await findUnmatchedRazorpayPayments(days);
      res.json(result);
    } catch (error: any) {
      console.error("Error running Razorpay reconciliation:", error);
      res.status(500).json({ error: error.message || "Reconciliation failed" });
    }
  });

  // An admin reviewed a flagged payment and decided it needs no booking or
  // refund (e.g. a confirmed test charge) - stop showing it going forward.
  app.post("/api/admin/razorpay-reconciliation/dismiss", async (req, res) => {
    try {
      const { paymentId, note } = req.body;
      if (!paymentId || typeof paymentId !== "string") {
        return res.status(400).json({ error: "paymentId is required" });
      }
      const dismissed = await storage.dismissReconciliationPayment(paymentId, note);
      res.json(dismissed);
    } catch (error: any) {
      console.error("Error dismissing reconciliation payment:", error);
      res.status(500).json({ error: error.message || "Failed to dismiss payment" });
    }
  });

  // ICICI Bank payment order endpoint
  app.post("/api/payment/icici/create-order", async (req, res) => {
    try {
      const { bookingId, customerData } = req.body;

      if (!bookingId) {
        return res.status(400).json({ error: "Booking ID is required" });
      }

      // bookingId here is the string booking reference (e.g. "SSH-...") -
      // parseInt(bookingId) on that produces NaN, which the payment_transactions
      // table's notNull/foreign-key bookingId column rejects outright. Resolve
      // to the real row first, both for its numeric id and so the amount
      // charged is always the booking's own stored total, never a client-
      // supplied amount (the same class of gap fixed for the other gateways).
      const booking = await storage.getRoomBookingByBookingId(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const amount = parseFloat(booking.totalAmount);

      console.log("Creating ICICI payment order:", { bookingId, amount });

      const iciciGateway = createICICIGateway();
      const orderResult = await iciciGateway.createOrder(amount, "INR", bookingId, customerData);

      if (orderResult.success) {
        // Save payment transaction to database
        await storage.createPaymentTransaction({
          bookingId: booking.id,
          gatewayId: 1, // ICICI gateway ID
          transactionId: orderResult.merchantTxnNo || `ICICI_${Date.now()}`,
          amount: amount.toString(),
          currency: "INR",
          status: "pending",
          paymentMethod: "icici_bank",
          gatewayResponse: JSON.stringify(orderResult.gatewayResponse)
        });

        res.json({
          success: true,
          orderId: orderResult.orderId,
          redirectUrl: orderResult.redirectUrl,
          merchantTxnNo: orderResult.merchantTxnNo
        });
      } else {
        console.error("ICICI order creation failed:", orderResult.error);
        res.status(500).json({
          success: false,
          error: orderResult.error || "Failed to create payment order"
        });
      }

    } catch (error: any) {
      console.error("ICICI create order error:", error);
      res.status(500).json({ error: error.message || "Failed to create payment order" });
    }
  });

  // Payment Processing Routes (NO AUTH REQUIRED for pre-booking payments)
  app.post("/api/payment/create-order", async (req, res) => {
    console.log("Payment create-order endpoint hit:", req.body);
    try {
      const { bookingId, gatewayName, currency = "INR" } = req.body;

      console.log("Processing payment for booking:", bookingId);
      console.log("Gateway name:", gatewayName);

      // A Razorpay order must never be created without a real, already-saved
      // booking to attach it to - a "pay first, save the booking afterward"
      // TEMP_ id used to let a captured payment exist with nothing in the
      // database to show for it (see commit 7b57062). Every payment now has
      // to reference a booking that's already been written to the database.
      const booking = await storage.getRoomBookingByBookingId(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // The amount charged is always the booking's own stored total, never
      // whatever the client sends - a request body amount was previously
      // trusted outright, letting a guest request an order for any amount
      // (e.g. ₹1) against a booking priced at any real total. The gateway's
      // signature verification only proves the amount actually paid matches
      // the amount on the order, not that the order amount was legitimate.
      const amount = parseFloat(booking.totalAmount);

      // Get the payment gateway
      const gateway = await storage.getPaymentGatewayByName(gatewayName);
      console.log("Gateway config:", {
        name: gateway?.gatewayName,
        isActive: gateway?.isActive,
        isTestMode: gateway?.isTestMode,
        publicKey: gateway?.publicKey,
        secretKey: gateway?.secretKey ? '***hidden***' : 'missing'
      });
      
      if (!gateway || !gateway.isActive) {
        return res.status(400).json({ error: "Payment gateway not available" });
      }

      // Handle ICICI Bank separately since it uses a different integration pattern
      if (gateway.gatewayName === "icici_bank") {
        const iciciGateway = createICICIGateway();
        const orderResult = await iciciGateway.createOrder(amount, currency, bookingId);
        
        if (orderResult.success) {
          const transactionId = `TXN_${bookingId}_${Date.now()}`;
          
          res.json({
            success: true,
            transactionId,
            gatewayData: {
              id: orderResult.orderId,
              redirectUrl: orderResult.redirectUrl,
              merchantTxnNo: orderResult.merchantTxnNo
            },
            gateway: {
              name: gateway.gatewayName,
              displayName: gateway.displayName,
            },
          });
          return;
        } else {
          return res.status(400).json({ error: orderResult.error });
        }
      }

      // Create payment gateway instance for other gateways
      const paymentGateway = PaymentGatewayFactory.createGateway(gateway);
      
      // Process payment
      console.log("About to process payment with gateway:", paymentGateway);
      const result = await PaymentService.processPayment(
        paymentGateway,
        amount,
        currency,
        bookingId
      );

      console.log("Payment processing result:", result);

      if (!result.success) {
        console.log("Payment failed with error:", result.error);
        
        // Provide helpful error message for Razorpay authentication issues
        if (result.error === "Payment processing failed") {
          return res.status(400).json({ 
            error: "Payment gateway authentication failed. Please verify your API credentials in Admin → Payment Settings.",
            details: "This usually happens when API keys are incorrect, expired, or the account isn't activated for the selected mode."
          });
        }
        
        return res.status(400).json({ error: result.error });
      }

      // Create the transaction record - this is what makes the payment
      // recoverable no matter what happens to the browser afterward.
      const transactionId = `TXN_${bookingId}_${Date.now()}`;
      await storage.createPaymentTransaction({
        bookingId: booking.id,
        gatewayId: gateway.id,
        transactionId,
        orderId: result.data.id || result.data.txnid,
        amount: amount.toString(),
        currency,
        status: "pending",
        gatewayResponse: JSON.stringify(result.data),
      });

      res.json({
        success: true,
        transactionId,
        gatewayData: result.data,
        gateway: {
          name: gateway.gatewayName,
          displayName: gateway.displayName,
        },
      });
    } catch (error: any) {
      console.error("Error creating payment order:", error);
      res.status(500).json({ error: error.message || "Failed to create payment order" });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { transactionId, paymentData, gatewayName } = req.body;
      
      console.log("Payment verification request:", { transactionId, gatewayName, paymentData });

      // Every transaction now has a real payment_transactions row created at
      // /api/payment/create-order time (see the fix there) - there is no
      // longer a "verify a TEMP_ payment with nothing in the database"
      // shortcut, because that was the exact mechanism that let a captured
      // Razorpay payment exist with no booking anywhere in this app.
      const transaction = await storage.getPaymentTransactionByTransactionId(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Get gateway
      const gateway = await storage.getPaymentGateway(transaction.gatewayId);
      if (!gateway) {
        return res.status(400).json({ error: "Payment gateway not found" });
      }

      // Create payment gateway instance
      const paymentGateway = PaymentGatewayFactory.createGateway(gateway);
      
      // Verify payment
      const verificationResult = await PaymentService.verifyPayment(paymentGateway, paymentData);

      if (verificationResult.success && verificationResult.isValid) {
        // Update transaction status
        await storage.updatePaymentTransaction(transaction.id, {
          status: "success",
          gatewayTransactionId: paymentData.razorpay_payment_id || paymentData.mihpayid,
          gatewayResponse: JSON.stringify(paymentData),
        });

        // Checked before updating - Razorpay's webhook can arrive before this
        // client call does and mark the booking paid first, in which case it
        // already sent the confirmation and this must not send it again.
        const bookingBeforeUpdate = await storage.getRoomBooking(transaction.bookingId);
        const alreadyPaid = bookingBeforeUpdate?.paymentStatus === "paid_online";

        // Update booking payment status
        const updatedBooking = await storage.updateRoomBooking(transaction.bookingId, {
          paymentStatus: "paid_online",
          paymentReference: paymentData.razorpay_payment_id || paymentData.mihpayid,
        });

        res.json({ success: true, message: "Payment verified successfully" });

        // Payment is now genuinely confirmed - this is the correct moment to
        // tell the guest their booking is confirmed (booking creation itself
        // skips this when a booking is created still awaiting online payment).
        if (!alreadyPaid) setImmediate(async () => {
          try {
            const [bookingUser, bookingCategory] = await Promise.all([
              storage.getUser(updatedBooking.userId),
              storage.getRoomCategory(updatedBooking.roomCategoryId),
            ]);
            if (bookingCategory) {
              await sendBookingConfirmationEmail({ booking: updatedBooking, user: bookingUser || null, category: bookingCategory });
              await whatsappService.sendBookingConfirmation(updatedBooking, bookingUser || null, bookingCategory);
            }
          } catch (error) {
            console.error("Error sending post-payment booking confirmation:", error);
          }
        });
      } else {
        // Update transaction status to failed
        await storage.updatePaymentTransaction(transaction.id, {
          status: "failed",
          failureReason: verificationResult.error || "Payment verification failed",
        });

        res.status(400).json({ error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: error.message || "Failed to verify payment" });
    }
  });

  // Payment webhook routes (for different gateways)
  
  // ICICI Bank Direct Integration Webhook
  app.post("/api/payment/icici/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      console.log("📡 ICICI Bank webhook received:", req.headers);
      console.log("📋 ICICI webhook body:", req.body.toString());
      
      // Parse the webhook data from ICICI Bank
      let webhookData;
      try {
        webhookData = JSON.parse(req.body.toString());
      } catch (parseError) {
        // Handle URL-encoded data if ICICI sends form data
        webhookData = req.body;
      }
      
      console.log("📊 ICICI webhook data:", webhookData);
      
      // ICICI Bank webhook verification 
      const iciciGateway = createICICIGateway();
      const isValid = await iciciGateway.verifyPayment(webhookData);
      
      if (!isValid) {
        console.error("❌ Invalid ICICI Bank webhook signature");
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
      
      // Handle different ICICI transaction statuses
      switch (webhookData.status || webhookData.transaction_status) {
        case 'SUCCESS':
        case 'COMPLETED':
        case 'CAPTURED':
          await handleICICIPaymentSuccess(webhookData);
          break;
        case 'FAILED':
        case 'DECLINED':
        case 'CANCELLED':
          await handleICICIPaymentFailure(webhookData);
          break;
        case 'PENDING':
        case 'PROCESSING':
          await handleICICIPaymentPending(webhookData);
          break;
        default:
          console.log("ℹ️ Unhandled ICICI transaction status:", webhookData.status);
      }
      
      // ICICI expects specific response format
      res.json({ 
        status: "SUCCESS",
        message: "Webhook processed successfully",
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("❌ ICICI webhook error:", error);
      res.status(500).json({ 
        status: "FAILED",
        message: "Webhook processing failed",
        error: error.message 
      });
    }
  });

  // ICICI Bank Response URLs (for redirect-based flows)
  app.post("/api/payment/icici/success", async (req, res) => {
    try {
      console.log("📡 ICICI success callback received:", req.body);
      const paymentData = req.body;
      
      // Verify ICICI payment response
      const iciciGateway = createICICIGateway();
      const isValid = await iciciGateway.verifyPayment(paymentData);
      
      if (isValid) {
        await handleICICIPaymentSuccess(paymentData);
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-success?txn=${paymentData.transaction_id || paymentData.txnid}&status=success&gateway=icici`);
      } else {
        console.error("❌ ICICI payment verification failed");
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?txn=${paymentData.transaction_id}&error=verification_failed&gateway=icici`);
      }
    } catch (error: any) {
      console.error("❌ ICICI success callback error:", error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?error=processing_failed&gateway=icici`);
    }
  });

  app.post("/api/payment/icici/failure", async (req, res) => {
    try {
      console.log("📡 ICICI failure callback received:", req.body);
      const paymentData = req.body;
      
      await handleICICIPaymentFailure(paymentData);
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?txn=${paymentData.transaction_id || paymentData.txnid}&status=failed&reason=${encodeURIComponent(paymentData.error_message || 'Payment failed')}&gateway=icici`);
    } catch (error: any) {
      console.error("❌ ICICI failure callback error:", error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?error=callback_error&gateway=icici`);
    }
  });
  app.post("/api/payment/razorpay/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      console.log("📡 Razorpay webhook received:", req.headers);
      
      // Get webhook signature from headers
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      // The admin Payment Gateway Settings UI saves the webhook secret onto
      // the razorpay row in the database - that's the value actually
      // configured in the Razorpay dashboard. Falling back to the env var
      // keeps old deployments that set it that way working too.
      const razorpayGateway = await storage.getPaymentGatewayByName("razorpay");
      const webhookSecret = razorpayGateway?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("❌ Razorpay webhook secret not configured");
        return res.status(400).json({ error: "Webhook secret not configured" });
      }

      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body, 'utf8')
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        console.error("❌ Invalid Razorpay webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = JSON.parse(req.body.toString());
      console.log("✅ Razorpay webhook verified:", event.event, event.payload?.payment?.entity?.id);

      // Handle different events
      switch (event.event) {
        case 'payment.captured':
        case 'payment.authorized':
          await handleRazorpayPaymentSuccess(event.payload.payment.entity);
          break;
        case 'payment.failed':
          await handleRazorpayPaymentFailure(event.payload.payment.entity);
          break;
        default:
          console.log("ℹ️ Unhandled Razorpay event:", event.event);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Razorpay webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/payment/payu/success", async (req, res) => {
    try {
      console.log("📡 PayU success callback received:", req.body);
      const paymentData = req.body;
      
      // Verify PayU payment hash
      const gateways = await storage.getActivePaymentGateways();
      const activeGateway = gateways.find(g => g.gatewayName === 'payu');
      if (activeGateway) {
        const gateway = PaymentGatewayFactory.createGateway(activeGateway);
        const isValid = await gateway.verifyPayment(paymentData);
        
        if (isValid) {
          await handlePayUPaymentSuccess(paymentData);
          res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-success?txn=${paymentData.txnid}&status=success`);
        } else {
          console.error("❌ PayU payment verification failed");
          res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?txn=${paymentData.txnid}&error=verification_failed`);
        }
      } else {
        console.error("❌ PayU gateway not configured");
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?error=gateway_not_configured`);
      }
    } catch (error: any) {
      console.error("❌ PayU success callback error:", error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?error=processing_failed`);
    }
  });

  app.post("/api/payment/payu/failure", async (req, res) => {
    try {
      console.log("📡 PayU failure callback received:", req.body);
      const paymentData = req.body;
      
      // Log payment failure
      await handlePayUPaymentFailure(paymentData);
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?txn=${paymentData.txnid}&status=failed&reason=${encodeURIComponent(paymentData.error_Message || 'Payment failed')}`);
    } catch (error: any) {
      console.error("❌ PayU failure callback error:", error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}/booking-failed?error=callback_error`);
    }
  });

  // ICICI Bank webhook helper functions
  async function verifyICICIWebhook(webhookData: any, headers: any): Promise<boolean> {
    try {
      // ICICI Bank signature verification - implement based on their documentation
      const signature = headers['x-icici-signature'] || headers['authorization'];
      const merchantKey = process.env.ICICI_MERCHANT_KEY;
      
      if (!signature || !merchantKey) {
        console.log("⚠️ Missing ICICI signature or merchant key");
        return true; // Allow for testing - implement proper verification in production
      }
      
      // Implement ICICI's specific signature verification algorithm
      // This varies based on their API documentation
      return true; // Placeholder - implement actual verification
    } catch (error) {
      console.error("❌ ICICI webhook verification error:", error);
      return false;
    }
  }

  async function verifyICICIResponse(paymentData: any): Promise<boolean> {
    try {
      // ICICI response verification for redirect flows
      const expectedHash = paymentData.hash || paymentData.checksum;
      if (!expectedHash) return true; // Allow if no hash provided
      
      // Implement ICICI's hash verification logic
      return true; // Placeholder - implement actual verification
    } catch (error) {
      console.error("❌ ICICI response verification error:", error);
      return false;
    }
  }

  async function handleICICIPaymentSuccess(paymentData: any) {
    console.log("✅ Processing ICICI payment success:", paymentData.merchantTxnNo || paymentData.transaction_id);

    // Extract booking ID from merchant transaction number
    const merchantTxnNo = paymentData.merchantTxnNo || paymentData.transaction_id;
    const bookingIdMatch = merchantTxnNo?.match(/BOOK_(.+)_\d+/);

    if (!bookingIdMatch) {
      console.error("❌ Could not extract booking ID from ICICI transaction:", merchantTxnNo);
      return;
    }

    const stringBookingId = bookingIdMatch[1];
    // stringBookingId is the string bookingId (e.g. "SSH-...") and
    // merchantTxnNo is the transactionId field, but updateRoomBooking and
    // updatePaymentTransaction both take the numeric primary key - passing
    // these strings directly (as this previously did) throws or silently
    // matches nothing, same bug already fixed for Razorpay. Resolve the
    // real rows first.
    const booking = await storage.getRoomBookingByBookingId(stringBookingId);
    if (!booking) {
      console.error("❌ ICICI webhook: no booking found for", stringBookingId);
      return;
    }

    const transaction = await storage.getPaymentTransactionByTransactionId(merchantTxnNo);
    if (transaction) {
      await storage.updatePaymentTransaction(transaction.id, {
        status: 'completed',
        gatewayTransactionId: paymentData.phiTxnId || paymentData.txnId || paymentData.bank_transaction_id,
        gatewayResponse: JSON.stringify(paymentData)
      });
    } else {
      console.error("❌ ICICI webhook: no payment_transactions row for", merchantTxnNo);
    }

    // Update booking payment status
    await storage.updateRoomBooking(booking.id, {
      paymentStatus: 'paid_online',
      paymentReference: paymentData.phiTxnId || paymentData.txnId
    });

    console.log("✅ ICICI payment success processed for booking:", stringBookingId);
  }

  async function handleICICIPaymentFailure(paymentData: any) {
    const transactionId = paymentData.transaction_id || paymentData.txnid;
    console.log("❌ Processing ICICI payment failure:", transactionId);

    const transaction = await storage.getPaymentTransactionByTransactionId(transactionId);
    if (!transaction) {
      console.error("❌ ICICI webhook: no payment_transactions row for", transactionId);
      return;
    }

    await storage.updatePaymentTransaction(transaction.id, {
      status: 'failed',
      gatewayResponse: JSON.stringify(paymentData),
      failureReason: paymentData.error_message || paymentData.failure_reason || 'Payment failed'
    });

    console.log("❌ ICICI payment failure processed:", transactionId);
  }

  async function handleICICIPaymentPending(paymentData: any) {
    const transactionId = paymentData.transaction_id || paymentData.txnid;
    console.log("⏳ Processing ICICI payment pending:", transactionId);

    const transaction = await storage.getPaymentTransactionByTransactionId(transactionId);
    if (!transaction) {
      console.error("❌ ICICI webhook: no payment_transactions row for", transactionId);
      return;
    }

    // Update payment transaction to pending status
    await storage.updatePaymentTransaction(transaction.id, {
      status: 'pending',
      gatewayResponse: JSON.stringify(paymentData)
    });

    console.log("⏳ ICICI payment pending status updated:", transactionId);
  }

  // Webhook helper functions
  async function handleRazorpayPaymentSuccess(payment: any) {
    console.log("✅ Processing Razorpay payment success:", payment.id);

    // Extract booking ID from receipt
    const receipt = payment.notes?.receipt || payment.description || '';
    const bookingIdMatch = receipt.match(/booking_(.+)/);

    if (!bookingIdMatch) {
      console.error("❌ Could not extract booking ID from Razorpay payment:", receipt);
      return;
    }

    const stringBookingId = bookingIdMatch[1];
    // bookingIdMatch[1] is the string bookingId (e.g. "SSH-..."), but both
    // updateRoomBooking and updatePaymentTransaction take the numeric
    // primary key - passing the string (as this previously did) either
    // throws or silently matches nothing. Resolve to the real row first.
    const booking = await storage.getRoomBookingByBookingId(stringBookingId);
    if (!booking) {
      console.error("❌ Razorpay webhook: no booking found for", stringBookingId);
      return;
    }

    // Idempotency: Razorpay can (and does) redeliver webhooks, and this can
    // also fire after the client's own /api/payment/verify call already
    // completed the same payment. Without this check, a guest could get the
    // confirmation email/WhatsApp message twice.
    const alreadyPaid = booking.paymentStatus === 'paid_online';

    // payment.order_id, not payment.id, matches what create-order stored -
    // payment.id is Razorpay's payment ID, never written to orderId.
    const transaction = await storage.getPaymentTransactionByOrderId(payment.order_id);
    if (transaction) {
      await storage.updatePaymentTransaction(transaction.id, {
        status: 'completed',
        gatewayTransactionId: payment.id,
        gatewayResponse: JSON.stringify(payment)
      });
    } else {
      console.error("❌ Razorpay webhook: no payment_transactions row for order", payment.order_id);
    }

    // This is the write the admin dashboard depends on - do NOT swallow a
    // failure here. Letting it throw means the webhook route below responds
    // with a 5xx, so Razorpay retries delivery instead of the booking being
    // silently stuck "unpaid" while Razorpay believes the webhook succeeded.
    const updatedBooking = await storage.updateRoomBooking(booking.id, {
      paymentStatus: 'paid_online',
      paymentReference: payment.id
    });

    console.log("✅ Razorpay payment success processed for booking:", stringBookingId);

    if (!alreadyPaid) {
      try {
        const [bookingUser, bookingCategory] = await Promise.all([
          storage.getUser(updatedBooking.userId),
          storage.getRoomCategory(updatedBooking.roomCategoryId),
        ]);
        if (bookingCategory) {
          await sendBookingConfirmationEmail({ booking: updatedBooking, user: bookingUser || null, category: bookingCategory });
          await whatsappService.sendBookingConfirmation(updatedBooking, bookingUser || null, bookingCategory);
        }
      } catch (notifyError) {
        // The payment is already correctly recorded above - a notification
        // failure shouldn't fail the webhook or trigger a Razorpay retry.
        console.error("Error sending post-payment booking confirmation:", notifyError);
      }
    }
  }

  async function handleRazorpayPaymentFailure(payment: any) {
    console.log("❌ Processing Razorpay payment failure:", payment.id);

    // payment.order_id, not payment.id - same fix as the success handler.
    const transaction = await storage.getPaymentTransactionByOrderId(payment.order_id);
    if (!transaction) {
      console.error("❌ Razorpay webhook: no payment_transactions row for order", payment.order_id);
      return;
    }

    await storage.updatePaymentTransaction(transaction.id, {
      status: 'failed',
      gatewayTransactionId: payment.id,
      gatewayResponse: JSON.stringify(payment),
      failureReason: payment.error_description || 'Payment failed'
    });

    console.log("❌ Razorpay payment failure processed:", payment.id);
  }

  async function handlePayUPaymentSuccess(paymentData: any) {
    console.log("✅ Processing PayU payment success:", paymentData.txnid);

    // Extract booking ID from transaction ID
    const bookingIdMatch = paymentData.txnid.match(/TXN_(.+)_\d+/);

    if (!bookingIdMatch) {
      console.error("❌ Could not extract booking ID from PayU transaction:", paymentData.txnid);
      return;
    }

    const stringBookingId = bookingIdMatch[1];
    // stringBookingId is the string bookingId (e.g. "SSH-..."), but
    // updateRoomBooking takes the numeric primary key - same bug already
    // fixed for Razorpay. Resolve the real booking row first.
    const booking = await storage.getRoomBookingByBookingId(stringBookingId);
    if (!booking) {
      console.error("❌ PayU webhook: no booking found for", stringBookingId);
      return;
    }

    // paymentData.txnid is PayU's own transaction id, which create-order
    // stored in payment_transactions.orderId - not .transactionId, which
    // holds a different, locally-generated value. Same "wrong field"
    // mistake already fixed for Razorpay (payment.order_id vs payment.id).
    const transaction = await storage.getPaymentTransactionByOrderId(paymentData.txnid);
    if (transaction) {
      await storage.updatePaymentTransaction(transaction.id, {
        status: 'completed',
        gatewayTransactionId: paymentData.mihpayid,
        gatewayResponse: JSON.stringify(paymentData)
      });
    } else {
      console.error("❌ PayU webhook: no payment_transactions row for", paymentData.txnid);
    }

    // Update booking payment status
    await storage.updateRoomBooking(booking.id, {
      paymentStatus: 'paid_online',
      paymentReference: paymentData.mihpayid
    });

    console.log("✅ PayU payment success processed for booking:", stringBookingId);
  }

  async function handlePayUPaymentFailure(paymentData: any) {
    console.log("❌ Processing PayU payment failure:", paymentData.txnid);

    const transaction = await storage.getPaymentTransactionByOrderId(paymentData.txnid);
    if (!transaction) {
      console.error("❌ PayU webhook: no payment_transactions row for", paymentData.txnid);
      return;
    }

    await storage.updatePaymentTransaction(transaction.id, {
      status: 'failed',
      gatewayResponse: JSON.stringify(paymentData),
      failureReason: paymentData.error_Message || paymentData.error || 'Payment failed'
    });

    console.log("❌ PayU payment failure processed:", paymentData.txnid);
  }

  // Payment Transactions Management
  app.get("/api/admin/payment-transactions", async (req, res) => {
    try {
      const transactions = await storage.getPaymentTransactions();
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching payment transactions:", error);
      res.status(500).json({ error: error.message || "Failed to fetch payment transactions" });
    }
  });

  app.get("/api/admin/payment-transactions/booking/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const transactions = await storage.getPaymentTransactionsByBookingId(bookingId);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching payment transactions for booking:", error);
      res.status(500).json({ error: error.message || "Failed to fetch payment transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

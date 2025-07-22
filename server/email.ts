import { sendEmailViaSES } from './emailSES';
import type { RoomBooking, User, RoomCategory } from "@shared/schema";
import * as nodemailer from 'nodemailer';
import { whatsappService } from "./whatsapp";

// Working SMTP transporter using verified credentials
const createSMTPTransporter = () => {
  console.log("Creating SMTP transporter for ssbb.in domain...");
  return nodemailer.createTransport({
    host: 'email-smtp.ap-south-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SES_SMTP_USERNAME!,
      pass: process.env.SES_SMTP_PASSWORD!
    },
    // Force the domain for Message-ID and Return-Path
    name: 'ssbb.in'
  });
};

// Hybrid email sending function - tries AWS SES first, falls back to SMTP
async function sendEmailHybrid(to: string, subject: string, htmlBody: string, textBody: string): Promise<boolean> {
  console.log(`Attempting to send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  
  // First try AWS SES
  try {
    console.log("Trying AWS SES...");
    const sesResult = await sendEmailViaSES({
      to,
      subject, 
      html: htmlBody,
      text: textBody
    });
    if (sesResult) {
      console.log("✅ Email sent successfully via AWS SES");
      return true;
    }
  } catch (error: any) {
    console.log(`❌ AWS SES failed: ${error.message}`);
  }
  
  // Fallback to working SMTP
  try {
    console.log("Falling back to SMTP...");
    const transporter = createSMTPTransporter();
    
    const mailOptions = {
      from: 'booking@ssbb.in',
      to: to,
      subject: subject,
      html: htmlBody,
      text: textBody
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully via SMTP! MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.log(`❌ SMTP fallback also failed: ${error.message}`);
    return false;
  }
}

interface BookingEmailData {
  booking: RoomBooking;
  user?: User | null;
  category: RoomCategory;
  guestName?: string;
  guestEmail?: string;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<boolean> {
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for booking confirmation");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Booking Confirmation - Sri Shankeshwar Bengaluru Bhavan - ${booking.bookingId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Booking Confirmation</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Thank you for your booking! Your reservation has been confirmed.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6b35;">Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate}</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
            <p><strong>Payment Status:</strong> ${booking.paymentStatus}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6b35;">Property Information</h3>
            <p><strong>Address:</strong> Near Parshwanath Temple, Shankheshwar, Patan District, Gujarat 384246</p>
            <p><strong>Contact:</strong> +91 9876543210</p>
            <p><strong>Check-in Time:</strong> 2:00 PM onwards</p>
            <p><strong>Check-out Time:</strong> 11:00 AM</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            We look forward to hosting you at Sri Shankeshwar Bengaluru Bhavan!
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `
Dear ${recipientName},

Thank you for your booking! Your reservation has been confirmed.

Booking Details:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}
- Check-in Date: ${checkinDate}
- Check-out Date: ${checkoutDate}
- Guests: ${booking.guests}
- Total Amount: ₹${booking.totalAmount}
- Payment Status: ${booking.paymentStatus}

Property Information:
- Address: Near Parshwanath Temple, Shankheshwar, Patan District, Gujarat 384246
- Contact: +91 9876543210
- Check-in Time: 2:00 PM onwards
- Check-out Time: 11:00 AM

We look forward to hosting you at Sri Shankeshwar Bengaluru Bhavan!

© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.
    `;

    const emailSent = await sendEmailHybrid(recipientEmail, subject, htmlBody, textBody);
    
    // Send WhatsApp notification if enabled and configured
    try {
      await whatsappService.sendBookingConfirmation(booking, user, category);
    } catch (error) {
      console.error("WhatsApp booking confirmation failed:", error);
    }

    return emailSent;
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    return false;
  }
}

export async function sendBookingCancellationEmail(data: BookingEmailData): Promise<boolean> {
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for booking cancellation");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Booking Cancelled - Sri Shankeshwar Bengaluru Bhavan - ${booking.bookingId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Booking Cancellation</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Your booking has been successfully cancelled as requested.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc3545;">Cancelled Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate}</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            We hope to serve you in the future. Thank you for considering Sri Shankeshwar Bengaluru Bhavan.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `Booking Cancelled - ${booking.bookingId}

Dear ${recipientName},

Your booking has been cancelled. 

Booking Details:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}
- Dates: ${checkinDate} to ${checkoutDate}

Contact us if you have any questions.

Sri Shankeshwar Bengaluru Bhavan Team`;

    const emailSent = await sendEmailHybrid(recipientEmail, subject, htmlBody, textBody);
    
    // Send WhatsApp notification if enabled and configured
    try {
      await whatsappService.sendBookingCancellation(booking, user, category);
    } catch (error) {
      console.error("WhatsApp booking cancellation failed:", error);
    }

    return emailSent;
  } catch (error) {
    console.error("Error sending booking cancellation email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
  try {
    const subject = "Password Reset - Sri Shankeshwar Bengaluru Bhavan";
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Password Reset Request</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${name},</h2>
          <p>We received a request to reset your password.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: #ff6b35;">Reset Your Password</h3>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            
            <a href="${resetUrl}" style="display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
              Reset Password
            </a>
          </div>
          
          <p style="margin-top: 30px;">Best regards,<br>Sri Shankeshwar Bengaluru Bhavan Team</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `Password Reset Request - Sri Shankeshwar Bengaluru Bhavan

Dear ${name},

We received a request to reset your password.

To reset your password, please visit: ${resetUrl}

This link will expire in 1 hour.

Best regards,
Sri Shankeshwar Bengaluru Bhavan Team`;

    return await sendEmailHybrid(email, subject, htmlBody, textBody);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

export async function sendPreCheckinReminderEmail(
  booking: RoomBooking,
  user: User | null,
  category: RoomCategory
): Promise<boolean> {
  try {
    const recipientEmail = user?.email || booking.guestEmail;
    const recipientName = user?.name || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for pre-checkin reminder");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    
    const subject = `Check-in Reminder - Tomorrow at Sri Shankeshwar Bengaluru Bhavan`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Check-in Reminder</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>This is a friendly reminder that your check-in is scheduled for tomorrow!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #28a745;">Your Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Time:</strong> 2:00 PM onwards</p>
          </div>
          
          <p>We look forward to welcoming you tomorrow!</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `Check-in Reminder - Tomorrow

Dear ${recipientName},

This is a friendly reminder that your check-in is scheduled for tomorrow!

Booking Details:
- Booking ID: ${booking.bookingId}
- Check-in Date: ${checkinDate}
- Room Category: ${category.name}
- Check-in Time: 2:00 PM onwards

We look forward to welcoming you tomorrow!

Sri Shankeshwar Bengaluru Bhavan Team`;

    const emailSent = await sendEmailHybrid(recipientEmail, subject, htmlBody, textBody);
    
    // Send WhatsApp notification if enabled and configured
    try {
      await whatsappService.sendPreCheckinReminder(booking, user, category);
    } catch (error) {
      console.error("WhatsApp pre-checkin reminder failed:", error);
    }

    return emailSent;
  } catch (error) {
    console.error("Error sending pre-checkin reminder email:", error);
    return false;
  }
}

export async function sendCheckinDayWelcomeEmail(
  booking: RoomBooking,
  user: User | null,
  category: RoomCategory
): Promise<boolean> {
  try {
    const recipientEmail = user?.email || booking.guestEmail;
    const recipientName = user?.name || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for checkin day welcome");
      return false;
    }

    const subject = `Welcome! Today is Your Check-in Day - Sri Shankeshwar Bengaluru Bhavan`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Welcome Message</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Welcome to your check-in day! We're excited to host you today.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6b35;">Check-in Information</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Time:</strong> 2:00 PM onwards</p>
            <p><strong>Contact:</strong> +91 9876543210</p>
          </div>
          
          <p>Looking forward to welcoming you today!</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `Welcome! Today is Your Check-in Day

Dear ${recipientName},

Welcome to your check-in day! We're excited to host you today.

Check-in Information:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}
- Check-in Time: 2:00 PM onwards
- Contact: +91 9876543210

Looking forward to welcoming you today!

Sri Shankeshwar Bengaluru Bhavan Team`;

    const emailSent = await sendEmailHybrid(recipientEmail, subject, htmlBody, textBody);
    
    // Send WhatsApp notification if enabled and configured
    try {
      await whatsappService.sendCheckinDayWelcome(booking, user, category);
    } catch (error) {
      console.error("WhatsApp checkin day welcome failed:", error);
    }

    return emailSent;
  } catch (error) {
    console.error("Error sending checkin day welcome email:", error);
    return false;
  }
}

export async function sendPostCheckoutFeedbackEmail(
  booking: RoomBooking,
  user: User | null,
  category: RoomCategory
): Promise<boolean> {
  try {
    const recipientEmail = user?.email || booking.guestEmail;
    const recipientName = user?.name || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for post-checkout feedback");
      return false;
    }

    const subject = `Thank You for Your Stay - Sri Shankeshwar Bengaluru Bhavan`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6f42c1, #6610f2); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Thank You for Your Stay</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Thank you for choosing Sri Shankeshwar Bengaluru Bhavan for your stay! We hope you had a wonderful experience.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #6f42c1;">Your Recent Stay</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
          </div>
          
          <p>We would love to hear about your experience and how we can improve. Please feel free to contact us with any feedback.</p>
          <p>We hope to welcome you back soon!</p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `Thank You for Your Stay

Dear ${recipientName},

Thank you for choosing Sri Shankeshwar Bengaluru Bhavan! We hope you had a wonderful experience.

Your Recent Stay:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}

We would love to hear about your experience. Please contact us with any feedback.

We hope to welcome you back soon!

Sri Shankeshwar Bengaluru Bhavan Team`;

    const emailSent = await sendEmailHybrid(recipientEmail, subject, htmlBody, textBody);
    
    // Send WhatsApp notification if enabled and configured
    try {
      await whatsappService.sendPostCheckoutFeedback(booking, user, category);
    } catch (error) {
      console.error("WhatsApp post-checkout feedback failed:", error);
    }

    return emailSent;
  } catch (error) {
    console.error("Error sending post-checkout feedback email:", error);
    return false;
  }
}
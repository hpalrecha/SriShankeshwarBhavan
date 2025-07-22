import { sendEmailViaSES } from './emailSES';
import type { RoomBooking, User, RoomCategory } from "@shared/schema";

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
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Important Instructions</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>Please carry a valid government-issued photo ID for check-in</li>
              <li>ID proof upload will be required during check-in process</li>
              <li>Contact us for any special requirements or assistance</li>
            </ul>
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

Important Instructions:
- Please carry a valid government-issued photo ID for check-in
- ID proof upload will be required during check-in process
- Contact us for any special requirements or assistance

We look forward to hosting you at Sri Shankeshwar Bengaluru Bhavan!

© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.
    `;

    return await sendEmailViaSES({
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody
    });
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    console.error("AWS SES Error Details:", JSON.stringify(error, null, 2));
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
          <p>Your booking has been cancelled as requested.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc3545;">Cancelled Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate}</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
          </div>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="margin-top: 0; color: #721c24;">Refund Information</h4>
            <p style="color: #721c24; margin: 0;">
              If you made an online payment, the refund will be processed within 3-5 business days. 
              For any queries regarding refunds, please contact us at +91 9876543210.
            </p>
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

    return await sendEmailViaSES({
      to: recipientEmail,
      subject,
      html: htmlBody,
      text: textBody
    });
  } catch (error) {
    console.error("Error sending booking cancellation email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) {
    console.log("AWS SES not configured, skipping password reset email");
    return false;
  }
  
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
          <p>We received a request to reset your password for your Sri Shankeshwar Bengaluru Bhavan account.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: #ff6b35;">Reset Your Password</h3>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            
            <a href="${resetUrl}" style="display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
              Reset Password
            </a>
            
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Security Notice</h4>
            <p style="color: #856404; margin: 0;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              For security reasons, this reset link will expire in 1 hour.
            </p>
          </div>
          
          <p style="margin-top: 30px;">
            If you're having trouble with the reset process, please contact us at +91 9876543210 or reply to this email.
          </p>
          
          <p style="margin-top: 20px;">
            Best regards,<br>
            Sri Shankeshwar Bengaluru Bhavan Team
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `
Password Reset Request - Sri Shankeshwar Bengaluru Bhavan

Dear ${name},

We received a request to reset your password for your Sri Shankeshwar Bengaluru Bhavan account.

To reset your password, please click on the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

If you're having trouble with the reset process, please contact us at +91 9876543210.

Best regards,
Sri Shankeshwar Bengaluru Bhavan Team

© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.
    `;

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

export async function sendPreCheckinReminderEmail(data: BookingEmailData): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) {
    console.log("AWS SES not configured, skipping pre-checkin reminder email");
    return false;
  }
  
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for pre-checkin reminder");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Check-in Reminder - Tomorrow - Sri Shankeshwar Bengaluru Bhavan - ${booking.bookingId}`;
    
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
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate}</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #bee5eb;">
            <h4 style="margin-top: 0; color: #0c5460;">Check-in Preparation</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>Check-in time: 2:00 PM onwards</li>
              <li>Bring valid government-issued photo ID (Aadhaar, Passport, Driver's License)</li>
              <li>Have your booking confirmation ready</li>
              <li>Contact us at +91 9876543210 for any assistance</li>
            </ul>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #28a745;">Directions</h3>
            <p><strong>Address:</strong> Near Parshwanath Temple, Shankheshwar, Patan District, Gujarat 384246</p>
            <p><strong>Landmark:</strong> Walking distance from the sacred Parshwanath Temple</p>
            <p><strong>Contact:</strong> +91 9876543210</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            We're excited to welcome you tomorrow!
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Pre-checkin reminder email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending pre-checkin reminder email:", error);
    return false;
  }
}

export async function sendCheckoutReminderEmail(data: BookingEmailData): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) {
    console.log("AWS SES not configured, skipping checkout reminder email");
    return false;
  }
  
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for checkout reminder");
      return false;
    }

    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Check-out Reminder - Today - Sri Shankeshwar Bengaluru Bhavan - ${booking.bookingId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ffc107, #fd7e14); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Check-out Reminder</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Thank you for staying with us! This is a reminder that your check-out is scheduled for today.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ffc107;">Your Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Check-out Information</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>Check-out time: 11:00 AM</li>
              <li>Please ensure all personal belongings are collected</li>
              <li>Return room keys at the front desk</li>
              <li>Feedback is appreciated to help us improve our services</li>
            </ul>
          </div>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="margin-top: 0; color: #155724;">Late Check-out</h4>
            <p style="color: #155724; margin: 0;">
              If you need late check-out, please contact the front desk. Additional charges may apply for late check-out beyond 2:00 PM.
            </p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            Thank you for choosing Sri Shankeshwar Bengaluru Bhavan! We hope you had a wonderful stay.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Checkout reminder email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending checkout reminder email:", error);
    return false;
  }
}

export async function sendCheckInDayReminderEmail(data: BookingEmailData): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) {
    console.log("AWS SES not configured, skipping check-in day reminder email");
    return false;
  }
  
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for check-in day reminder");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Today is Check-in Day! - Sri Shankeshwar Bengaluru Bhavan - ${booking.bookingId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Today is Your Check-in Day!</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Welcome! Today is your check-in day at Sri Shankeshwar Bengaluru Bhavan. We're excited to host you!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6b35;">Your Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Check-in Date:</strong> ${checkinDate} (Today)</p>
            <p><strong>Check-out Date:</strong> ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
          </div>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="margin-top: 0; color: #155724;">Check-in Information</h4>
            <ul style="color: #155724; margin: 0; padding-left: 20px;">
              <li><strong>Check-in time:</strong> 2:00 PM onwards</li>
              <li><strong>Location:</strong> Reception Desk at Main Entrance</li>
              <li><strong>Required Documents:</strong> Valid Government ID (Aadhaar, Passport, Driver's License)</li>
              <li><strong>Contact:</strong> +91 9876543210 for any assistance</li>
            </ul>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6b35;">Directions</h3>
            <p><strong>Address:</strong> Near Parshwanath Temple, Shankheshwar, Patan District, Gujarat 384246</p>
            <p><strong>Landmark:</strong> Adjacent to the sacred Parshwanath Temple</p>
            <p><strong>Transportation:</strong> Local buses available from Patan. Auto-rickshaws from Shankheshwar Bus Stand.</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #ff6b35; font-weight: bold;">
            We look forward to welcoming you today!
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `
Today is Check-in Day! - Sri Shankeshwar Bengaluru Bhavan

Dear ${recipientName},

Welcome! Today is your check-in day at Sri Shankeshwar Bengaluru Bhavan. We're excited to host you!

Booking Details:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}
- Check-in Date: ${checkinDate} (Today)
- Check-out Date: ${checkoutDate}
- Guests: ${booking.guests}

Check-in Information:
- Check-in time: 2:00 PM onwards
- Location: Reception Desk at Main Entrance
- Required Documents: Valid Government ID (Aadhaar, Passport, Driver's License)
- Contact: +91 9876543210 for any assistance

Address: Near Parshwanath Temple, Shankheshwar, Patan District, Gujarat 384246
Landmark: Adjacent to the sacred Parshwanath Temple
Transportation: Local buses available from Patan. Auto-rickshaws from Shankheshwar Bus Stand.

We look forward to welcoming you today!

Best regards,
Sri Shankeshwar Bengaluru Bhavan Team

© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.
    `;

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Check-in day reminder email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending check-in day reminder email:", error);
    return false;
  }
}

export async function sendPostCheckoutFeedbackEmail(data: BookingEmailData): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) {
    console.log("AWS SES not configured, skipping post-checkout feedback email");
    return false;
  }
  
  try {
    const { booking, user, category, guestName, guestEmail } = data;
    const recipientEmail = user?.email || guestEmail || booking.guestEmail;
    const recipientName = user?.name || guestName || booking.guestName;
    
    if (!recipientEmail) {
      console.error("No recipient email found for post-checkout feedback");
      return false;
    }

    const checkinDate = new Date(booking.checkinDate).toLocaleDateString('en-IN');
    const checkoutDate = new Date(booking.checkoutDate).toLocaleDateString('en-IN');
    
    const subject = `Thank You for Staying with Us! Share Your Feedback - ${booking.bookingId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Sri Shankeshwar Bengaluru Bhavan</h1>
          <p style="color: white; margin: 5px 0;">Thank You for Your Stay!</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${recipientName},</h2>
          <p>Thank you for choosing Sri Shankeshwar Bengaluru Bhavan for your stay. We hope you had a wonderful and peaceful experience with us!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #28a745;">Your Stay Summary</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Room Category:</strong> ${category.name}</p>
            <p><strong>Stay Duration:</strong> ${checkinDate} to ${checkoutDate}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">We Value Your Feedback!</h3>
            <p style="color: #856404; margin-bottom: 15px;">
              Your experience matters to us. Please take a moment to share your feedback about your stay.
            </p>
            
            <div style="margin: 20px 0;">
              <p style="color: #856404; margin: 5px 0;"><strong>How was your stay?</strong></p>
              <p style="color: #856404; margin: 5px 0;"><strong>What did you like most?</strong></p>
              <p style="color: #856404; margin: 5px 0;"><strong>Any suggestions for improvement?</strong></p>
            </div>
            
            <p style="color: #856404; font-size: 12px; margin-top: 15px;">
              Please reply to this email with your feedback or call us at +91 9876543210
            </p>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #bee5eb;">
            <h4 style="margin-top: 0; color: #0c5460;">Visit Us Again!</h4>
            <p style="color: #0c5460; margin: 0;">
              We would be delighted to welcome you back to Sri Shankeshwar Bengaluru Bhavan. 
              For future bookings, please visit our website or contact us directly.
            </p>
          </div>
          
          <p style="margin-top: 30px;">
            Thank you once again for choosing us. We hope to see you soon!
          </p>
          
          <p style="margin-top: 20px;">
            With warm regards,<br>
            Sri Shankeshwar Bengaluru Bhavan Team
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0;">© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
        </div>
      </div>
    `;

    const textBody = `
Thank You for Your Stay! - Sri Shankeshwar Bengaluru Bhavan

Dear ${recipientName},

Thank you for choosing Sri Shankeshwar Bengaluru Bhavan for your stay. We hope you had a wonderful and peaceful experience with us!

Your Stay Summary:
- Booking ID: ${booking.bookingId}
- Room Category: ${category.name}
- Stay Duration: ${checkinDate} to ${checkoutDate}
- Guests: ${booking.guests}

We Value Your Feedback!
Your experience matters to us. Please take a moment to share your feedback about your stay.

How was your stay?
What did you like most?
Any suggestions for improvement?

Please reply to this email with your feedback or call us at +91 9876543210

Visit Us Again!
We would be delighted to welcome you back to Sri Shankeshwar Bengaluru Bhavan. 
For future bookings, please visit our website or contact us directly.

Thank you once again for choosing us. We hope to see you soon!

With warm regards,
Sri Shankeshwar Bengaluru Bhavan Team

© 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.
    `;

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Post-checkout feedback email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending post-checkout feedback email:", error);
    return false;
  }
}
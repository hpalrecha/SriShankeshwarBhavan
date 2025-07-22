import nodemailer from 'nodemailer';

interface EmailData {
  recipientEmail: string;
  recipientName: string;
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  roomCategory: string;
  totalAmount: number;
  guestCount: number;
}

function getTransporter() {
  // Option 1: Use SES-generated SMTP credentials from environment
  if (process.env.SES_SMTP_USERNAME && process.env.SES_SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: 'email-smtp.ap-south-1.amazonaws.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SES_SMTP_USERNAME,
        pass: process.env.SES_SMTP_PASSWORD
      }
    });
  }
  
  // Option 2: Use IAM credentials as SMTP (fallback)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return nodemailer.createTransport({
      host: 'email-smtp.ap-south-1.amazonaws.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.AWS_ACCESS_KEY_ID,
        pass: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  
  return null;
}

export async function sendBookingConfirmationEmailSMTP(data: EmailData): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("AWS SES SMTP credentials not configured");
    return false;
  }

  // Debug logging (masking sensitive parts)
  console.log("SMTP Configuration:");
  console.log("- Username:", process.env.SES_SMTP_USERNAME ? process.env.SES_SMTP_USERNAME.substring(0, 10) + "..." : "NOT SET");
  console.log("- Password:", process.env.SES_SMTP_PASSWORD ? process.env.SES_SMTP_PASSWORD.substring(0, 5) + "..." : "NOT SET");
  console.log("- From Email:", process.env.FROM_EMAIL);

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 Sri Shankeshwar Bengaluru Bhavan</h1>
            <p>Booking Confirmation</p>
          </div>
          <div class="content">
            <h2>Dear ${data.recipientName},</h2>
            <p>Thank you for your booking! Your reservation has been confirmed.</p>
            
            <div class="booking-details">
              <h3>Booking Details:</h3>
              <p><strong>Booking ID:</strong> ${data.bookingId}</p>
              <p><strong>Check-in Date:</strong> ${data.checkInDate}</p>
              <p><strong>Check-out Date:</strong> ${data.checkOutDate}</p>
              <p><strong>Room Category:</strong> ${data.roomCategory}</p>
              <p><strong>Guest Count:</strong> ${data.guestCount}</p>
              <p><strong>Total Donation:</strong> ₹${data.totalAmount}</p>
            </div>
            
            <p>We look forward to welcoming you at our sacred location near Parshwanath Temple.</p>
          </div>
          <div class="footer">
            <p>Sri Shankeshwar Bengaluru Bhavan<br>
            Shankheshwar, Gujarat<br>
            Contact: +91-XXXXXXXXXX</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: 'booking@ssbb.in',
      to: data.recipientEmail,
      subject: `Booking Confirmation - ${data.bookingId}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via SMTP:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    return false;
  }
}
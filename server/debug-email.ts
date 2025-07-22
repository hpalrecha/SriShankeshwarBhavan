import nodemailer from 'nodemailer';

// Debug function to test email configuration
export async function debugEmailConfiguration() {
  console.log("\n=== EMAIL CONFIGURATION DEBUG ===");
  
  // Check environment variables
  console.log("Environment Variables:");
  console.log("- SES_SMTP_USERNAME:", process.env.SES_SMTP_USERNAME ? process.env.SES_SMTP_USERNAME.substring(0, 10) + "..." : "NOT SET");
  console.log("- SES_SMTP_PASSWORD:", process.env.SES_SMTP_PASSWORD ? "SET (length: " + process.env.SES_SMTP_PASSWORD.length + ")" : "NOT SET");
  console.log("- FROM_EMAIL:", process.env.FROM_EMAIL);
  
  // Test connection
  if (process.env.SES_SMTP_USERNAME && process.env.SES_SMTP_PASSWORD) {
    console.log("\n=== TESTING SMTP CONNECTION ===");
    
    const transporter = nodemailer.createTransport({
      host: 'email-smtp.ap-south-1.amazonaws.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SES_SMTP_USERNAME,
        pass: process.env.SES_SMTP_PASSWORD
      },
      debug: true, // Enable debug logging
      logger: true // Enable logging
    });
    
    try {
      // Verify connection
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
      return true;
    } catch (error) {
      console.log("❌ SMTP connection failed:", error);
      return false;
    }
  } else {
    console.log("❌ Missing SMTP credentials");
    return false;
  }
}
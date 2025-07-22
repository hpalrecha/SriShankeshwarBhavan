import nodemailer from 'nodemailer';

// Direct SMTP test with exact working configuration
export async function testDirectSMTP(): Promise<boolean> {
  console.log("\n=== DIRECT SMTP TEST ===");
  
  // Use exact same configuration that works in other projects
  const transporter = nodemailer.createTransporter({
    host: 'email-smtp.ap-south-1.amazonaws.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.SES_SMTP_USERNAME,
      pass: process.env.SES_SMTP_PASSWORD
    },
    debug: false, // Reduced logging
    logger: false
  });
  
  try {
    // Test with minimal email
    const testEmail = {
      from: 'info@p91india.com',
      to: 'jaggi13js@gmail.com',
      subject: 'Test Email - Sri Shankeshwar Bengaluru Bhavan',
      text: 'This is a test email to verify SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Test Email</h2>
          <p>This is a test email to verify SMTP configuration for Sri Shankeshwar Bengaluru Bhavan.</p>
          <p>If you received this, the email system is working correctly!</p>
        </div>
      `
    };
    
    console.log(`Sending test email from ${testEmail.from} to ${testEmail.to}...`);
    const result = await transporter.sendMail(testEmail);
    console.log(`✅ Direct SMTP test successful! Message ID: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Direct SMTP test failed: ${error.message}`);
    console.log(`Error code: ${error.code}`);
    return false;
  }
}
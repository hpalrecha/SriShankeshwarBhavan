import nodemailer from 'nodemailer';

// Manual test with hardcoded credentials to isolate the issue
async function testManualSMTP() {
  console.log("=== MANUAL SMTP TEST ===");
  
  // Create transporter with exact credentials
  const transporter = nodemailer.createTransport({
    host: 'email-smtp.ap-south-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: 'AKIA4JRGW6DN2QOBPEL6',
      pass: 'BEwUA46mkkW7zyRShKIWQBRSenj0+fZ1S95zel/C/7UD'
    },
    debug: true,
    logger: true
  });

  try {
    console.log("Testing connection...");
    await transporter.verify();
    console.log("✅ Connection successful!");
    
    console.log("Sending test email...");
    const result = await transporter.sendMail({
      from: 'booking@ssbb.in',
      to: 'jaggi13js@gmail.com',
      subject: 'Manual SMTP Test - Hotel Booking',
      html: '<h1>Success!</h1><p>SMTP email is working correctly.</p>',
      text: 'Success! SMTP email is working correctly.'
    });
    
    console.log("✅ Email sent successfully:", result.messageId);
    return true;
  } catch (error) {
    console.log("❌ Manual SMTP test failed:", error);
    return false;
  }
}

// Export for use in routes
export { testManualSMTP };
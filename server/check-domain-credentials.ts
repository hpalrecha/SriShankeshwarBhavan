import * as nodemailer from 'nodemailer';

export async function checkDomainCredentials(): Promise<void> {
  console.log("=== CHECKING DOMAIN CREDENTIALS ===");
  
  // Test current credentials with ssbb.in domain
  const transporter = nodemailer.createTransporter({
    host: 'email-smtp.ap-south-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SES_SMTP_USERNAME!,
      pass: process.env.SES_SMTP_PASSWORD!
    },
    name: 'ssbb.in'
  });

  try {
    console.log("Testing SMTP connection for ssbb.in domain...");
    await transporter.verify();
    console.log("✅ SMTP connection verified for ssbb.in");

    // Test sending with ssbb.in from address
    const info = await transporter.sendMail({
      from: 'booking@ssbb.in',
      to: 'jaggi13js@gmail.com',
      subject: 'Domain Test - Sri Shankeshwar Bengaluru Bhavan',
      text: 'This is a test to verify the actual sending domain.',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Domain Test Email</h2>
          <p>This email is being sent to verify the actual sending domain.</p>
          <p><strong>From:</strong> booking@ssbb.in</p>
          <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    console.log(`✅ Test email sent! MessageId: ${info.messageId}`);
    console.log(`Message ID domain: ${info.messageId}`);
    
  } catch (error: any) {
    console.log(`❌ Error testing domain credentials: ${error.message}`);
  }
}
import * as nodemailer from 'nodemailer';

export async function testSimpleSMTP(): Promise<boolean> {
  try {
    console.log("\n=== TESTING SIMPLE SMTP ===");
    console.log("SES_SMTP_USERNAME:", process.env.SES_SMTP_USERNAME);
    console.log("SES_SMTP_PASSWORD length:", process.env.SES_SMTP_PASSWORD?.length);
    
    const transporter = nodemailer.createTransport({
      host: 'email-smtp.ap-south-1.amazonaws.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SES_SMTP_USERNAME!,
        pass: process.env.SES_SMTP_PASSWORD!,
      },
    });

    // Verify connection configuration
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");

    const info = await transporter.sendMail({
      from: 'info@p91india.com',
      to: 'jaggi13js@gmail.com',
      subject: 'Test Email from Sri Shankeshwar Bengaluru Bhavan',
      text: 'This is a test email to verify SMTP functionality.',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #ff6b35;">Test Email</h2>
          <p>This is a test email from Sri Shankeshwar Bengaluru Bhavan.</p>
          <p>If you receive this email, the SMTP system is working correctly!</p>
        </div>
      `,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('❌ SMTP test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  }
}
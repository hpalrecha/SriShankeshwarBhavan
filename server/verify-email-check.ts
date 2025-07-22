import { SESClient, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';

// Check if email is verified in AWS SES
export async function checkEmailVerification() {
  console.log("\n=== EMAIL VERIFICATION CHECK ===");
  
  if (!process.env.SES_SMTP_USERNAME || !process.env.SES_SMTP_PASSWORD) {
    console.log("❌ AWS credentials not available");
    return false;
  }

  try {
    // Create SES client using SMTP credentials as Access Keys
    const sesClient = new SESClient({
      region: 'ap-south-1',
      credentials: {
        accessKeyId: process.env.SES_SMTP_USERNAME,
        secretAccessKey: process.env.SES_SMTP_PASSWORD,
      },
    });

    const command = new GetIdentityVerificationAttributesCommand({
      Identities: ['booking@ssbb.in']
    });

    const response = await sesClient.send(command);
    
    console.log("Email verification status:", response.VerificationAttributes);
    
    const verificationData = response.VerificationAttributes['booking@ssbb.in'];
    if (verificationData && verificationData.VerificationStatus === 'Success') {
      console.log("✅ booking@ssbb.in is verified");
      return true;
    } else {
      console.log("❌ booking@ssbb.in is NOT verified or does not exist");
      console.log("You need to verify this email in AWS SES Console");
      return false;
    }
    
  } catch (error) {
    console.log("❌ Error checking email verification:", error);
    return false;
  }
}
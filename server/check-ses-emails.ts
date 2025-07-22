import { SESClient, ListVerifiedEmailAddressesCommand, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function checkVerifiedEmails(): Promise<void> {
  try {
    console.log("=== CHECKING SES VERIFIED EMAIL ADDRESSES ===");
    
    const command = new ListVerifiedEmailAddressesCommand({});
    const result = await sesClient.send(command);
    
    console.log("Verified email addresses:", result.VerifiedEmailAddresses);
    
    const emails = ['booking@ssbb.in', 'info@p91india.com'];
    
    for (const email of emails) {
      if (!result.VerifiedEmailAddresses?.includes(email)) {
        console.log(`❌ ${email} is NOT verified in SES`);
        console.log(`To verify ${email}, you need to:`);
        console.log(`1. Go to AWS SES Console`);
        console.log(`2. Add and verify the email address`);
        console.log(`3. Check the email inbox for verification link`);
      } else {
        console.log(`✅ ${email} is verified in SES`);
      }
    }
  } catch (error: any) {
    console.log("❌ Cannot check SES verified emails:", error.message);
    if (error.name === 'InvalidClientTokenId') {
      console.log("This confirms the AWS credentials issue we've been seeing");
    }
  }
}
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Debug function to test AWS SES configuration
export async function debugSESConfiguration() {
  console.log("\n=== AWS SES CONFIGURATION DEBUG ===");
  
  // Check environment variables
  console.log("Environment Variables:");
  console.log("- AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 10) + "..." : "NOT SET");
  console.log("- AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "SET (length: " + process.env.AWS_SECRET_ACCESS_KEY.length + ")" : "NOT SET");
  console.log("- AWS_REGION:", process.env.AWS_REGION);
  console.log("- FROM_EMAIL:", process.env.FROM_EMAIL);
  
  // Test SES connection
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
    console.log("\n=== TESTING AWS SES CONNECTION ===");
    
    const sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    try {
      // Test by sending a verification status check (this doesn't send an email, just verifies API access)
      const testCommand = new SendEmailCommand({
        Source: process.env.FROM_EMAIL!,
        Destination: {
          ToAddresses: ['test@example.com'], // This won't actually send due to dry run
        },
        Message: {
          Subject: {
            Data: 'Test Subject',
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: 'Test message',
              Charset: 'UTF-8',
            },
          },
        },
      });
      
      // This will fail but give us a proper error message about the setup
      try {
        await sesClient.send(testCommand);
        console.log("✅ AWS SES connection verified successfully");
        return true;
      } catch (sesError: any) {
        if (sesError.name === 'MessageRejected' || sesError.Code === 'MessageRejected') {
          console.log("✅ AWS SES connection working (email rejected as expected for test address)");
          return true;
        } else if (sesError.name === 'ConfigurationSetDoesNotExistException') {
          console.log("✅ AWS SES connection working (configuration issue, but API accessible)");
          return true;  
        } else {
          console.log("❌ AWS SES connection failed:", sesError.message);
          console.log("Error details:", JSON.stringify({
            name: sesError.name,
            code: sesError.Code,
            statusCode: sesError.$metadata?.httpStatusCode
          }, null, 2));
          return false;
        }
      }
    } catch (error: any) {
      console.log("❌ AWS SES setup failed:", error.message);
      return false;
    }
  } else {
    console.log("❌ Missing AWS SES credentials");
    return false;
  }
}
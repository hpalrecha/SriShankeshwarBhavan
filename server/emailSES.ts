import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize SES client with region
const sesClient = new SESClient({
  region: 'ap-south-1', // Asia Pacific (Mumbai)
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmailViaSES(options: EmailOptions): Promise<boolean> {
  try {
    console.log(`Sending email via AWS SES to: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL!,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await sesClient.send(command);
    console.log(`✅ Email sent successfully via AWS SES! MessageId: ${result.MessageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email via AWS SES:', error);
    return false;
  }
}
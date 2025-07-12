# How to Add AWS SES Credentials in Replit

## Step 1: Access Replit Environment Variables
1. In your Replit project, look for the **"Secrets"** or **"Environment Variables"** tab in the left sidebar
2. If you don't see it, click on the **"Tools"** or **"Settings"** menu

## Step 2: Add These 4 Environment Variables
Click **"Add new secret"** for each of these:

### Required AWS SES Variables:

**1. AWS_REGION**
- Key: `AWS_REGION`
- Value: Your AWS region (e.g., `us-east-1`, `ap-south-1`, `us-west-2`)

**2. AWS_ACCESS_KEY_ID**
- Key: `AWS_ACCESS_KEY_ID` 
- Value: Your AWS Access Key ID (starts with `AKIA...`)

**3. AWS_SECRET_ACCESS_KEY**
- Key: `AWS_SECRET_ACCESS_KEY`
- Value: Your AWS Secret Access Key (long string)

**4. FROM_EMAIL**
- Key: `FROM_EMAIL`
- Value: Your verified sender email in AWS SES (e.g., `noreply@yourhotel.com`)

## Step 3: Get AWS SES Credentials

### If you don't have AWS SES set up:

1. **Go to AWS Console** → Search for "SES" (Simple Email Service)

2. **Verify Your Email Address:**
   - Go to SES → Email Addresses → Verify a New Email Address
   - Enter your email and verify it via the confirmation email

3. **Create IAM User for SES:**
   - Go to IAM → Users → Create User
   - Give it a name like "hotel-booking-ses"
   - Attach policy: `AmazonSESFullAccess`
   - Create Access Keys and copy the Key ID and Secret

4. **Test Email Sending:**
   - In SES, you can send a test email to verify everything works

## Step 4: Restart Your Replit Application
After adding all 4 environment variables, restart your Replit app. You should see:
- No more "AWS SES not configured" warnings
- Email confirmations will be sent for bookings

## Email Notifications That Will Work:

✅ **Booking Confirmation** - Sent immediately after booking
✅ **Booking Cancellation** - Sent when booking is cancelled  
✅ **Pre-Check-in Reminder** - Sent at 10:00 AM, day before check-in
✅ **Check-out Reminder** - Sent at 9:00 AM on check-out day

## Troubleshooting:

- **"Email not verified"** → Verify your sender email in AWS SES first
- **"Access Denied"** → Check IAM user has SES permissions
- **"Region error"** → Make sure AWS_REGION matches your SES setup region

Once configured, your hotel booking platform will automatically send professional email notifications to guests!
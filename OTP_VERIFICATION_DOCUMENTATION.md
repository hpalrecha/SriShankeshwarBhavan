# Mobile OTP Verification System Documentation

## Overview
This system implements secure mobile number verification using SMS OTP (One-Time Password) for user authentication and registration. Users can log in using only their mobile number without requiring email or username.

## System Architecture

### Components
1. **SMS Service** - Handles OTP generation and SMS delivery
2. **Authentication API** - Manages OTP sending and verification
3. **Database** - Stores OTP records with expiry and attempt limits
4. **Frontend** - Mobile login interface with OTP input

## Technical Implementation

### 1. SMS Service Provider: ComBirds API

**Provider**: ComBirds SMS Gateway  
**API Base URL**: `https://api.combirds.com/sms/v3`

#### Required Environment Variables:
```env
COMBIRDS_API_KEY=your_api_key_here
COMBIRDS_USER_ID=your_user_id
COMBIRDS_PASSWORD=your_password
COMBIRDS_HEADER=your_sender_id (e.g., "EDUMARC")
COMBIRDS_OTP_API_KEY=your_otp_template_id
```

#### SMS Template (DLT Approved):
```
Your Sri Shankeshwar Bengaluru Bhavan OTP for verification is: {OTP}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies
```

### 2. Database Schema

#### OTP Verifications Table:
```sql
CREATE TABLE otp_verifications (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Users Table (Mobile-First):
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),              -- Optional now
  mobile VARCHAR(20) NOT NULL UNIQUE, -- Primary identifier
  password VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  is_trustee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. API Endpoints

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "mobile": "7760807137"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "mobile": "7760807137",
  "expiresIn": 300
}
```

#### Verify OTP & Login
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "mobile": "7760807137",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "User 7760807137",
    "mobile": "7760807137",
    "email": null,
    "isTrustee": false
  }
}
```

## Implementation Details

### 1. SMS Service Class (`server/sms-service.ts`)

```typescript
export class SMSService {
  async sendOTP(mobile: string, otp: string): Promise<OTPResponse> {
    // Clean mobile number (remove +91 if present)
    const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
    
    // Use DLT approved template
    const message = `Your Sri Shankeshwar Bengaluru Bhavan OTP for verification is: ${otp}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies`;
    
    const payload = {
      number: [cleanMobile],
      message: message,
      senderId: this.config.senderId,
      templateId: this.config.otpTemplateId
    };

    const response = await fetch(`${this.config.baseUrl}/sendsms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    // Handle response and return success/failure
  }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

### 2. Authentication Flow (`server/routes.ts`)

#### Send OTP Process:
1. **Validate mobile number** - Must be 10-digit Indian format (6-9 starting digit)
2. **Rate limiting** - 1-minute cooldown between OTP requests
3. **Generate 6-digit OTP** - Random numeric code
4. **Store in database** - With 5-minute expiry
5. **Send via SMS** - Using ComBirds API
6. **Cleanup expired OTPs** - Automatic cleanup on each request

#### Verify OTP Process:
1. **Validate input** - Mobile and OTP required
2. **Find OTP record** - Match mobile + OTP combination
3. **Check expiry** - Must be within 5 minutes
4. **Limit attempts** - Maximum 3 failed attempts per OTP
5. **Mark as verified** - Update database record
6. **User creation/login** - Auto-create user if first time
7. **Set session** - Establish authenticated session

### 3. Security Features

#### Rate Limiting:
- **1 minute** cooldown between OTP requests
- **3 attempts** maximum per OTP
- **5 minutes** OTP expiry time

#### Mobile Number Validation:
```typescript
// Indian mobile number format: 10 digits starting with 6-9
if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
  return res.status(400).json({ 
    message: "Please enter a valid 10-digit mobile number" 
  });
}
```

#### Automatic Cleanup:
```sql
DELETE FROM otp_verifications 
WHERE expires_at < NOW();
```

## Frontend Implementation

### Login Component (`client/src/pages/auth/login.tsx`)

```typescript
// Mobile OTP Login Flow
const handleSendOTP = async () => {
  const response = await apiRequest('POST', '/api/auth/send-otp', { 
    mobile: mobileNumber 
  });
  // Show OTP input field
  setOtpSent(true);
};

const handleVerifyOTP = async () => {
  const response = await apiRequest('POST', '/api/auth/verify-otp', {
    mobile: mobileNumber,
    otp: otpCode
  });
  
  if (response.ok) {
    // User logged in successfully
    navigate('/dashboard');
  }
};
```

## Setup Instructions for New Systems

### 1. ComBirds Account Setup
1. **Register** at [ComBirds.com](https://combirds.com)
2. **Verify your business** documents for SMS approval
3. **Get DLT template approved** for OTP messages
4. **Obtain credentials**:
   - API Key
   - User ID  
   - Password
   - Sender ID (Header)
   - Template ID for OTP

### 2. Environment Configuration
```env
# ComBirds SMS Configuration
COMBIRDS_API_KEY=your_api_key_from_combirds_dashboard
COMBIRDS_USER_ID=your_user_id_from_combirds
COMBIRDS_PASSWORD=your_password_from_combirds
COMBIRDS_HEADER=your_approved_sender_id (e.g., "EDUMARC")
COMBIRDS_OTP_API_KEY=your_dlt_template_id_for_otp
```

### 3. Database Migration
```sql
-- Create OTP verification table
CREATE TABLE otp_verifications (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Modify users table to make email optional
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD UNIQUE (mobile);
```

### 4. Code Integration
1. **Copy SMS service** class with ComBirds integration
2. **Add API endpoints** for send-otp and verify-otp
3. **Update storage layer** with OTP CRUD operations
4. **Modify authentication** to support mobile-only login
5. **Update frontend** with mobile OTP login form

## Testing

### Test OTP Flow:
```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"7760807137"}'

# Verify OTP  
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"7760807137","otp":"123456"}'
```

## Production Considerations

### 1. Security
- Implement IP-based rate limiting
- Add CAPTCHA for repeated attempts
- Log all OTP attempts for monitoring
- Use HTTPS for all API calls

### 2. Monitoring
- Track SMS delivery rates
- Monitor failed verification attempts
- Set up alerts for unusual patterns

### 3. Compliance
- Ensure DLT template approval in India
- Follow telecom regulations
- Implement opt-out mechanisms

## Cost Optimization

### SMS Provider Alternatives:
1. **ComBirds** - Current provider (₹0.15-0.25/SMS)
2. **Twilio** - International (₹0.50-1.00/SMS)
3. **MSG91** - Indian provider (₹0.12-0.20/SMS)
4. **TextLocal** - UK-based (₹0.18-0.30/SMS)

### Best Practices:
- Cache OTPs to avoid duplicate sends
- Implement exponential backoff for failures
- Use bulk SMS plans for volume discounts
- Monitor and optimize delivery rates

## Troubleshooting

### Common Issues:
1. **OTP not received** - Check mobile number format and SMS credits
2. **Invalid OTP error** - Verify expiry time and attempt limits  
3. **SMS delivery failure** - Check ComBirds API credentials and template ID
4. **Rate limiting** - Implement proper cooldown periods

### Debug Commands:
```bash
# Check OTP records
SELECT * FROM otp_verifications WHERE mobile = '7760807137' ORDER BY created_at DESC LIMIT 5;

# Clear expired OTPs
DELETE FROM otp_verifications WHERE expires_at < NOW();
```

This documentation provides everything needed to replicate the mobile OTP verification system in a new project.
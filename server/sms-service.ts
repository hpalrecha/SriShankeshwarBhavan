import fetch from 'node-fetch';

interface ComBirdsConfig {
  userId: string;
  password: string;
  otpApiKey: string;
  header: string;
  baseUrl: string;
}

interface OTPResponse {
  success: boolean;
  message: string;
  otp?: string;
  requestId?: string;
}

export class SMSService {
  private config: ComBirdsConfig;

  constructor() {
    this.config = {
      userId: process.env.COMBIRDS_USER_ID!,
      password: process.env.COMBIRDS_PASSWORD!,
      otpApiKey: process.env.COMBIRDS_OTP_API_KEY!,
      header: process.env.COMBIRDS_HEADER!,
      baseUrl: 'https://www.combirds.com/api/v2.0'
    };

    if (!this.config.userId || !this.config.password || !this.config.otpApiKey || !this.config.header) {
      throw new Error('ComBirds SMS credentials are not properly configured');
    }
  }

  async sendOTP(mobile: string, otp: string): Promise<OTPResponse> {
    try {
      // Clean mobile number (remove country code if present)
      const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
      
      // Format message with proper DLT template format
      const message = `${otp} is your OTP for Sri Shankeshwar Bengaluru Bhavan. Valid for 5 minutes. Do not share with anyone.`;
      
      // ComBirds SMS API endpoint with proper parameters
      const url = 'https://combirds.com/api/sendsms.php';
      
      const params = new URLSearchParams({
        username: this.config.userId,
        password: this.config.password,
        mobile: cleanMobile,
        message: message,
        sender: this.config.header,
        type: 'unicode',
        duplicate: '1' // Allow duplicate messages
      });

      console.log(`📱 Sending OTP to ${cleanMobile} via ComBirds SMS API...`);
      console.log(`🔗 API URL: ${url}?${params.toString()}`);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SSBB-OTP-Service/1.0'
        }
      });

      const result = await response.text();
      console.log(`📥 ComBirds Response: ${result}`);
      
      // Check for successful response patterns
      if (response.ok && result && !result.includes('DOCTYPE') && !result.includes('<html>')) {
        // ComBirds typically returns message ID or success code
        if (result.includes('success') || result.match(/^\d+$/) || result.includes('1701') || result.includes('submitted')) {
          console.log(`✅ OTP sent successfully to ${cleanMobile}`);
          return {
            success: true,
            message: 'OTP sent successfully',
            requestId: result.trim()
          };
        }
      }
      
      // If we get HTML response or error
      console.error(`❌ ComBirds SMS API Error: ${result.substring(0, 200)}...`);
      return {
        success: false,
        message: 'SMS delivery failed - API endpoint error'
      };
      
    } catch (error) {
      console.error('SMS Service Error:', error);
      return {
        success: false,
        message: 'SMS service temporarily unavailable'
      };
    }
  }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const smsService = new SMSService();
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
      
      // Format message with header
      const message = `${otp} is your OTP for Sri Shankeshwar Bengaluru Bhavan. Valid for 5 minutes. Do not share with anyone. - ${this.config.header}`;
      
      const url = `${this.config.baseUrl}/sendsms.php`;
      
      // ComBirds API parameters
      const params = new URLSearchParams({
        user: this.config.userId,
        password: this.config.password,
        msisdn: cleanMobile,
        sid: this.config.header,
        msg: message,
        fl: '0', // Flash message flag
        gwid: '2' // Gateway ID for OTP
      });

      console.log(`📱 Sending OTP to ${cleanMobile}...`);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sri Shankeshwar Bengaluru Bhavan SMS Service'
        }
      });

      const result = await response.text();
      
      // ComBirds returns a simple text response
      if (response.ok && (result.includes('1701') || result.includes('success') || result.includes('submitted'))) {
        console.log(`✅ OTP sent successfully to ${cleanMobile}, Response: ${result}`);
        return {
          success: true,
          message: 'OTP sent successfully',
          requestId: result.trim()
        };
      } else {
        console.error(`❌ ComBirds SMS API Error: ${result}`);
        return {
          success: false,
          message: `SMS delivery failed: ${result}`
        };
      }
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
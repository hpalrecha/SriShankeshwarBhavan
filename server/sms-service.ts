import fetch from 'node-fetch';

interface SMSConfig {
  apiKey: string;
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
  private config: SMSConfig;

  constructor() {
    this.config = {
      apiKey: process.env.SMS_API_KEY || '0a996da85fd9461d80ff9c3c1c732de8',
      header: process.env.SMS_HEADER || 'EDUMRC',
      baseUrl: 'https://sms.combirds.com/api'
    };
  }

  async sendOTP(mobile: string, otp: string): Promise<OTPResponse> {
    try {
      // Clean mobile number (remove country code if present)
      const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
      
      // Format message
      const message = `Your OTP for Sri Shankeshwar Bengaluru Bhavan is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
      
      const url = `${this.config.baseUrl}/send-sms`;
      const payload = {
        apikey: this.config.apiKey,
        mobile: cleanMobile,
        message: message,
        header: this.config.header
      };

      console.log(`📱 Sending OTP to ${cleanMobile}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as any;
      
      if (response.ok && result.status === 'success') {
        console.log(`✅ OTP sent successfully to ${cleanMobile}`);
        return {
          success: true,
          message: 'OTP sent successfully',
          requestId: result.request_id
        };
      } else {
        console.error(`❌ SMS API Error:`, result);
        return {
          success: false,
          message: result.message || 'Failed to send OTP'
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
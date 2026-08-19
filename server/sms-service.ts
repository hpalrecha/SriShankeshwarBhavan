import fetch from 'node-fetch';

interface ComBirdsConfig {
  apiKey: string;
  senderId: string;
  baseUrl: string;
  otpTemplateId: string;
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
      apiKey: process.env.COMBIRDS_OTP_API_KEY!,
      senderId: process.env.COMBIRDS_HEADER!,
      baseUrl: 'https://smsapi.edumarcsms.com/api/v1',
      otpTemplateId: '1707168926925165526' // From the documentation
    };

    if (!this.config.apiKey || !this.config.senderId) {
      throw new Error('ComBirds SMS credentials are not properly configured');
    }
  }

  async sendOTP(mobile: string, otp: string): Promise<OTPResponse> {
    try {
      // Clean mobile number (remove country code if present)
      const cleanMobile = mobile.replace(/^\+91/, '').replace(/\s+/g, '');
      
      // Use the DLT approved OTP template from documentation
      // Template: "Your {#var#} OTP for verification is: {#var#}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies"
      const message = `Your Sri Shankeshwar Bengaluru Bhavan OTP for verification is: ${otp}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies`;
      
      const url = `${this.config.baseUrl}/sendsms`;
      
      const payload = {
        number: [cleanMobile],
        message: message,
        senderId: this.config.senderId,
        templateId: this.config.otpTemplateId
      };

      console.log(`📱 Sending OTP to ${cleanMobile} via ComBirds API...`);
      console.log(`🔗 Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as any;
      console.log(`📥 ComBirds Response:`, result);
      
      // Check for successful response
      if (response.ok && result) {
        if (result.success || result.status === 'success' || result.transactionId) {
          console.log(`✅ OTP sent successfully to ${cleanMobile}`);
          return {
            success: true,
            message: 'OTP sent successfully',
            requestId: result.transactionId || result.id || 'sent'
          };
        } else {
          console.error(`❌ ComBirds API Error:`, result);
          return {
            success: false,
            message: result.message || 'SMS delivery failed'
          };
        }
      } else {
        console.error(`❌ HTTP Error ${response.status}:`, result);
        return {
          success: false,
          message: `API request failed: ${response.status}`
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
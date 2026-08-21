import fetch from 'node-fetch';
import type { RoomBooking, User, RoomCategory } from "@shared/schema";

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken?: string;
  isEnabled: boolean;
}

interface WhatsAppTemplate {
  name: string;
  language: {
    code: string;
  };
  components?: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
    }>;
  }>;
}

interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: WhatsAppTemplate;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;

  setConfig(config: WhatsAppConfig) {
    this.config = config;
    console.log(`🔧 WhatsApp config updated - Enabled: ${config.isEnabled}, HasToken: ${!!config.accessToken}, HasPhoneId: ${!!config.phoneNumberId}, HasBusinessId: ${!!config.businessAccountId}`);
  }

  getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config && 
      this.config.isEnabled && 
      this.config.accessToken && 
      this.config.phoneNumberId && 
      this.config.businessAccountId);
  }

  private async sendTemplate(phoneNumber: string, notificationType: string, parameters: string[] = []): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log(`❌ WhatsApp not properly configured - Config exists: ${!!this.config}, Enabled: ${this.config?.isEnabled || false}, HasCredentials: ${!!(this.config?.accessToken && this.config?.phoneNumberId && this.config?.businessAccountId)}`);
      return false;
    }

    try {
      // Import storage dynamically to avoid circular dependency
      const { storage } = await import('./storage');
      
      // Get the template mapping for this notification type
      const templates = await storage.getWhatsAppTemplates();
      const templateMapping = templates.find(t => t.notificationType === notificationType && t.isActive);
      
      if (!templateMapping) {
        console.log(`No active WhatsApp template mapping found for ${notificationType}`);
        return false;
      }

      console.log(`📱 Sending WhatsApp notification: ${notificationType} to ${phoneNumber} using template: ${templateMapping.templateName}`);
      console.log(`📋 Parameters being sent:`, parameters);

      // Build components based on template type
      let components: any[] = [];
      
      if (notificationType === 'daily_room_report') {
        // MARKETING template requires both header and body components
        components = [
          {
            type: 'header',
            parameters: [{
              type: 'text',
              text: parameters[0] || new Date().toLocaleDateString() // Date for header
            }]
          },
          {
            type: 'body',
            parameters: parameters.slice(1).map(param => ({
              type: 'text',
              text: param
            }))
          }
        ];
      } else if (notificationType === 'otp_verification') {
        // Authentication templates with a Copy Code button need a matching
        // BUTTON component alongside the body - Meta rejects the send
        // otherwise ("Button at index 0 of type Url requires a parameter").
        // The button's sub_type is 'url' even though the UI calls it
        // "Copy code"; verified directly against the Graph API.
        components = [
          { type: 'body', parameters: [{ type: 'text', text: parameters[0] }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: parameters[0] }] }
        ];
      } else if (parameters.length > 0) {
        // Other templates just need body parameters
        components = [{
          type: 'body',
          parameters: parameters.map(param => ({
            type: 'text',
            text: param
          }))
        }];
      }

      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateMapping.templateName, // Use the actual Meta template name
          language: {
            code: 'en'
          },
          components: components.length > 0 ? components : undefined
        }
      };



      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config!.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      const result = await response.json() as any;
      
      if (response.ok) {
        console.log(`✅ WhatsApp message sent successfully to ${phoneNumber}:`, result);
        return true;
      } else {
        console.error(`❌ WhatsApp API error for ${phoneNumber}:`, result);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ WhatsApp send error for ${phoneNumber}:`, error.message);
      return false;
    }
  }

  // Sends a login/signup OTP via WhatsApp. Requires an Authentication-category
  // template approved in Meta Business Manager, mapped in the admin panel as
  // notificationType 'otp_verification'. Until that template exists this safely
  // returns false (same as any other unconfigured notification type) so callers
  // can fall through to another channel without special-casing.
  async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const formatted = this.formatPhoneNumber(phoneNumber);
    if (!formatted) {
      console.log("❌ WhatsApp OTP: no valid phone number");
      return false;
    }
    return this.sendTemplate(formatted, 'otp_verification', [otp]);
  }

  async sendBookingConfirmation(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    console.log(`🔍 WhatsApp sendBookingConfirmation called for booking: ${booking.bookingId}`);
    console.log(`📞 Original phone from booking: ${booking.primaryGuestPhone}`);
    console.log(`👤 User mobile: ${user?.mobile}`);
    
    const phoneNumber = this.formatPhoneNumber(booking.primaryGuestPhone || user?.mobile);
    console.log(`📱 Formatted phone number: ${phoneNumber}`);
    
    if (!phoneNumber) {
      console.log("❌ No valid phone number found");
      return false;
    }

    // Get template mapping to check if parameters are needed
    const { storage } = await import('./storage');
    const templates = await storage.getWhatsAppTemplates();
    const templateMapping = templates.find(t => t.notificationType === 'booking_confirmation' && t.isActive);
    
    console.log(`🔍 Template mapping found: ${templateMapping?.templateName}, ID: ${templateMapping?.id}`);
    
    // hello_world template doesn't accept parameters, so send empty array
    let parameters: string[] = [];
    
    // Only add parameters if the template supports them (not hello_world)
    if (templateMapping && templateMapping.templateName !== 'hello_world') {
      console.log(`📝 Template ${templateMapping.templateName} supports parameters, adding 7 params`);
      parameters = [
        user?.name || booking.primaryGuestName || 'Guest',
        booking.bookingId,
        category.name,
        new Date(booking.checkinDate).toLocaleDateString('en-IN'),
        new Date(booking.checkoutDate).toLocaleDateString('en-IN'),
        booking.guests.toString(),
        `₹${booking.totalAmount}`
      ];
    } else {
      console.log(`📝 Template ${templateMapping?.templateName || 'unknown'} does NOT support parameters, using empty array`);
    }

    console.log(`📋 Final WhatsApp parameters for ${templateMapping?.templateName || 'unknown'}:`, parameters);
    return await this.sendTemplate(phoneNumber, 'booking_confirmation', parameters);
  }

  async sendBookingCancellation(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.primaryGuestPhone || user?.mobile);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.primaryGuestName || 'Guest',
      booking.bookingId,
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'booking_cancellation', parameters);
  }

  async sendPreCheckinReminder(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.primaryGuestPhone || user?.mobile);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.primaryGuestName || 'Guest',
      booking.bookingId,
      new Date(booking.checkinDate).toLocaleDateString('en-IN'),
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'pre_checkin_reminder', parameters);
  }

  async sendCheckinDayWelcome(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.primaryGuestPhone || user?.mobile);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.primaryGuestName || 'Guest',
      booking.bookingId,
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'checkin_day_welcome', parameters);
  }

  async sendPostCheckoutFeedback(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.primaryGuestPhone || user?.mobile);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.primaryGuestName || 'Guest',
      booking.bookingId
    ];

    return await this.sendTemplate(phoneNumber, 'post_checkout_feedback', parameters);
  }

  // Send daily room availability report
  async sendDailyRoomReport(
    phoneNumber: string,
    totalRoomsBooked: number,
    totalRoomsAvailable: number,
    totalGuests: number,
    targetDate: string
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) return false;

    // Meta template expects: Date (header), Date, Total, Available, Booked, Guests, Categories (body)
    const totalRooms = totalRoomsBooked + totalRoomsAvailable;
    const roomBreakdown = `2 Beds Room: ${totalRoomsAvailable} available, ${totalRoomsBooked} booked`;
    
    // Meta template structure: Header(Date) + Body(Date, Total, Available, Booked, Guests, Categories)
    const parameters = [
      targetDate,                     // Header parameter: {{1}} Date  
      targetDate,                     // Body {{1}} Date
      totalRooms.toString(),          // Body {{2}} Total Rooms
      totalRoomsAvailable.toString(), // Body {{3}} Available
      totalRoomsBooked.toString(),    // Body {{4}} Booked
      totalGuests.toString(),         // Body {{5}} Expected Guests
      roomBreakdown                   // Body {{6}} Room Categories breakdown
    ];

    return this.sendTemplate(formattedPhone, "daily_room_report", parameters);
  }

  // Send sold out alert
  async sendSoldOutAlert(
    phoneNumber: string,
    targetDate: string
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) return false;

    // Meta template expects: Total rooms, Date, Alert time
    const totalRooms = "15"; // Total rooms in hotel
    const alertTime = new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    
    const parameters = [
      totalRooms,  // {{1}} Total rooms count
      targetDate,  // {{2}} Sold out date
      alertTime    // {{3}} Alert time
    ];

    return this.sendTemplate(formattedPhone, "sold_out_alert", parameters);
  }

  private formatPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    console.log(`📞 Processing phone: "${phone}" -> digits: "${digits}" (length: ${digits.length})`);
    
    // If starts with 91 and is 12 digits, use as is
    if (digits.startsWith('91') && digits.length === 12) {
      console.log(`✅ Valid 91-prefixed number: ${digits}`);
      return digits;
    }
    
    // If 10 digits, add 91 prefix
    if (digits.length === 10) {
      const formatted = '91' + digits;
      console.log(`✅ Added 91 prefix: ${formatted}`);
      return formatted;
    }
    
    // If 11 digits starting with 0, remove 0 and add 91
    if (digits.length === 11 && digits.startsWith('0')) {
      const formatted = '91' + digits.substring(1);
      console.log(`✅ Removed leading 0 and added 91: ${formatted}`);
      return formatted;
    }
    
    // If exactly 11 digits not starting with 0, assume it's country code + number
    if (digits.length === 11) {
      const formatted = '91' + digits.substring(1);
      console.log(`✅ Treated as international format, adjusted to: ${formatted}`);
      return formatted;
    }
    
    console.error(`❌ Invalid phone number format: "${phone}" -> digits: "${digits}" (${digits.length} digits)`);
    return null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config || !this.config.isEnabled) {
      return false;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.businessAccountId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async fetchTemplatesFromMeta(): Promise<any[]> {
    if (!this.config || !this.config.isEnabled) {
      throw new Error("WhatsApp not configured or disabled");
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.businessAccountId}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(`Meta API Error: ${errorData.error?.message || 'Failed to fetch templates'}`);
      }

      const result = await response.json() as any;
      return result.data || [];
    } catch (error: any) {
      console.error("Error fetching templates from Meta:", error);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();

export interface WhatsAppTemplateMapping {
  id: number;
  notificationType: 'booking_confirmation' | 'booking_cancellation' | 'pre_checkin_reminder' | 'checkin_day_welcome' | 'post_checkout_feedback';
  templateName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
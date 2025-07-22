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
  }

  getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  private async sendTemplate(phoneNumber: string, notificationType: string, parameters: string[] = []): Promise<boolean> {
    if (!this.config || !this.config.isEnabled) {
      console.log("WhatsApp is not configured or disabled");
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

      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateMapping.templateName, // Use the actual Meta template name
          language: {
            code: 'en'
          },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }] : undefined
        }
      };

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      
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

  async sendBookingConfirmation(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    console.log(`🔍 WhatsApp sendBookingConfirmation called for booking: ${booking.bookingId}`);
    console.log(`📞 Original phone from booking: ${booking.phone}`);
    console.log(`👤 User mobile: ${user?.mobile}`);
    
    const phoneNumber = this.formatPhoneNumber(booking.phone || user?.mobile);
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
        user?.name || booking.name,
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
    const phoneNumber = this.formatPhoneNumber(booking.phone);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.name,
      booking.bookingId,
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'booking_cancellation', parameters);
  }

  async sendPreCheckinReminder(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.phone);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.name,
      booking.bookingId,
      new Date(booking.checkinDate).toLocaleDateString('en-IN'),
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'pre_checkin_reminder', parameters);
  }

  async sendCheckinDayWelcome(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.phone);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.name,
      booking.bookingId,
      category.name
    ];

    return await this.sendTemplate(phoneNumber, 'checkin_day_welcome', parameters);
  }

  async sendPostCheckoutFeedback(booking: RoomBooking, user: User | null, category: RoomCategory): Promise<boolean> {
    const phoneNumber = this.formatPhoneNumber(booking.phone);
    if (!phoneNumber) return false;

    const parameters = [
      user?.name || booking.name,
      booking.bookingId
    ];

    return await this.sendTemplate(phoneNumber, 'post_checkout_feedback', parameters);
  }

  private formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 91, use as is
    if (digits.startsWith('91') && digits.length === 12) {
      return digits;
    }
    
    // If 10 digits, add 91 prefix
    if (digits.length === 10) {
      return '91' + digits;
    }
    
    console.error(`Invalid phone number format: ${phone}`);
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
        const errorData = await response.json();
        throw new Error(`Meta API Error: ${errorData.error?.message || 'Failed to fetch templates'}`);
      }

      const result = await response.json();
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
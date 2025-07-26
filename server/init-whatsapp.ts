import { whatsappService } from "./whatsapp";
import { storage } from "./storage";

export async function initializeWhatsApp(): Promise<void> {
  try {
    console.log("Initializing WhatsApp service...");
    
    // Always use database config first - this is what the frontend admin panel manages
    const config = await storage.getWhatsAppConfig();
    
    if (config && config.isEnabled) {
      whatsappService.setConfig({
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        webhookVerifyToken: config.webhookVerifyToken || undefined,
        isEnabled: config.isEnabled,
      });
      console.log(`✅ WhatsApp initialized from DATABASE config - Enabled: ${config.isEnabled}`);
      console.log(`📱 Using Phone ID: ${config.phoneNumberId.substring(0, 8)}...`);
    } else {
      console.log("❌ No active WhatsApp configuration in database - service disabled");
      console.log("💡 Configure WhatsApp through the admin panel at /admin");
    }
  } catch (error) {
    console.error("Failed to initialize WhatsApp service:", error);
  }
}
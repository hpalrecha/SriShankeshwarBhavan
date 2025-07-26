import { whatsappService } from "./whatsapp";
import { storage } from "./storage";

export async function initializeWhatsApp(): Promise<void> {
  try {
    console.log("Initializing WhatsApp service...");
    
    const config = await storage.getWhatsAppConfig();
    
    if (config) {
      whatsappService.setConfig({
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        webhookVerifyToken: config.webhookVerifyToken || undefined,
        isEnabled: config.isEnabled ?? false,
      });
      console.log(`WhatsApp service initialized - Enabled: ${config.isEnabled}`);
    } else {
      console.log("No WhatsApp configuration found - service disabled");
    }
  } catch (error) {
    console.error("Failed to initialize WhatsApp service:", error);
  }
}
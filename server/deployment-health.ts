// Deployment health check endpoint
import type { Express } from "express";
import { db } from "./db";
import { whatsappService } from "./whatsapp";
import { storage } from "./storage";

export function addHealthCheck(app: Express) {
  app.get("/api/health", async (req, res) => {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: false,
        whatsapp: false,
        whatsappConfig: false
      },
      details: {} as any
    };

    try {
      // Test database connection
      const testQuery = await db.execute({ sql: "SELECT 1 as test", args: [] });
      health.checks.database = true;
      health.details.database = "Connected successfully";
    } catch (error: any) {
      health.checks.database = false;
      health.details.database = `Connection failed: ${error.message}`;
      health.status = "degraded";
    }

    try {
      // Test WhatsApp configuration
      const config = await storage.getWhatsAppConfig();
      health.checks.whatsappConfig = !!(config && config.isEnabled);
      health.details.whatsappConfig = config ? {
        enabled: config.isEnabled,
        hasToken: !!config.accessToken,
        hasPhoneId: !!config.phoneNumberId,
        hasBusinessId: !!config.businessAccountId
      } : "No configuration found";

      // Test WhatsApp service
      if (config && config.isEnabled) {
        const isConfigured = whatsappService.isConfigured();
        health.checks.whatsapp = isConfigured;
        health.details.whatsapp = isConfigured ? "Service configured" : "Service not configured";
      } else {
        health.details.whatsapp = "Configuration disabled";
      }
    } catch (error: any) {
      health.checks.whatsapp = false;
      health.details.whatsapp = `Error: ${error.message}`;
      health.status = "degraded";
    }

    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  });
}
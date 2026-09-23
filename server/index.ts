import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScheduledTasks } from "./scheduledTasks";
import { initializeWhatsApp } from "./init-whatsapp";

// Set AWS credentials for email functionality
process.env.AWS_ACCESS_KEY_ID = "AKIA4JRGW6DNR36B6HSG";
process.env.AWS_SECRET_ACCESS_KEY = "BEhIbMFQqfv8NYUWqWruvE2Za1l0tSCLac2hzM4kaZjY";
process.env.AWS_REGION = "ap-south-1";
process.env.FROM_EMAIL = "booking@ssbb.in";

const app = express();
// The Razorpay (and ICICI) webhook routes verify Razorpay's signature
// against the RAW request body via their own express.raw() middleware -
// they need the untouched byte stream, not a parsed object. If this global
// json() parser ran first, it would consume the body and set req._body,
// which makes body-parser skip the route-specific raw() parser entirely -
// req.body then arrives as a plain object, crypto.createHmac(...).update()
// throws on it, and the webhook 500s on every single delivery. That was
// happening unconditionally, which is almost certainly why Razorpay
// auto-disabled the webhook - not downtime, a 100%-reproducible bug. Skip
// global JSON parsing for exactly those two paths so their own raw()
// middleware gets an unconsumed body.
const RAW_BODY_WEBHOOK_PATHS = ["/api/payment/razorpay/webhook", "/api/payment/icici/webhook"];
app.use((req, res, next) => {
  if (RAW_BODY_WEBHOOK_PATHS.includes(req.path)) return next();
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Serve uploaded files statically
  const path = await import("path");
  app.use('/uploads', (await import("express")).static(path.join(process.cwd(), 'uploads')));
  // express.static calls next() on a miss rather than 404ing - without this,
  // a missing upload falls through to the SPA catch-all and returns 200 with
  // index.html, so <img> tags never see a real error and never fall back.
  app.use('/uploads', (_req, res) => {
    res.status(404).json({ message: "File not found" });
  });
  
  const server = await registerRoutes(app);
  
  // Initialize WhatsApp service with stored configuration
  await initializeWhatsApp();
  
  // Initialize scheduled email tasks
  initializeScheduledTasks();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  // SO_REUSEPORT isn't supported on Windows sockets (ENOTSUP) - only pass it
  // on platforms that actually support it (this app's deploy target, Linux).
  server.listen({
    port,
    host: "0.0.0.0",
    ...(process.platform !== "win32" ? { reusePort: true } : {}),
  }, () => {
    log(`serving on port ${port}`);
  });
})();

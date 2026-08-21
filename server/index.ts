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
app.use(express.json());
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
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

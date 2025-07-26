import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for both development and production
if (typeof window === 'undefined') {
  // Server-side: use ws library
  neonConfig.webSocketConstructor = ws;
} else {
  // Client-side: use native WebSocket (shouldn't happen in server code but good safety)
  neonConfig.webSocketConstructor = WebSocket;
}

// Additional configuration for production deployments
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
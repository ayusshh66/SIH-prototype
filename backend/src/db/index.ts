import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

let dbInstance: any = null;

if (isDatabaseConfigured) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    dbInstance = drizzle({ client: sql, schema });
  } catch (err) {
    console.warn("⚠️ Failed to initialize Neon database client:", err);
  }
} else {
  console.info("ℹ️ DATABASE_URL is not set. DataStore will operate using seeded in-memory operational dataset.");
}

export const db = dbInstance;
export * from "./schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./db/schema/index";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

const sql = neon(process.env.DATABASE_URL);

// Neon HTTP driver expects { client, schema } in a single config object
export const db = drizzle({ client: sql, schema });

export * from "./db/schema/index";
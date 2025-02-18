import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
// require("dotenv").config({ path: ".env.local" });
// Log DATABASE_URL to verify Vercel reads it
// console.log("DATABASE_URL in Vercel:", process.env.DATABASE_URL);

import * as schema from "./schema";

export const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

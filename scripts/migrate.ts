import { config } from "dotenv"; // Load environment variables from .env.local
import { neon } from "@neondatabase/serverless"; // Import Neon database connection
import { drizzle } from "drizzle-orm/neon-http"; // Drizzle ORM for Neon HTTP database connection
import { migrate } from "drizzle-orm/neon-http/migrator"; // Migration tool from Drizzle

// Load environment variables from .env.local file
config({ path: ".env.local" });

// Initialize the database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Main function to run the database migrations
const main = async () => {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migration successful!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
};

// Execute the migration script
main();

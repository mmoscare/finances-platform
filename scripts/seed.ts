import { config } from "dotenv"; // Load environment variables
import { subDays } from "date-fns"; // Date utilities
import { drizzle } from "drizzle-orm/neon-http"; // Drizzle ORM for Neon
import { neon } from "@neondatabase/serverless"; // Neon database connection
import { categories, accounts, transactions } from "@/db/schema"; // Database schema imports
import { eachDayOfInterval, format } from "date-fns"; // Additional date utilities
import { convertAmountToMiliunits } from "@/lib/utils"; // Utility function for converting amounts

// Load environment variables from .env.local file
config({ path: ".env.local" });

// Initialize the database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Seed user ID (used for consistency)
const SEED_USER_ID = "user_2g1JOKQh3QUlqivKbp70wEJobvd";

// Predefined categories for transactions
const SEED_CATEGORIES = [
  { id: "category_1", name: "Food", userId: SEED_USER_ID, plaidId: null },
  { id: "category_2", name: "Rent", userId: SEED_USER_ID, plaidId: null },
  { id: "category_3", name: "Utilities", userId: SEED_USER_ID, plaidId: null },
  { id: "category_7", name: "Clothing", userId: SEED_USER_ID, plaidId: null },
];

// Predefined bank accounts
const SEED_ACCOUNTS = [
  { id: "account_1", name: "Checking", userId: SEED_USER_ID, plaidId: null },
  { id: "account_2", name: "Savings", userId: SEED_USER_ID, plaidId: null },
];

// Date range for generating transactions
const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 90);

// Placeholder for generated transactions
const SEED_TRANSACTIONS: (typeof transactions.$inferSelect)[] = [];

// Function to generate random transaction amounts based on category type
const generateRandomAmount = (category: typeof categories.$inferInsert) => {
  switch (category.name) {
    case "Rent":
      return Math.random() * 400 + 90; // Rent is a higher fixed cost
    case "Utilities":
      return Math.random() * 200 + 50;
    case "Food":
      return Math.random() * 30 + 10;
    default:
      return Math.random() * 50 + 10; // Default for miscellaneous expenses
  }
};

// Function to generate random transactions for a given day
const generateTransactionsForDay = (day: Date) => {
  const numTransactions = Math.floor(Math.random() * 4) + 1; // Between 1 and 4 transactions per day
  for (let i = 0; i < numTransactions; i++) {
    const category =
      SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
    const isExpense = Math.random() > 0.6; // 60% probability of an expense
    const amount = generateRandomAmount(category);
    const formattedAmount = convertAmountToMiliunits(
      isExpense ? -amount : amount
    ); // Convert amount to negative for expenses

    // Push generated transaction to the array
    SEED_TRANSACTIONS.push({
      id: `transaction_${format(day, "yyyy-MM-dd")}_${i}`,
      accountId: SEED_ACCOUNTS[0].id, // Always using first account
      categoryId: category.id,
      date: day,
      amount: formattedAmount,
      payee: "Merchant",
      notes: "Random transaction",
    });
  }
};

// Generate transactions for each day in the interval
const generateTransactions = () => {
  const days = eachDayOfInterval({ start: defaultFrom, end: defaultTo });
  days.forEach((day) => generateTransactionsForDay(day));
};

// Execute transaction generation
generateTransactions();

// Main function to seed the database
const main = async () => {
  try {
    console.log("Resetting database...");
    await db.delete(transactions).execute();
    await db.delete(accounts).execute();
    await db.delete(categories).execute();

    console.log("Seeding categories...");
    await db.insert(categories).values(SEED_CATEGORIES).execute();

    console.log("Seeding accounts...");
    await db.insert(accounts).values(SEED_ACCOUNTS).execute();

    console.log("Seeding transactions...");
    await db.insert(transactions).values(SEED_TRANSACTIONS).execute();

    console.log("Database seeding complete!");
  } catch (error) {
    console.error("Error during seed:", error);
    process.exit(1);
  }
};

// Run the seeding script
main();

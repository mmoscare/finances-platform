import { z } from "zod";
import { Hono } from "hono";
import { and, eq, isNotNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
require("dotenv").config({ path: ".env.local" });

import { db } from "@/db/drizzle";
import { accounts, categories, connectedBanks } from "@/db/schema";

import { convertAmountToMiliunits } from "@/lib/utils";

// 1) Import createTransaction so we can sync both Drizzle & AWS:
import { createTransaction } from "@/db/transactionsOps";

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_TOKEN,
      "PLAID-SECRET": process.env.PLAID_SECRET_TOKEN,
    },
  },
});

const client = new PlaidApi(configuration);

const app = new Hono()

  .get("/connected-bank", clerkMiddleware(), async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [connectedBank] = await db
      .select()
      .from(connectedBanks)
      .where(eq(connectedBanks.userId, auth.userId));

    return c.json({ data: connectedBank || null });
  })

  .delete("/connected-bank", clerkMiddleware(), async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [connectedBank] = await db
      .delete(connectedBanks)
      .where(eq(connectedBanks.userId, auth.userId))
      .returning({ id: connectedBanks.id });

    if (!connectedBank) {
      return c.json({ error: "Not found" }, 404);
    }

    await db
      .delete(accounts)
      .where(
        and(eq(accounts.userId, auth.userId), isNotNull(accounts.plaidId))
      );

    await db
      .delete(categories)
      .where(
        and(eq(categories.userId, auth.userId), isNotNull(categories.plaidId))
      );

    return c.json({ data: connectedBank });
  })

  .post("/create-link-token", clerkMiddleware(), async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = await client.linkTokenCreate({
      user: {
        client_user_id: auth.userId,
      },
      client_name: "Finance Tutorial",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    return c.json({ data: token.data.link_token }, 200);
  })

  .post(
    "/exchange-public-token",
    clerkMiddleware(),
    zValidator(
      "json",
      z.object({
        publicToken: z.string(),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { publicToken } = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const exchange = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const [connectedBank] = await db
        .insert(connectedBanks)
        .values({
          id: createId(),
          userId: auth.userId,
          accessToken: exchange.data.access_token,
        })
        .returning();

      // -------------
      // 1) Fetch transactions, accounts, categories from Plaid
      // -------------
      const plaidTransactions = await client.transactionsSync({
        access_token: connectedBank.accessToken,
      });

      const plaidAccounts = await client.accountsGet({
        access_token: connectedBank.accessToken,
      });

      const plaidCategories = await client.categoriesGet({});

      // -------------
      // 2) Insert accounts into Drizzle (unchanged)
      // -------------
      const newAccounts = await db
        .insert(accounts)
        .values(
          plaidAccounts.data.accounts.map((account) => ({
            id: createId(),
            name: account.name,
            plaidId: account.account_id,
            userId: auth.userId,
          }))
        )
        .returning();

      // -------------
      // 3) Insert categories into Drizzle (unchanged)
      // -------------
      const newCategories = await db
        .insert(categories)
        .values(
          plaidCategories.data.categories.map((category) => ({
            id: createId(),
            name: category.hierarchy.join(", "),
            plaidId: category.category_id,
            userId: auth.userId,
          }))
        )
        .returning();

      // -------------
      // 4) For each Plaid transaction, call createTransaction(...) so Drizzle + AWS both update
      // -------------
      for (const transaction of plaidTransactions.data.added) {
        const account = newAccounts.find(
          (acc) => acc.plaidId === transaction.account_id
        );
        const category = newCategories.find(
          (cat) => cat.plaidId === transaction.category_id
        );
        if (!account) {
          // skip if we can't match the account
          continue;
        }

        const amountInMiliunits = convertAmountToMiliunits(transaction.amount);

        // Use createTransaction(...) from transactionsOps.ts
        await createTransaction({
          id: createId(),
          amount: amountInMiliunits,
          payee: transaction.merchant_name || transaction.name,
          notes: transaction.name,
          date: new Date(transaction.date),
          accountId: account.id,
          categoryId: category?.id ?? null,
        });
      }

      return c.json({ ok: true }, 200);
    }
  );

export default app;

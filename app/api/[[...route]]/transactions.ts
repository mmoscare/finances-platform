import { z } from "zod";
import { Hono } from "hono";
import { parse, subDays } from "date-fns";
import { createId } from "@paralleldrive/cuid2";
import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/db/drizzle";
import {
  transactions,
  insertTransactionSchema,
  categories,
  accounts,
} from "@/db/schema";

// 1) Import your Drizzle + Dynamo ops
import {
  createTransaction as createTxnOps,
  updateTransaction as updateTxnOps,
  deleteTransaction as deleteTxnOps,
} from "@/db/transactionsOps";

// 2) Import AWS SDK items for the /aws route (unchanged)
import { dynamoClient } from "@/aws/awsDynamoClient";
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

const app = new Hono()

  // ----------------------------------------------------------------
  // GET /?from=YYYY-MM-DD&to=...&accountId=...
  // *** UPDATED TO READ FROM DYNAMODB INSTEAD OF DRIZZLE ***
  // ----------------------------------------------------------------
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional(),
      })
    ),
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);
      const { from, to, accountId } = c.req.valid("query");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Default ranges if not specified
      const defaultTo = new Date();
      const defaultFrom = subDays(defaultTo, 30);
      const startDate = from
        ? parse(from, "yyyy-MM-dd", new Date())
        : defaultFrom;
      const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;

      // 1) Fetch all transactions from DynamoDB
      const tableName = "transactions";
      const scanRes = await dynamoClient.send(
        new ScanCommand({
          TableName: tableName,
        })
      );
      const items = scanRes.Items || [];

      // 2) Fetch user’s accounts & categories from Postgres for name lookups
      const userAccounts = await db
        .select({
          accId: accounts.id,
          accName: accounts.name,
        })
        .from(accounts)
        .where(eq(accounts.userId, auth.userId));

      const userCategories = await db
        .select({
          catId: categories.id,
          catName: categories.name,
        })
        .from(categories);
      // categories table typically has userId, or is shared
      // if needed, filter here with eq(categories.userId, auth.userId)
      // Create quick lookups for account/category names
      const accountMap = new Map<string, string>(
        userAccounts.map((a) => [a.accId, a.accName])
      );
      const categoryMap = new Map<string, string>(
        userCategories.map((cat) => [cat.catId, cat.catName])
      );

      // 3) Convert each Dynamo item into the shape we need (including name lookups)
      //    Also filter by user ownership by checking if item.accountId belongs to the current user
      //    Then filter by date range / accountId if needed
      let data = items
        .map((item) => {
          // Attempt to parse item fields
          const txnId = item.id?.S || "";
          const amountStr = item.amount?.N || "0";
          const payee = item.payee?.S || "";
          const notes = item.notes?.S ?? null; // notes might be { NULL: true }
          const dateStr = item.date?.S || "";
          const acctId = item.accountId?.S || "";
          const catId = item.categoryId?.S || null;

          // Convert date, amount
          const dateObj = new Date(dateStr);
          const amountInMiliunits = parseInt(amountStr, 10);

          return {
            id: txnId,
            date: dateObj,
            categoryId: catId,
            // name from categories table (or "Uncategorized" if missing)
            category: catId ? categoryMap.get(catId) ?? null : null,
            payee,
            amount: amountInMiliunits,
            notes,
            accountId: acctId,
            // name from accounts table
            account: acctId ? accountMap.get(acctId) ?? "Unknown" : "Unknown",
          };
        })
        .filter((tx) => {
          // user ownership check: the account ID must be in userAccounts
          // If the transaction’s accountId is not in userAccounts, skip
          if (!accountMap.has(tx.accountId)) {
            return false;
          }

          // Filter by date range
          if (tx.date < startDate || tx.date > endDate) {
            return false;
          }

          // Filter by accountId if provided
          if (accountId && tx.accountId !== accountId) {
            return false;
          }

          return true;
        })
        // Sort descending by date
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // GET /:id
  // *** UPDATED TO READ A SINGLE TRANSACTION FROM DYNAMODB ***
  // ----------------------------------------------------------------
  .get(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      })
    ),
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch item from Dynamo by ID
      const tableName = "transactions";
      const getRes = await dynamoClient.send(
        new GetItemCommand({
          TableName: tableName,
          Key: { id: { S: id } },
        })
      );

      if (!getRes.Item) {
        // Not found in Dynamo
        return c.json({ error: "Not found" }, 404);
      }

      // Also fetch the user’s accounts/categories to check ownership & get names
      const userAccounts = await db
        .select({
          accId: accounts.id,
          accName: accounts.name,
        })
        .from(accounts)
        .where(eq(accounts.userId, auth.userId));

      const userCategories = await db
        .select({
          catId: categories.id,
          catName: categories.name,
        })
        .from(categories);

      const accountMap = new Map<string, string>(
        userAccounts.map((a) => [a.accId, a.accName])
      );
      const categoryMap = new Map<string, string>(
        userCategories.map((cat) => [cat.catId, cat.catName])
      );

      // Parse Dynamo item
      const item = getRes.Item;
      const txnId = item.id?.S || "";
      const amountStr = item.amount?.N || "0";
      const payee = item.payee?.S || "";
      const notes = item.notes?.S ?? null;
      const dateStr = item.date?.S || "";
      const acctId = item.accountId?.S || "";
      const catId = item.categoryId?.S || null;

      // Convert date, amount
      const dateObj = new Date(dateStr);
      const amountInMiliunits = parseInt(amountStr, 10);

      // Check ownership: if accountId not in user’s accounts, 404
      if (!accountMap.has(acctId)) {
        return c.json({ error: "Not found" }, 404);
      }

      const data = {
        id: txnId,
        date: dateObj,
        categoryId: catId,
        category: catId ? categoryMap.get(catId) ?? null : null,
        payee,
        amount: amountInMiliunits,
        notes,
        accountId: acctId,
        account: acctId ? accountMap.get(acctId) ?? "Unknown" : "Unknown",
      };

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // POST /  Create a Single Transaction (Uses Ops) -- UNCHANGED
  // ----------------------------------------------------------------
  .post(
    "/",
    clerkMiddleware(),
    zValidator("json", insertTransactionSchema.omit({ id: true })),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const txnId = createId();

      const data = await createTxnOps({
        id: txnId,
        amount: values.amount,
        payee: values.payee,
        notes: values.notes ?? null,
        date: values.date,
        accountId: values.accountId,
        categoryId: values.categoryId ?? null,
      });

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // POST /bulk-create (Uses Ops) -- UNCHANGED
  // ----------------------------------------------------------------
  .post(
    "/bulk-create",
    clerkMiddleware(),
    zValidator("json", z.array(insertTransactionSchema.omit({ id: true }))),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const results = await Promise.all(
        values.map(async (val) => {
          const newId = createId();
          return createTxnOps({
            id: newId,
            amount: val.amount,
            payee: val.payee,
            notes: val.notes ?? null,
            date: val.date,
            accountId: val.accountId,
            categoryId: val.categoryId ?? null,
          });
        })
      );

      return c.json({ data: results });
    }
  )

  // ----------------------------------------------------------------
  // POST /bulk-delete (Uses Ops) -- UNCHANGED
  // ----------------------------------------------------------------
  .post(
    "/bulk-delete",
    clerkMiddleware(),
    zValidator(
      "json",
      z.object({
        ids: z.array(z.string()),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { ids } = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // check user ownership
      const authorizedIds = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(inArray(transactions.id, ids), eq(accounts.userId, auth.userId))
        );

      const results = await Promise.all(
        authorizedIds.map((row) => deleteTxnOps(row.id))
      );

      return c.json({ data: results.map((r) => ({ id: r.id })) });
    }
  )

  // ----------------------------------------------------------------
  // PATCH /:id (Uses updateTransaction) -- UNCHANGED
  // ----------------------------------------------------------------
  .patch(
    "/:id",
    clerkMiddleware(),
    zValidator("param", z.object({ id: z.string().optional() })),
    zValidator("json", insertTransactionSchema.omit({ id: true })),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }
      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // verify user owns this transaction
      const [rowToUpdate] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!rowToUpdate) {
        return c.json({ error: "Not found" }, 404);
      }

      const data = await updateTxnOps(id, {
        amount: values.amount,
        payee: values.payee,
        notes: values.notes,
        date: values.date,
        accountId: values.accountId,
        categoryId: values.categoryId,
      });

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // DELETE /:id (Uses deleteTransaction) -- UNCHANGED
  // ----------------------------------------------------------------
  .delete(
    "/:id",
    clerkMiddleware(),
    zValidator("param", z.object({ id: z.string().optional() })),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }
      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // verify ownership
      const [rowToDelete] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!rowToDelete) {
        return c.json({ error: "Not found" }, 404);
      }

      const deleted = await deleteTxnOps(id);
      return c.json({ data: { id: deleted.id } });
    }
  )

  // ----------------------------------------------------------------
  // POST /aws (New route to skip duplicates in DynamoDB) -- UNCHANGED
  // ----------------------------------------------------------------
  .post(
    "/aws",
    clerkMiddleware(),
    zValidator(
      "json",
      z.array(
        z.object({
          id: z.string(),
          amount: z.number(),
          payee: z.string(),
          notes: z.string().nullable().optional(),
          date: z.string(),
          accountId: z.string(),
          categoryId: z.string().nullable().optional(),
        })
      )
    ),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const body = c.req.valid("json");
      const tableName = "transactions";
      const results: Array<{ id: string; status: string }> = [];

      for (const tx of body) {
        const getRes = await dynamoClient.send(
          new GetItemCommand({
            TableName: tableName,
            Key: { id: { S: tx.id } },
          })
        );

        if (getRes.Item) {
          results.push({ id: tx.id, status: "skipped_exists" });
        } else {
          await dynamoClient.send(
            new PutItemCommand({
              TableName: tableName,
              Item: {
                id: { S: tx.id },
                amount: { N: tx.amount.toString() },
                payee: { S: tx.payee },
                notes: tx.notes ? { S: tx.notes } : { NULL: true },
                date: { S: tx.date },
                accountId: { S: tx.accountId },
                categoryId: tx.categoryId
                  ? { S: tx.categoryId }
                  : { NULL: true },
              },
            })
          );
          results.push({ id: tx.id, status: "inserted" });
        }
      }

      return c.json({ success: true, results });
    }
  );

export default app;

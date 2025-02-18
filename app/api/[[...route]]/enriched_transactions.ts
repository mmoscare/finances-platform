import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

import { dynamoClient } from "@/aws/awsDynamoClient";
import {
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

const TABLE_NAME = "enriched_transactions";

const app = new Hono();

// 1) CREATE/INSERT multiple enriched_transactions
app.post(
  "/",
  clerkMiddleware(),
  zValidator(
    "json",
    z.array(
      z.object({
        id: z.string(),
        amount: z.number(),
        payee: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        date: z.string(), // or z.date()
        accountId: z.string(),
        categoryId: z.string().nullable().optional(),
        categoryB: z.string().nullable().optional(),
        // Additional fields
        essential: z.string().nullable().optional(),
        rop: z.string().nullable().optional(),
        purpose: z.string().nullable().optional(),
        timing: z.string().nullable().optional(),
      })
    )
  ),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = c.req.valid("json"); // array of items
    const results: Array<{ id: string; status: string }> = [];

    for (const item of body) {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: {
            id: { S: item.id },
            amount: { N: item.amount.toString() },
            payee: item.payee ? { S: item.payee } : { NULL: true },
            notes: item.notes ? { S: item.notes } : { NULL: true },
            date: { S: item.date },
            accountId: { S: item.accountId },
            categoryId: item.categoryId
              ? { S: item.categoryId }
              : { NULL: true },
            categoryB: item.categoryB ? { S: item.categoryB } : { S: "" },

            // NEW FIELDS
            essential: item.essential ? { S: item.essential } : { S: "" },
            rop: item.rop ? { S: item.rop } : { NULL: true },
            purpose: item.purpose ? { S: item.purpose } : { S: "" },
            timing: item.timing ? { S: item.timing } : { S: "" },
          },
        })
      );
      results.push({ id: item.id, status: "inserted" });
    }

    return c.json({ success: true, results }, 200);
  }
);

// 2) LIST all enriched_transactions
app.get("/", clerkMiddleware(), async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const scanResult = await dynamoClient.send(
    new ScanCommand({ TableName: TABLE_NAME })
  );
  const items = scanResult.Items || [];

  const data = items.map((i) => ({
    id: i.id?.S ?? "",
    amount: i.amount?.N ? parseFloat(i.amount.N) : 0,
    payee: i.payee?.S ?? null,
    notes: i.notes?.S ?? null,
    date: i.date?.S ?? "",
    accountId: i.accountId?.S ?? "",
    categoryId: i.categoryId?.S ?? null,
    categoryB: i.categoryB?.S ?? null,

    // NEW fields
    essential: i.essential?.S ?? null,
    rop: i.rop?.S ?? null,
    purpose: i.purpose?.S ?? "",
    timing: i.timing?.S ?? null,
  }));

  return c.json({ data }, 200);
});

// 3) BULK-DELETE enriched_transactions by IDs
app.post(
  "/bulk-delete",
  clerkMiddleware(),
  zValidator("json", z.object({ ids: z.array(z.string()) })),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { ids } = c.req.valid("json");
    const deleted: string[] = [];

    for (const id of ids) {
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: {
            id: { S: id },
          },
        })
      );
      deleted.push(id);
    }

    return c.json(
      {
        success: true,
        message: `${deleted.length} enriched transactions deleted.`,
        deleted,
      },
      200
    );
  }
);

export default app;

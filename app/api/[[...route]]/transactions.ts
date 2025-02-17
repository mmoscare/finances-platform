// import { z } from "zod";
// import { Hono } from "hono";
// import { parse, subDays } from "date-fns";
// import { createId } from "@paralleldrive/cuid2";
// import { zValidator } from "@hono/zod-validator";
// import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
// import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

// import { db } from "@/db/drizzle";
// import {
//   transactions,
//   insertTransactionSchema,
//   categories,
//   accounts
// } from "@/db/schema";

// const app = new Hono()
//   .get(
//     "/",
//     zValidator("query", z.object({
//       from: z.string().optional(),
//       to: z.string().optional(),
//       accountId: z.string().optional(),
//     })),
//     clerkMiddleware(),
//     async (c) => {
//       const auth = getAuth(c);
//       const { from, to, accountId } = c.req.valid("query");

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const defaultTo = new Date();
//       const defaultFrom = subDays(defaultTo, 30);

//       const startDate = from
//         ? parse(from, "yyyy-MM-dd", new Date())
//         : defaultFrom;
//       const endDate = to
//         ? parse(to, "yyyy-MM-dd", new Date())
//         : defaultTo;

//       const data = await db
//         .select({
//           id: transactions.id,
//           date: transactions.date,
//           category: categories.name,
//           categoryId: transactions.categoryId,
//           payee: transactions.payee,
//           amount: transactions.amount,
//           notes: transactions.notes,
//           account: accounts.name,
//           accountId: transactions.accountId,
//         })
//         .from(transactions)
//         .innerJoin(accounts, eq(transactions.accountId, accounts.id))
//         .leftJoin(categories, eq(transactions.categoryId, categories.id))
//         .where(
//           and(
//             accountId ? eq(transactions.accountId, accountId) : undefined,
//             eq(accounts.userId, auth.userId),
//             gte(transactions.date, startDate),
//             lte(transactions.date, endDate),
//           )
//         )
//         .orderBy(desc(transactions.date));

//       return c.json({ data });
//   })
//   .get(
//     "/:id",
//     zValidator("param", z.object({
//       id: z.string().optional(),
//     })),
//     clerkMiddleware(),
//     async (c) => {
//       const auth = getAuth(c);
//       const { id } = c.req.valid("param");

//       if (!id) {
//         return c.json({ error: "Missing id" }, 400);
//       }

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const [data] = await db
//         .select({
//           id: transactions.id,
//           date: transactions.date,
//           categoryId: transactions.categoryId,
//           payee: transactions.payee,
//           amount: transactions.amount,
//           notes: transactions.notes,
//           accountId: transactions.accountId,
//         })
//         .from(transactions)
//         .innerJoin(accounts, eq(transactions.accountId, accounts.id))
//         .where(
//           and(
//             eq(transactions.id, id),
//             eq(accounts.userId, auth.userId),
//           ),
//         );

//       if (!data) {
//         return c.json({ error: "Not found" }, 404);
//       }

//       return c.json({ data });
//     }
//   )
//   .post(
//     "/",
//     clerkMiddleware(),
//     zValidator("json", insertTransactionSchema.omit({
//       id: true,
//     })),
//     async (c) => {
//       const auth = getAuth(c);
//       const values = c.req.valid("json");

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const [data] = await db.insert(transactions).values({
//         id: createId(),
//         ...values,
//       }).returning();

//       return c.json({ data });
//   })
//   .post(
//     "/bulk-create",
//     clerkMiddleware(),
//     zValidator(
//       "json",
//       z.array(
//         insertTransactionSchema.omit({
//           id: true,
//         }),
//       ),
//     ),
//     async (c) => {
//       const auth = getAuth(c);
//       const values = c.req.valid("json");

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const data = await db
//         .insert(transactions)
//         .values(
//           values.map((value) => ({
//             id: createId(),
//             ...value,
//           }))
//         )
//         .returning();

//       return c.json({ data });
//     },
//   )
//   .post(
//     "/bulk-delete",
//     clerkMiddleware(),
//     zValidator(
//       "json",
//       z.object({
//         ids: z.array(z.string()),
//       }),
//     ),
//     async (c) => {
//       const auth = getAuth(c);
//       const values = c.req.valid("json");

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const transactionsToDelete = db.$with("transactions_to_delete").as(
//         db.select({ id: transactions.id }).from(transactions)
//           .innerJoin(accounts, eq(transactions.accountId, accounts.id))
//           .where(and(
//             inArray(transactions.id, values.ids),
//             eq(accounts.userId, auth.userId),
//           )),
//       );

//       const data = await db
//         .with(transactionsToDelete)
//         .delete(transactions)
//         .where(
//           inArray(transactions.id, sql`(select id from ${transactionsToDelete})`)
//         )
//         .returning({
//           id: transactions.id,
//         });

//       return c.json({ data });
//     },
//   )
//   .patch(
//     "/:id",
//     clerkMiddleware(),
//     zValidator(
//       "param",
//       z.object({
//         id: z.string().optional(),
//       }),
//     ),
//     zValidator(
//       "json",
//       insertTransactionSchema.omit({
//         id: true,
//       })
//     ),
//     async (c) => {
//       const auth = getAuth(c);
//       const { id } = c.req.valid("param");
//       const values = c.req.valid("json");

//       if (!id) {
//         return c.json({ error: "Missing id" }, 400);
//       }

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const transactionsToUpdate = db.$with("transactions_to_update").as(
//         db.select({ id: transactions.id })
//           .from(transactions)
//           .innerJoin(accounts, eq(transactions.accountId, accounts.id))
//           .where(and(
//             eq(transactions.id, id),
//             eq(accounts.userId, auth.userId),
//           )),
//       );

//       const [data] = await db
//         .with(transactionsToUpdate)
//         .update(transactions)
//         .set(values)
//         .where(
//           inArray(transactions.id, sql`(select id from ${transactionsToUpdate})`)
//         )
//         .returning();

//       if (!data) {
//         return c.json({ error: "Not found" }, 404);
//       }

//       return c.json({ data });
//     },
//   )
//   .delete(
//     "/:id",
//     clerkMiddleware(),
//     zValidator(
//       "param",
//       z.object({
//         id: z.string().optional(),
//       }),
//     ),
//     async (c) => {
//       const auth = getAuth(c);
//       const { id } = c.req.valid("param");

//       if (!id) {
//         return c.json({ error: "Missing id" }, 400);
//       }

//       if (!auth?.userId) {
//         return c.json({ error: "Unauthorized" }, 401);
//       }

//       const transactionsToDelete = db.$with("transactions_to_delete").as(
//         db.select({ id: transactions.id })
//           .from(transactions)
//           .innerJoin(accounts, eq(transactions.accountId, accounts.id))
//           .where(and(
//             eq(transactions.id, id),
//             eq(accounts.userId, auth.userId),
//           )),
//       );

//       const [data] = await db
//         .with(transactionsToDelete)
//         .delete(transactions)
//         .where(
//           inArray(
//             transactions.id,
//             sql`(select id from ${transactionsToDelete})`
//           ),
//         )
//         .returning({
//           id: transactions.id,
//         });

//       if (!data) {
//         return c.json({ error: "Not found" }, 404);
//       }

//       return c.json({ data });
//     },
//   );

// export default app;

import { z } from "zod";
import { Hono } from "hono";
import { parse, subDays } from "date-fns";
import { createId } from "@paralleldrive/cuid2";
import { zValidator } from "@hono/zod-validator";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

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

// 2) Import AWS SDK items for the /aws route
import { dynamoClient } from "@/aws/awsDynamoClient";
import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

// Initialize Hono app
const app = new Hono()

  // ----------------------------------------------------------------
  // GET /?from=YYYY-MM-DD&to=...&accountId=...
  //  (Unchanged: read from PG only, no sync needed)
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

      const defaultTo = new Date();
      const defaultFrom = subDays(defaultTo, 30);

      const startDate = from
        ? parse(from, "yyyy-MM-dd", new Date())
        : defaultFrom;
      const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;

      const data = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          category: categories.name,
          categoryId: transactions.categoryId,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          account: accounts.name,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, auth.userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .orderBy(desc(transactions.date));

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // GET /:id  (Unchanged)
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

      const [data] = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          categoryId: transactions.categoryId,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // POST /  Create a Single Transaction (Uses Ops)
  // ----------------------------------------------------------------
  .post(
    "/",
    clerkMiddleware(),
    zValidator("json", insertTransactionSchema.omit({ id: true })),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json"); // e.g. { date, payee, amount, ... }

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Generate an ID for Drizzle & Dynamo
      const txnId = createId();

      // Instead of direct db.insert(...), call ops
      const data = await createTxnOps({
        id: txnId,
        amount: values.amount,
        payee: values.payee,
        notes: values.notes ?? null,
        date: values.date, // ensure Date or parse as needed
        accountId: values.accountId,
        categoryId: values.categoryId ?? null,
      });

      return c.json({ data });
    }
  )

  // ----------------------------------------------------------------
  // POST /bulk-create (Uses Ops in a loop or Promise.all)
  // ----------------------------------------------------------------
  .post(
    "/bulk-create",
    clerkMiddleware(),
    zValidator("json", z.array(insertTransactionSchema.omit({ id: true }))),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json"); // array of transaction data

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
  // POST /bulk-delete (Uses deleteTransaction for each ID)
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

      // check user ownership (like your existing code)
      const authorizedIds = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(inArray(transactions.id, ids), eq(accounts.userId, auth.userId))
        );

      // Then delete them one by one
      const results = await Promise.all(
        authorizedIds.map((row) => deleteTxnOps(row.id))
      );

      return c.json({ data: results.map((r) => ({ id: r.id })) });
    }
  )

  // ----------------------------------------------------------------
  // PATCH /:id (Uses updateTransaction)
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

      // update via ops
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
  // DELETE /:id (Uses deleteTransaction)
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

      // delete via ops
      const deleted = await deleteTxnOps(id);
      return c.json({ data: { id: deleted.id } });
    }
  )

  // ----------------------------------------------------------------
  // POST /aws (New route to skip duplicates in DynamoDB)
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
          date: z.string(), // or z.date(), but likely an ISO string
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

      // parse incoming array of transactions
      const body = c.req.valid("json");

      // (Optionally) check user owns these if you'd like
      // for now we assume it's safe

      const tableName = "transactions"; // your DynamoDB table name
      const results: Array<{ id: string; status: string }> = [];

      for (const tx of body) {
        // 1) Check if item with this ID exists in Dynamo
        const getRes = await dynamoClient.send(
          new GetItemCommand({
            TableName: tableName,
            Key: { id: { S: tx.id } },
          })
        );

        if (getRes.Item) {
          // skip
          results.push({ id: tx.id, status: "skipped_exists" });
        } else {
          // 2) If not found, put it
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

// Export the Hono app as default
export default app;

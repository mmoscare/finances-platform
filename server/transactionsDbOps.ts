// server/transactionsDbOps.ts
import { db } from "../drizzle/drizzleClient";
import { transactions } from "../drizzle/schema";
import { upsertTransaction, deleteTransactionDynamo } from "./syncDynamo";
import { eq } from "drizzle-orm";

export async function createTransaction(
  accountId: number,
  description: string,
  amount: number
) {
  const [inserted] = await db
    .insert(transactions)
    .values({
      accountId,
      description,
      amount,
    })
    .returning();

  await upsertTransaction({
    id: inserted.id,
    accountId: inserted.accountId.toString(),
    description: inserted.description || "",
    amount: inserted.amount.toString(),
    createdAt: inserted.createdAt.toISOString(),
  });

  return inserted;
}

export async function updateTransaction(
  id: number,
  updates: { description?: string; amount?: number }
) {
  const [updated] = await db
    .update(transactions)
    .set({
      ...(updates.description && { description: updates.description }),
      ...(updates.amount !== undefined && { amount: updates.amount }),
    })
    .where(eq(transactions.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Transaction ${id} not found.`);
  }

  await upsertTransaction({
    id: updated.id,
    accountId: updated.accountId.toString(),
    description: updated.description || "",
    amount: updated.amount.toString(),
    createdAt: updated.createdAt.toISOString(),
  });

  return updated;
}

export async function deleteTransaction(id: number) {
  const [deleted] = await db
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning();

  if (!deleted) {
    throw new Error(`Transaction ${id} not found.`);
  }

  await deleteTransactionDynamo(id);
  return deleted;
}

export async function getTransaction(id: number) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id));
  return row;
}

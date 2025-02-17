import { db } from "./drizzle";
import { transactions } from "./schema";
import {
  upsertTransactionDynamo,
  deleteTransactionDynamo,
} from "../aws/syncDynamo";
import { eq } from "drizzle-orm";

// Create
export async function createTransaction(data: {
  id: string;
  amount: number;
  payee: string;
  notes?: string | null;
  date: Date;
  accountId: string;
  categoryId?: string | null;
}) {
  const [inserted] = await db
    .insert(transactions)
    .values({
      id: data.id,
      amount: data.amount,
      payee: data.payee,
      notes: data.notes || null,
      date: data.date,
      accountId: data.accountId,
      categoryId: data.categoryId || null,
    })
    .returning();

  await upsertTransactionDynamo({
    id: inserted.id,
    amount: inserted.amount,
    payee: inserted.payee,
    notes: inserted.notes,
    date: inserted.date.toISOString(), // convert Date -> string
    accountId: inserted.accountId,
    categoryId: inserted.categoryId,
  });

  return inserted;
}

// Update
export async function updateTransaction(
  txnId: string,
  updates: Partial<{
    amount: number;
    payee: string;
    notes: string | null;
    date: Date;
    accountId: string;
    categoryId: string | null;
  }>
) {
  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, txnId))
    .returning();

  if (!updated) {
    throw new Error(`No transaction found with id=${txnId}`);
  }

  await upsertTransactionDynamo({
    id: updated.id,
    amount: updated.amount,
    payee: updated.payee,
    notes: updated.notes,
    date: updated.date.toISOString(),
    accountId: updated.accountId,
    categoryId: updated.categoryId,
  });

  return updated;
}

// Delete
export async function deleteTransaction(txnId: string) {
  const [deleted] = await db
    .delete(transactions)
    .where(eq(transactions.id, txnId))
    .returning();

  if (!deleted) {
    throw new Error(`No transaction found with id=${txnId}`);
  }

  await deleteTransactionDynamo(txnId);

  return deleted;
}

// Optional read
export async function getTransaction(txnId: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txnId));
  return row;
}

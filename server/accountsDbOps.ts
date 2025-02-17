// server/accountsDbOps.ts
import { db } from "../drizzle/drizzleClient";
import { accounts } from "../drizzle/schema";
import { upsertAccount, deleteAccountDynamo } from "./syncDynamo";
import { eq } from "drizzle-orm";

// CREATE
export async function createAccount(accountName: string, balance: number) {
  const [inserted] = await db
    .insert(accounts)
    .values({ accountName, balance })
    .returning();
  // "returning()" works in Postgres. If MySQL, handle differently.

  // Convert Drizzle row to something `upsertAccount` can handle
  await upsertAccount({
    id: inserted.id,
    accountName: inserted.accountName,
    balance: inserted.balance.toString(),
  });

  return inserted;
}

// UPDATE
export async function updateAccount(
  id: number,
  updates: { accountName?: string; balance?: number }
) {
  const [updated] = await db
    .update(accounts)
    .set({
      ...(updates.accountName && { accountName: updates.accountName }),
      ...(updates.balance !== undefined && { balance: updates.balance }),
    })
    .where(eq(accounts.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Account ${id} not found.`);
  }

  await upsertAccount({
    id: updated.id,
    accountName: updated.accountName,
    balance: updated.balance.toString(),
  });

  return updated;
}

// DELETE
export async function deleteAccount(id: number) {
  const [deleted] = await db
    .delete(accounts)
    .where(eq(accounts.id, id))
    .returning();

  if (!deleted) {
    throw new Error(`Account ${id} not found.`);
  }

  await deleteAccountDynamo(id);
  return deleted;
}

// READ
export async function getAccount(id: number) {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
  return row;
}

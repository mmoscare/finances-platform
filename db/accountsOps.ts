import { db } from "./drizzle";
import { accounts } from "./schema";
import { upsertAccountDynamo, deleteAccountDynamo } from "../aws/syncDynamo";
import { eq } from "drizzle-orm";

// Create
export async function createAccount(data: {
  id: string;
  plaidId?: string | null;
  name: string;
  userId: string;
}) {
  // Insert into Postgres
  const [inserted] = await db
    .insert(accounts)
    .values({
      id: data.id,
      plaidId: data.plaidId || null,
      name: data.name,
      userId: data.userId,
    })
    .returning();

  // Upsert to Dynamo
  await upsertAccountDynamo({
    id: inserted.id,
    plaidId: inserted.plaidId,
    name: inserted.name,
    userId: inserted.userId,
  });

  return inserted;
}

// Update
export async function updateAccount(
  accountId: string,
  updates: Partial<{
    plaidId: string | null;
    name: string;
    userId: string;
  }>
) {
  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.id, accountId))
    .returning();

  if (!updated) {
    throw new Error(`No account found with id=${accountId}`);
  }

  // Sync to Dynamo
  await upsertAccountDynamo({
    id: updated.id,
    plaidId: updated.plaidId,
    name: updated.name,
    userId: updated.userId,
  });

  return updated;
}

// Delete
export async function deleteAccount(accountId: string) {
  const [deleted] = await db
    .delete(accounts)
    .where(eq(accounts.id, accountId))
    .returning();

  if (!deleted) {
    throw new Error(`No account found with id=${accountId}`);
  }

  await deleteAccountDynamo(accountId);

  return deleted;
}

// Optional read
export async function getAccount(accountId: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return row;
}

import { db } from "./drizzle";
import { connectedBanks } from "./schema";
import { eq } from "drizzle-orm";
import {
  upsertConnectedBankDynamo,
  deleteConnectedBankDynamo,
} from "../aws/syncDynamo";

export async function createConnectedBank(data: {
  id: string;
  userId: string;
  accessToken: string;
}) {
  const [inserted] = await db.insert(connectedBanks).values(data).returning();

  await upsertConnectedBankDynamo({
    id: inserted.id,
    userId: inserted.userId,
    accessToken: inserted.accessToken,
  });

  return inserted;
}

export async function updateConnectedBank(
  bankId: string,
  updates: Partial<{
    userId: string;
    accessToken: string;
  }>
) {
  const [updated] = await db
    .update(connectedBanks)
    .set(updates)
    .where(eq(connectedBanks.id, bankId))
    .returning();

  if (!updated) {
    throw new Error(`Connected bank not found: id=${bankId}`);
  }

  await upsertConnectedBankDynamo({
    id: updated.id,
    userId: updated.userId,
    accessToken: updated.accessToken,
  });

  return updated;
}

export async function deleteConnectedBank(bankId: string) {
  const [deleted] = await db
    .delete(connectedBanks)
    .where(eq(connectedBanks.id, bankId))
    .returning();

  if (!deleted) {
    throw new Error(`Connected bank not found: id=${bankId}`);
  }

  await deleteConnectedBankDynamo(bankId);
  return deleted;
}

export async function getConnectedBank(bankId: string) {
  const [row] = await db
    .select()
    .from(connectedBanks)
    .where(eq(connectedBanks.id, bankId));
  return row;
}

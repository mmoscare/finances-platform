import { db } from "./drizzle";
import { subscriptions } from "./schema";
import { eq } from "drizzle-orm";
import {
  upsertSubscriptionDynamo,
  deleteSubscriptionDynamo,
} from "../aws/syncDynamo";

export async function createSubscription(data: {
  id: string;
  userId: string;
  subscriptionId: string;
  status: string;
}) {
  const [inserted] = await db.insert(subscriptions).values(data).returning();

  await upsertSubscriptionDynamo({
    id: inserted.id,
    userId: inserted.userId,
    subscriptionId: inserted.subscriptionId,
    status: inserted.status,
  });

  return inserted;
}

export async function updateSubscription(
  subId: string,
  updates: Partial<{
    userId: string;
    subscriptionId: string;
    status: string;
  }>
) {
  const [updated] = await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.id, subId))
    .returning();

  if (!updated) {
    throw new Error(`Subscription not found: id=${subId}`);
  }

  await upsertSubscriptionDynamo({
    id: updated.id,
    userId: updated.userId,
    subscriptionId: updated.subscriptionId,
    status: updated.status,
  });

  return updated;
}

export async function deleteSubscription(subId: string) {
  const [deleted] = await db
    .delete(subscriptions)
    .where(eq(subscriptions.id, subId))
    .returning();

  if (!deleted) {
    throw new Error(`Subscription not found: id=${subId}`);
  }

  await deleteSubscriptionDynamo(subId);
  return deleted;
}

export async function getSubscription(subId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subId));
  return row;
}

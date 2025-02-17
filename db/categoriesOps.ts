import { db } from "./drizzle";
import { categories } from "./schema";
import { eq } from "drizzle-orm";
import { upsertCategoryDynamo, deleteCategoryDynamo } from "../aws/syncDynamo";

export async function createCategory(data: {
  id: string;
  plaidId?: string | null;
  name: string;
  userId: string;
}) {
  const [inserted] = await db
    .insert(categories)
    .values({
      id: data.id,
      plaidId: data.plaidId || null,
      name: data.name,
      userId: data.userId,
    })
    .returning();

  await upsertCategoryDynamo({
    id: inserted.id,
    plaidId: inserted.plaidId,
    name: inserted.name,
    userId: inserted.userId,
  });

  return inserted;
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<{
    plaidId: string | null;
    name: string;
    userId: string;
  }>
) {
  const [updated] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, categoryId))
    .returning();

  if (!updated) {
    throw new Error(`Category not found: id=${categoryId}`);
  }

  await upsertCategoryDynamo({
    id: updated.id,
    plaidId: updated.plaidId,
    name: updated.name,
    userId: updated.userId,
  });

  return updated;
}

export async function deleteCategory(categoryId: string) {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning();

  if (!deleted) {
    throw new Error(`Category not found: id=${categoryId}`);
  }

  await deleteCategoryDynamo(categoryId);
  return deleted;
}

export async function getCategory(categoryId: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));
  return row;
}

// server/dbOps.ts
import { db } from "../drizzle/drizzleClient"; // Adjust import path as needed
import { trades } from "../drizzle/schema"; // Adjust to your actual schema
import { upsertTrade, deleteTradeFromDynamo, Trade } from "./syncDynamo";
import { eq } from "drizzle-orm";

// CREATE a new trade
export async function createTrade(
  symbol: string,
  side: string,
  quantity: number,
  price: number
) {
  // Insert into SQL
  const [inserted] = await db
    .insert(trades)
    .values({
      symbol,
      side,
      quantity,
      price,
    })
    .returning();
  // "returning()" is Postgres-only. For MySQL, you may need a different approach

  // Convert Drizzle row -> Trade interface
  const tradeForDynamo: Trade = {
    id: inserted.id,
    symbol: inserted.symbol,
    side: inserted.side,
    quantity: inserted.quantity.toString(),
    price: inserted.price.toString(),
    updatedAt: inserted.updatedAt,
  };

  // Upsert to Dynamo
  await upsertTrade(tradeForDynamo);

  return inserted;
}

// UPDATE an existing trade
export async function updateTrade(
  id: number,
  updates: Partial<Omit<Trade, "id">>
) {
  // Convert any numeric fields from string -> number
  const newValues: any = {};
  if (updates.symbol) newValues.symbol = updates.symbol;
  if (updates.side) newValues.side = updates.side;
  if (updates.quantity) newValues.quantity = +updates.quantity;
  if (updates.price) newValues.price = +updates.price;
  newValues.updatedAt = new Date(); // automatically bump the timestamp

  const [updated] = await db
    .update(trades)
    .set(newValues)
    .where(eq(trades.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Trade ${id} not found`);
  }

  const tradeForDynamo: Trade = {
    id: updated.id,
    symbol: updated.symbol,
    side: updated.side,
    quantity: updated.quantity.toString(),
    price: updated.price.toString(),
    updatedAt: updated.updatedAt,
  };

  await upsertTrade(tradeForDynamo);

  return updated;
}

// DELETE a trade
export async function deleteTrade(id: number) {
  const deleted = await db.delete(trades).where(eq(trades.id, id)).returning();

  if (!deleted.length) {
    throw new Error(`Trade ${id} not found`);
  }

  await deleteTradeFromDynamo(id);

  return deleted[0];
}

// READ a trade (from Drizzle, optional)
export async function getTrade(id: number) {
  const [row] = await db.select().from(trades).where(eq(trades.id, id));
  return row;
}

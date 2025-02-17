// server/syncDynamo.ts
import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./awsDynamoClient";

// Represents a single "Trade" row
export interface Trade {
  id: number;
  symbol: string;
  side: string; // e.g., "BUY" or "SELL"
  quantity: string; // store numeric as string
  price: string;
  updatedAt: Date;
}

// Convert a Trade to DynamoDB attribute map
function tradeToDynamoItem(trade: Trade) {
  return {
    id: { N: trade.id.toString() },
    symbol: { S: trade.symbol },
    side: { S: trade.side },
    quantity: { N: trade.quantity },
    price: { N: trade.price },
    updatedAt: { S: trade.updatedAt.toISOString() },
  };
}

/**
 * Insert or update a Trade in DynamoDB
 */
export async function upsertTrade(trade: Trade) {
  const item = tradeToDynamoItem(trade);

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "TradesDynamo", // your DynamoDB table name
      Item: item,
    })
  );
}

/**
 * Delete a Trade from DynamoDB
 */
export async function deleteTradeFromDynamo(id: number) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "TradesDynamo",
      Key: {
        id: { N: id.toString() },
      },
    })
  );
}

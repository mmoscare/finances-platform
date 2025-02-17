// server/syncDynamo.ts
import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./awsDynamoClient";

/**
 * Upsert an `accounts` row into DynamoDB
 * We'll call the DynamoDB table "accounts" as well (one approach),
 * but you can rename it to "AccountsDynamo" if you prefer.
 */
export async function upsertAccount(account: {
  id: number;
  accountName: string;
  balance: string;
}) {
  // Convert to DynamoDB item format:
  const item = {
    id: { N: account.id.toString() },
    accountName: { S: account.accountName },
    balance: { N: account.balance },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "accounts", // DynamoDB table name (must exist)
      Item: item,
    })
  );
}

/**
 * Delete an `accounts` row from DynamoDB
 */
export async function deleteAccountDynamo(id: number) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "accounts",
      Key: {
        id: { N: id.toString() },
      },
    })
  );
}

/**
 * Upsert a `transactions` row into DynamoDB
 */
export async function upsertTransaction(txn: {
  id: number;
  accountId: string;
  description: string;
  amount: string;
  createdAt: string; // store date as string
}) {
  const item = {
    id: { N: txn.id.toString() },
    accountId: { N: txn.accountId },
    description: { S: txn.description || "" },
    amount: { N: txn.amount },
    createdAt: { S: txn.createdAt },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "transactions",
      Item: item,
    })
  );
}

/**
 * Delete a `transactions` row from DynamoDB
 */
export async function deleteTransactionDynamo(id: number) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "transactions",
      Key: {
        id: { N: id.toString() },
      },
    })
  );
}

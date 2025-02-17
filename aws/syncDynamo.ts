import { PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./awsDynamoClient";

/* ------------------------------------------------------------------
   ACCOUNTS (pgTable: "accounts")
   Columns in db/schema.ts:
   id (PK, text), plaidId, name, userId
------------------------------------------------------------------ */
export async function upsertAccountDynamo(account: {
  id: string;
  plaidId: string | null;
  name: string;
  userId: string;
}) {
  // All columns are text -> store as { S: ... } in Dynamo
  const item = {
    id: { S: account.id },
    plaidId: account.plaidId ? { S: account.plaidId } : { NULL: true },
    name: { S: account.name },
    userId: { S: account.userId },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "accounts", // EXACT name of your DynamoDB table
      Item: item,
    })
  );
}

export async function deleteAccountDynamo(id: string) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "accounts",
      Key: {
        id: { S: id },
      },
    })
  );
}

/* ------------------------------------------------------------------
   TRANSACTIONS (pgTable: "transactions")
   Columns: id (PK,text), amount (integer), payee (text), notes (text?),
            date (timestamp), accountId (text), categoryId (text?)
------------------------------------------------------------------ */
export async function upsertTransactionDynamo(transaction: {
  id: string;
  amount: number;
  payee: string;
  notes: string | null;
  date: string; // Convert your Date to string (ISO)
  accountId: string;
  categoryId: string | null;
}) {
  const item = {
    id: { S: transaction.id },
    amount: { N: transaction.amount.toString() },
    payee: { S: transaction.payee },
    notes: transaction.notes ? { S: transaction.notes } : { NULL: true },
    date: { S: transaction.date }, // e.g. "2025-02-20T00:00:00.000Z"
    accountId: { S: transaction.accountId },
    categoryId: transaction.categoryId
      ? { S: transaction.categoryId }
      : { NULL: true },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "transactions",
      Item: item,
    })
  );
}

export async function deleteTransactionDynamo(id: string) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "transactions",
      Key: {
        id: { S: id },
      },
    })
  );
}

/* ------------------------------------------------------------------
   CATEGORIES (pgTable: "categories")
   Columns: id (PK, text), plaidId (text?), name (text), userId (text)
------------------------------------------------------------------ */
export async function upsertCategoryDynamo(category: {
  id: string;
  plaidId: string | null;
  name: string;
  userId: string;
}) {
  const item = {
    id: { S: category.id },
    plaidId: category.plaidId ? { S: category.plaidId } : { NULL: true },
    name: { S: category.name },
    userId: { S: category.userId },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "categories",
      Item: item,
    })
  );
}

export async function deleteCategoryDynamo(id: string) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "categories",
      Key: {
        id: { S: id },
      },
    })
  );
}

/* ------------------------------------------------------------------
   CONNECTED_BANKS (pgTable: "connected_banks")
   Columns: id(text PK), userId(text), accessToken(text)
------------------------------------------------------------------ */
export async function upsertConnectedBankDynamo(bank: {
  id: string;
  userId: string;
  accessToken: string;
}) {
  const item = {
    id: { S: bank.id },
    userId: { S: bank.userId },
    accessToken: { S: bank.accessToken },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "connected_banks",
      Item: item,
    })
  );
}

export async function deleteConnectedBankDynamo(id: string) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "connected_banks",
      Key: {
        id: { S: id },
      },
    })
  );
}

/* ------------------------------------------------------------------
   SUBSCRIPTIONS (pgTable: "subscriptions")
   Columns: id(text PK), userId(text), subscriptionId(text), status(text)
------------------------------------------------------------------ */
export async function upsertSubscriptionDynamo(subscription: {
  id: string;
  userId: string;
  subscriptionId: string;
  status: string;
}) {
  const item = {
    id: { S: subscription.id },
    userId: { S: subscription.userId },
    subscriptionId: { S: subscription.subscriptionId },
    status: { S: subscription.status },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: "subscriptions",
      Item: item,
    })
  );
}

export async function deleteSubscriptionDynamo(id: string) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: "subscriptions",
      Key: {
        id: { S: id },
      },
    })
  );
}

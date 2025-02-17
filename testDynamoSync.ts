import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createAccount, updateAccount, deleteAccount } from "./db/accountsOps";

import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./db/transactionsOps";

async function test() {
  console.log("Running Dynamo Sync Test...");

  // 1) Create an account
  const acct = await createAccount({
    id: "acct-123",
    name: "My Checking",
    userId: "user-XYZ",
  });
  console.log("Created account:", acct);

  // 2) Update account
  const updatedAcct = await updateAccount("acct-123", {
    name: "My Checking Renamed",
  });
  console.log("Updated account:", updatedAcct);

  // 3) Create a transaction
  const txn = await createTransaction({
    id: "txn-999",
    amount: 1234,
    payee: "Grocery Store",
    date: new Date(),
    accountId: "acct-123",
  });
  console.log("Created transaction:", txn);

  // 4) Update transaction
  const updatedTxn = await updateTransaction("txn-999", {
    payee: "Grocery & Snacks",
  });
  console.log("Updated transaction:", updatedTxn);

  // 5) Delete transaction
  await deleteTransaction("txn-999");
  console.log("Deleted transaction txn-999");

  // 6) Delete account
  await deleteAccount("acct-123");
  console.log("Deleted account acct-123");

  console.log("Dynamo Sync Test complete!");
}

test().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

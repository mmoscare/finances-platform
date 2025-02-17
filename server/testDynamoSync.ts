// server/testDynamoSync.ts
import {
  createAccount,
  updateAccount,
  deleteAccount,
  getAccount,
} from "./accountsDbOps";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransaction,
} from "./transactionsDbOps";

async function test() {
  console.log("Starting test...");

  // 1) Create new account
  const newAcct = await createAccount("Checking Account", 1000);
  console.log("Created account:", newAcct);

  // 2) Update account
  const updatedAcct = await updateAccount(newAcct.id, { balance: 1500 });
  console.log("Updated account:", updatedAcct);

  // 3) Create transaction
  const newTxn = await createTransaction(newAcct.id, "Groceries", -100);
  console.log("Created transaction:", newTxn);

  // 4) Update transaction
  const updatedTxn = await updateTransaction(newTxn.id, {
    description: "Groceries + Snacks",
  });
  console.log("Updated transaction:", updatedTxn);

  // 5) Delete transaction
  await deleteTransaction(newTxn.id);
  console.log(`Deleted transaction ${newTxn.id}`);

  // 6) Delete account
  await deleteAccount(newAcct.id);
  console.log(`Deleted account ${newAcct.id}`);

  console.log("Test complete!");
}

test().catch((err) => {
  console.error("Test error:", err);
});

"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Plus, Cloud } from "lucide-react";

import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";
import { useBulkCreateTransactions } from "@/features/transactions/api/use-bulk-create-transactions";
import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";

import { transactions as transactionSchema } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { columns } from "./columns";
import { ImportCard } from "./import-card";
import { UploadButton } from "./upload-button";

enum VARIANTS {
  LIST = "LIST",
  IMPORT = "IMPORT",
}

const INITIAL_IMPORT_RESULTS = {
  data: [],
  errors: [],
  meta: {},
};

const TransactionsPage = () => {
  const [AccountDialog, confirm] = useSelectAccount();
  const [variant, setVariant] = useState<VARIANTS>(VARIANTS.LIST);
  const [importResults, setImportResults] = useState(INITIAL_IMPORT_RESULTS);

  // Track selected transactions
  const [selectedTransactions, setSelectedTransactions] = useState<
    (typeof transactionSchema.$inferSelect)[]
  >([]);

  const onUpload = (results: typeof INITIAL_IMPORT_RESULTS) => {
    setImportResults(results);
    setVariant(VARIANTS.IMPORT);
  };

  const onCancelImport = () => {
    setImportResults(INITIAL_IMPORT_RESULTS);
    setVariant(VARIANTS.LIST);
  };

  const newTransaction = useNewTransaction();
  const createTransactions = useBulkCreateTransactions();
  const deleteTransactions = useBulkDeleteTransactions();
  const transactionsQuery = useGetTransactions();
  const transactions = transactionsQuery.data || [];

  const isDisabled =
    transactionsQuery.isLoading || deleteTransactions.isPending;

  // The new function to upload selected transactions to AWS
  async function uploadSelectedToAWS() {
    if (!selectedTransactions.length) {
      toast.error("No transactions selected to upload.");
      return;
    }

    try {
      // const res = await fetch("/api/route/transactions/aws", {
      const res = await fetch("/api/transactions/aws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedTransactions.map((t) => ({
            id: t.id,
            amount: t.amount,
            payee: t.payee,
            notes: t.notes,
            date: t.date,
            accountId: t.accountId,
            categoryId: t.categoryId ?? null,
          }))
        ),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to upload to AWS");
      }

      const { results } = await res.json();
      toast.success("Uploaded selected to AWS!");
      console.log("AWS results:", results);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    }
  }

  const onSubmitImport = async (
    values: (typeof transactionSchema.$inferInsert)[]
  ) => {
    const accountId = await confirm();
    if (!accountId) {
      return toast.error("Please select an account to continue.");
    }

    const data = values.map((value) => ({
      ...value,
      accountId: accountId as string,
    }));

    createTransactions.mutate(data, {
      onSuccess: () => {
        onCancelImport();
      },
    });
  };

  if (transactionsQuery.isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full flex items-center justify-center">
              <Loader2 className="size-6 text-slate-300 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === VARIANTS.IMPORT) {
    return (
      <>
        <AccountDialog />
        <ImportCard
          data={importResults.data}
          onCancel={onCancelImport}
          onSubmit={onSubmitImport}
        />
      </>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">
            Transaction History
          </CardTitle>
          <div className="flex flex-col lg:flex-row gap-y-2 items-center gap-x-2">
            {/* The new AWS button, to the left of "Add new" */}
            <Button
              onClick={uploadSelectedToAWS}
              size="sm"
              className="w-full lg:w-auto"
              disabled={isDisabled}
            >
              <Cloud className="size-4 mr-2" />
              AWS
            </Button>

            <Button
              onClick={newTransaction.onOpen}
              size="sm"
              className="w-full lg:w-auto"
            >
              <Plus className="size-4 mr-2" />
              Add new
            </Button>
            <UploadButton onUpload={onUpload} />
          </div>
        </CardHeader>

        <CardContent>
          <DataTable
            filterKey="payee"
            columns={columns}
            data={transactions}
            disabled={isDisabled}
            // keep your onDelete logic
            onDelete={(rows) => {
              const ids = rows.map((r) => r.original.id);
              deleteTransactions.mutate({ ids });
            }}
            //  pass an onSelectRows callback so we track what's selected
            onSelectRows={(rows) => {
              const mapped = rows.map((r) => r.original);
              setSelectedTransactions(mapped);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;

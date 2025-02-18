"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useBulkDeleteEnrichedTransactions } from "@/features/enriched_transactions/api/use-bulk-delete-enriched-transactions";
import { useBulkCreateTransactions } from "@/features/transactions/api/use-bulk-create-transactions";
import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";
import { useGetEnrichedTransactions } from "@/features/enriched_transactions/api/use-get-enriched-transactions";

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

const EnrichedTransactionsPage = () => {
  const [AccountDialog, confirm] = useSelectAccount();
  const [variant, setVariant] = useState<VARIANTS>(VARIANTS.LIST);
  const [importResults, setImportResults] = useState(INITIAL_IMPORT_RESULTS);

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

  // Use your new bulk‐delete-enriched hook:
  const deleteEnrichedTransactions = useBulkDeleteEnrichedTransactions();

  // Fetch from `enriched_transactions`:
  const transactionsQuery = useGetEnrichedTransactions();
  const transactions = transactionsQuery.data || [];

  const isDisabled =
    transactionsQuery.isLoading || deleteEnrichedTransactions.isPending;

  const onSubmitImport = async (
    values: (typeof transactionSchema.$inferInsert)[]
  ) => {
    const accountId = await confirm();
    if (!accountId) {
      return toast.error("Please select an account to continue.");
    }

    createTransactions.mutate(
      values.map((v) => ({ ...v, accountId: accountId as string })),
      {
        onSuccess: () => {
          onCancelImport();
        },
      }
    );
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
            Enriched Transaction History
          </CardTitle>
          <div className="flex flex-col lg:flex-row gap-y-2 items-center gap-x-2">
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
            onDelete={(rows) => {
              // Bulk delete
              const ids = rows.map((r) => r.original.id);
              deleteEnrichedTransactions.mutate({ ids });
            }}
            onSelectRows={(rows) => {
              // Track selected
              const mapped = rows.map((r) => ({
                ...r.original,
                date: new Date(r.original.date),
              }));
              setSelectedTransactions(mapped);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EnrichedTransactionsPage;

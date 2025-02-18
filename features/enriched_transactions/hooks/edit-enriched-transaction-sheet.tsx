"use client";

import { Loader2 } from "lucide-react";
import { useOpenEnrichedTransaction } from "@/features/enriched_transactions/hooks/use-open-enriched-transaction";
import { useEditEnrichedTransaction } from "@/features/enriched_transactions/api/use-edit-enriched-transaction";
import { useDeleteEnrichedTransaction } from "@/features/enriched_transactions/api/use-delete-enriched-transaction";
import { useGetEnrichedTransaction } from "@/features/enriched_transactions/api/use-get-enriched-transaction";

import { useConfirm } from "@/hooks/use-confirm";
import { EnrichedTransactionForm } from "./enriched-transaction-form";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const EditEnrichedTransactionSheet = () => {
  const { isOpen, onClose, id } = useOpenEnrichedTransaction();
  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this enriched transaction."
  );

  const transactionQuery = useGetEnrichedTransaction(id);
  const editMutation = useEditEnrichedTransaction(id);
  const deleteMutation = useDeleteEnrichedTransaction(id);

  const isLoading = transactionQuery.isLoading;
  const isPending = editMutation.isPending || deleteMutation.isPending;

  const onSubmit = (values: any) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const onDelete = async () => {
    const ok = await confirm();
    if (ok) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const data = transactionQuery.data;
  const defaultValues = data
    ? {
        date: data.date ? new Date(data.date) : new Date(),
        payee: data.payee ?? "",
        accountId: data.accountId ?? "",
        categoryId: data.categoryId ?? "",
        amount: data.amount?.toString() ?? "",
        notes: data.notes ?? "",
        categoryB: data.categoryB ?? "",
        essential: data.essential ?? "",
        timing: data.timing ?? "",
        rop: data.rop ?? "",
      }
    : {
        date: new Date(),
        payee: "",
        accountId: "",
        categoryId: "",
        amount: "",
        notes: "",
        categoryB: "",
        essential: "",
        timing: "",
        rop: "",
      };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="space-y-4">
          <SheetHeader>
            <SheetTitle>Edit Enriched Transaction</SheetTitle>
            <SheetDescription>
              Update an existing enriched transaction
            </SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-4 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <EnrichedTransactionForm
              id={id}
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              onDelete={onDelete}
              disabled={isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

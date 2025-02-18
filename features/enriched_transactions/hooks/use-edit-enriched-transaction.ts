"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/hono";

export interface EditEnrichedTransactionData {
  date?: string;
  payee?: string;
  accountId?: string;
  categoryId?: string;
  amount?: number;
  notes?: string;
  categoryB?: string;
  essential?: string;
  timing?: string;
  rop?: string;
}

export const useEditEnrichedTransaction = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: EditEnrichedTransactionData) => {
      if (!id) throw new Error("No ID provided");
      const response = await client.api.enriched_transactions[":id"].$patch({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        throw new Error("Failed to update enriched transaction");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Enriched transaction updated");
      queryClient.invalidateQueries({
        queryKey: ["enriched_transaction", { id }],
      });
      queryClient.invalidateQueries({ queryKey: ["enriched_transactions"] });
    },
    onError: () => {
      toast.error("Failed to update enriched transaction");
    },
  });
};

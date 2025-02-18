"use client";

import { useQuery } from "@tanstack/react-query";

// If you're using Hono + OpenAPI typed client, great. Otherwise,
// use fetch or axios to call your single-item endpoint in Dynamo.
import { client } from "@/lib/hono"; // (Adjust if needed)

// The shape of your enriched transaction:
export interface EnrichedTransaction {
  id: string;
  date: string;
  payee?: string;
  accountId?: string;
  categoryId?: string;
  amount?: number;
  notes?: string;
  // Additional enriched fields:
  categoryB?: string;
  essential?: string;
  timing?: string;
  rop?: string;
}

// For normal React Query usage:
export const useGetEnrichedTransaction = (id?: string) => {
  return useQuery({
    // skip query if no id
    queryKey: ["enriched_transaction", { id }],
    queryFn: async () => {
      if (!id) return null;

      // Example: GET /api/enriched_transactions/:id
      const response = await client.api.enriched_transactions[":id"].$get({
        param: { id },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch single enriched transaction");
      }

      // Suppose the response JSON is { data: {...} }
      const { data } = await response.json();
      return data as EnrichedTransaction;
    },
    // Don’t fetch if no id
    enabled: Boolean(id),
  });
};

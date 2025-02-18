"use client";

import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";
// or import { fetch } from ... if you're not using Hono

// If your enriched_transactions table in Dynamo returns these fields:
interface EnrichedTransaction {
  id: string;
  date: string;
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

export const useGetEnrichedTransactions = () => {
  return useQuery({
    queryKey: ["enriched_transactions"],
    queryFn: async () => {
      // Suppose the route is GET /api/enriched_transactions
      const response = await client.api.enriched_transactions.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch enriched transactions");
      }

      // If your API responds with { data: [...] }:
      const { data } = await response.json();
      // Optionally convert amounts from miliunits, if needed:
      return data as EnrichedTransaction[];
    },
  });
};

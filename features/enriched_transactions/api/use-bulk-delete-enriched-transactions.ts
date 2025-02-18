import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

// Point these types to `client.api.enriched_transactions`, NOT `client.api.transactions`.
type ResponseType = InferResponseType<
  (typeof client.api.enriched_transactions)["bulk-delete"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api.enriched_transactions)["bulk-delete"]["$post"]
>["json"];

export const useBulkDeleteEnrichedTransactions = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      // Make sure your server has a route: POST /api/enriched_transactions/bulk-delete
      const response = await client.api.enriched_transactions["bulk-delete"][
        "$post"
      ]({
        json,
      });
      if (!response.ok) {
        throw new Error("Failed to bulk-delete enriched transactions");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Enriched transactions deleted");
      // Invalidate the correct query key for enriched_transactions:
      queryClient.invalidateQueries({ queryKey: ["enriched_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: () => {
      toast.error("Failed to delete enriched transactions");
    },
  });

  return mutation;
};

// import { toast } from "sonner";
// import { InferRequestType, InferResponseType } from "hono";
// import { useMutation, useQueryClient } from "@tanstack/react-query";

// import { client } from "@/lib/hono";

// type ResponseType = InferResponseType<
//   (typeof client.api.enriched_transactions)[":id"]["$delete"]
// >;

// export const useDeleteEnrichedTransaction = (id?: string) => {
//   const queryClient = useQueryClient();

//   const mutation = useMutation<ResponseType, Error>({
//     mutationFn: async () => {
//       const response = await client.api.enriched_transactions[":id"]["$delete"](
//         {
//           param: { id },
//         }
//       );
//       if (!response.ok) {
//         throw new Error("Failed to delete enriched transaction");
//       }
//       return await response.json();
//     },
//     onSuccess: () => {
//       toast.success("Enriched transaction deleted");
//       queryClient.invalidateQueries({
//         queryKey: ["enriched_transactions", { id }],
//       });
//       queryClient.invalidateQueries({ queryKey: ["enriched_transactions"] });
//       queryClient.invalidateQueries({ queryKey: ["summary"] });
//     },
//     onError: () => {
//       toast.error("Failed to delete enriched transaction");
//     },
//   });

//   return mutation;
// };

import { toast } from "sonner";
import { InferResponseType } from "hono"; // We only need InferResponseType here
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.enriched_transactions)[":id"]["$delete"]
>;

export const useDeleteEnrichedTransaction = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      // Call the enriched_transactions/:id DELETE route
      const response = await client.api.enriched_transactions[":id"]["$delete"](
        {
          param: { id },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete enriched transaction");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Enriched transaction deleted");

      // Invalidate both the specific key (if used) and the general list:
      queryClient.invalidateQueries({
        queryKey: ["enriched_transactions", { id }],
      });
      queryClient.invalidateQueries({ queryKey: ["enriched_transactions"] });

      // Invalidate summary if it depends on these transactions
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: () => {
      toast.error("Failed to delete enriched transaction");
    },
  });

  return mutation;
};

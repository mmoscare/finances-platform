// import { useQuery } from "@tanstack/react-query";

// import { client } from "@/lib/hono";

// export const useGetSubscription = () => {
//   const query = useQuery({
//     queryKey: ["subscription"],
//     queryFn: async () => {
//       const response = await client.api.subscriptions.current.$get();

//       if (!response.ok) {
//         throw new Error("Failed to fetch subscription");
//       }

//       const { data } = await response.json();
//       return data;
//     },
//   });

//   return query;
// };

import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

// *************************************************************************
// * This modified version forces subscription.status = "active".
// * The original network request code is commented out for reference.
// *************************************************************************

export const useGetSubscription = () => {
  const query = useQuery({
    queryKey: ["subscription"],
    // Overwrite the original query function so we always appear "active".
    queryFn: async () => {
      /*
      // ORIGINAL CODE for reference:
      const response = await client.api.subscriptions.current.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      const { data } = await response.json();
      return data;
      */

      // NEW CODE: Always return an "active" subscription
      return {
        status: "active",
        // Add any other props you need, e.g.
        // plan: "pro",
        // expiresAt: "2099-01-01T00:00:00Z"
      };
    },
  });

  return query;
};

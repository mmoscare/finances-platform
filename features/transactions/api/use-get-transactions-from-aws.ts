import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

export const useGetTransactionsFromAWS = () => {
  const query = useQuery({
    queryKey: ["transactions-from-aws"],
    queryFn: async () => {
      const response = await fetch("/api/transactions/aws");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions from AWS");
      }

      const { data } = await response.json();
      return data.map((transaction) => ({
        ...transaction,
        amount: parseFloat(transaction.amount), // Ensure amount is a number
      }));
    },
  });

  return query;
};

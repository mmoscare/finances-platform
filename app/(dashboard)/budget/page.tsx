"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";

// Replace with your own enriched-transactions hook
import { useGetEnrichedTransactions } from "@/features/enriched_transactions/api/use-get-enriched-transactions";

// -------------------------------------
// EXAMPLE columns for demonstration only
// Replace with your actual columns for enriched_transactions
// -------------------------------------
import { ColumnDef } from "@tanstack/react-table";

type EnrichedTransaction = {
  id: string;
  date: string;
  payee: string;
  amount: number;
  categoryB: string | null;
  essential: string | null;
  timing: string | null;
  rop: string | null;
};

const columns: ColumnDef<EnrichedTransaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const rawDate = row.original.date;
      return new Date(rawDate).toLocaleDateString();
    },
  },
  {
    accessorKey: "payee",
    header: "Payee",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span>${row.original.amount.toFixed(2)}</span>,
  },
  {
    accessorKey: "categoryB",
    header: "CategoryB",
  },
  {
    accessorKey: "essential",
    header: "Essential?",
  },
  {
    accessorKey: "timing",
    header: "Timing",
  },
  {
    accessorKey: "rop",
    header: "ROP",
  },
];

// -------------------------------------
// BUDGET PAGE COMPONENT
// -------------------------------------
export default function BudgetPage() {
  // We'll track the current displayed month/year in state
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const {
    data: enrichedTransactions,
    isLoading,
    isError,
    error,
  } = useGetEnrichedTransactions();

  // Display something like "January 2025"
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  // Go to the previous month
  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  // Go to the next month
  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        {/* Top portion bar with arrows, month, and year */}
        <CardHeader className="flex items-center justify-between">
          <Button variant="ghost" onClick={handlePrevMonth}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <CardTitle className="text-xl line-clamp-1">
            {monthName} {year}
          </CardTitle>
          <Button variant="ghost" onClick={handleNextMonth}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Blank space below = DataTable of enriched_transactions */}
        <CardContent>
          {isLoading && (
            <div className="h-[500px] w-full flex items-center justify-center">
              <Loader2 className="size-6 text-slate-300 animate-spin" />
            </div>
          )}

          {isError && (
            <div className="text-red-500">
              Error loading data: {String(error)}
            </div>
          )}

          {!isLoading && !isError && (
            <DataTable
              filterKey="payee"
              columns={columns}
              data={enrichedTransactions ?? []}
              // If you have row-selection or deletion for these records,
              // you would pass down the appropriate props here...
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

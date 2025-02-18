"use client";

import { z } from "zod";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Select } from "@/components/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { AmountInput } from "@/components/amount-input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { convertAmountToMiliunits } from "@/lib/utils";

const enrichedFormSchema = z.object({
  date: z.coerce.date(),
  payee: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  amount: z.string().optional(), // we parse to number
  notes: z.string().optional().nullable(),
  // extra enrichment fields
  categoryB: z.string().optional().nullable(),
  essential: z.string().optional().nullable(),
  rop: z.string().optional().nullable(),
  timing: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof enrichedFormSchema>;

type Props = {
  id?: string;
  defaultValues?: Partial<FormValues>;
  disabled?: boolean;
  onSubmit: (values: Omit<FormValues, "amount"> & { amount: number }) => void;
  onDelete?: () => void;

  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  onCreateAccount?: (name: string) => void;
  onCreateCategory?: (name: string) => void;
};

export function EnrichedTransactionForm({
  id,
  defaultValues,
  disabled,
  onSubmit,
  onDelete,
  accountOptions,
  categoryOptions,
  onCreateAccount,
  onCreateCategory,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(enrichedFormSchema),
    defaultValues,
  });

  const handleSubmit = (values: FormValues) => {
    const rawAmount = parseFloat(values.amount ?? "0");
    const amountInMiliunits = convertAmountToMiliunits(rawAmount);
    onSubmit({ ...values, amount: amountInMiliunits });
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 pt-4"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select an account"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onCreate={onCreateAccount}
                  options={accountOptions}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select a category"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onCreate={onCreateCategory}
                  options={categoryOptions}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payee */}
        <FormField
          control={form.control}
          name="payee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <FormControl>
                <Input
                  placeholder="Payee name"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput
                  placeholder="0.00"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional notes..."
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional enrichment fields */}
        <FormField
          control={form.control}
          name="categoryB"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category B</FormLabel>
              <FormControl>
                <Input
                  placeholder="Sub-category or classification"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="essential"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Essential?</FormLabel>
              <FormControl>
                <Input placeholder="yes/no" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rop"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ROP</FormLabel>
              <FormControl>
                <Input
                  placeholder="Rate of pay or classification"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timing</FormLabel>
              <FormControl>
                <Input
                  placeholder="monthly / yearly / etc."
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Save / Delete buttons */}
        <Button className="w-full" disabled={disabled}>
          {id ? "Save changes" : "Create Enriched Transaction"}
        </Button>
        {!!id && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled}
            onClick={handleDelete}
          >
            <Trash className="size-4 mr-2" />
            Delete
          </Button>
        )}
      </form>
    </Form>
  );
}

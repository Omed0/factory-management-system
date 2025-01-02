'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createExpenseActions, updateExpenseActions } from '@/actions/expense';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OneExpense } from '@/server/schema/expense';
import {
  createExpenseSchema,
  UpdateExpense,
  updateExpenseSchema,
} from '@/server/schema/expense';
import { CreateExpense } from '@/server/schema/expense';
import { useDollar } from '@/hooks/useDollar';
import { IQDtoUSD } from '@/lib/utils';
import useSetQuery from '@/hooks/useSetQuery';
import { CurrencyInput } from '@/components/custom-currency-input';


type Props = {
  expense?: Partial<OneExpense>;
  title: string;
  handleClose?: () => void;
};

export default function AddExpense({ expense, title, handleClose }: Props) {
  const isEdit = !!expense;
  const { searchParams } = useSetQuery()
  const { data: { dollar } } = useDollar()
  const currency = searchParams.get("currency") || "USD"

  const form = useForm<CreateExpense>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateExpenseSchema : createExpenseSchema),
    defaultValues: { dollar, ...(expense as UpdateExpense) },
  });

  async function onSubmit(values: CreateExpense) {
    if (currency === 'IQD') {
      values.amount = IQDtoUSD(values.amount, values.dollar || dollar);
    }
    let expenseValues;

    if (isEdit && expense?.id) {
      expenseValues = await updateExpenseActions(
        expense.id,
        values
      );
    } else {
      expenseValues = await createExpenseActions(values);
    }

    if (!expenseValues.success) {
      toast.error(expenseValues.message);
    } else {
      toast.success(expenseValues.message);
      form.reset();
      handleClose?.();
    }
  }

  return (
    <Form {...form}>
      <h2 className="text-md pt-1 text-center font-medium">{title}</h2>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-wrap items-center gap-5 p-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>ناوی خەرجی</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CurrencyInput
          className="flex-1 basis-56"
          form={form}
          name="amount"
          label="بڕی پارەکە"
          dollar={form.watch("dollar")}
        />
        <FormField
          control={form.control}
          name="dollar"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>بری دۆلاری ئەم کاتە</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>تێبینی</FormLabel>
              <FormControl>
                <Textarea cols={6} className="h-20 resize-none" {...field} value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60" disabled={!form.formState.isDirty}>
            {isEdit ? 'نوێکردنەوە' : 'زیادکردن'}
          </Button>
          <DialogClose className="flex-1 basis-60">
            <Button type="reset" variant="outline" className="min-w-full">
              داخستن
            </Button>
          </DialogClose>
        </div>
      </form>
    </Form>
  );
}

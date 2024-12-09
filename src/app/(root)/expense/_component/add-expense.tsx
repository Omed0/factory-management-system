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

type Props = {
  expense?: Partial<OneExpense>;
  title: string;
  handleClose?: () => void;
};

export default function AddExpense({ expense, title, handleClose }: Props) {
  const isEdit = !!expense;

  const form = useForm<CreateExpense>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateExpenseSchema : createExpenseSchema),
    defaultValues: { ...(expense as UpdateExpense) },
  });

  async function onSubmit(values: CreateExpense) {
    const serializedValues = JSON.parse(JSON.stringify(values));
    let expenseValues;

    if (isEdit && expense?.id) {
      expenseValues = await updateExpenseActions(
        Number(expense.id),
        serializedValues
      );
    } else {
      expenseValues = await createExpenseActions(serializedValues);
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
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>بری پارەکە</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
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
                <Textarea cols={6} className="h-20 resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <DialogClose className="flex-1 basis-60" onClick={handleClose}>
            <Button type="reset" variant="outline" className="min-w-full">
              داخستن
            </Button>
          </DialogClose>
          <Button type="submit" className="flex-1 basis-60">
            {isEdit ? 'نوێکردنەوە' : 'زیادکردن'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

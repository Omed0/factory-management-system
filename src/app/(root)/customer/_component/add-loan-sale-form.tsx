'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createPaidLoanSaleListActions } from '@/actions/sale';
import CalendarFormItem from '@/components/calender-form-item';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CreatePaidLoanSale,
  createPaidLoanSaleSchema,
} from '@/server/schema/sale';
import { now } from '@/lib/constant';

type Props = {
  title: string;
  handleClose?: () => void;
  amountPeriod: number;
  saleId: number;
};

export default function AddPaidLoanSale({
  title,
  handleClose,
  amountPeriod,
  saleId,
}: Props) {
  const form = useForm<CreatePaidLoanSale>({
    mode: 'onSubmit',
    resolver: zodResolver(createPaidLoanSaleSchema),
    defaultValues: {
      saleId: saleId ?? 0,
      amount: 0,
      paidDate: now,
      note: '',
    },
  });

  async function onSubmit(values: CreatePaidLoanSale) {
    if (values.amount > amountPeriod) {
      toast.error('نابێت بڕی پێدانەوە لە قەرزی ماوە زیاتر بێت');
      return;
    }
    const purchaseInfoValues = await createPaidLoanSaleListActions(values);
    if (!purchaseInfoValues.success) {
      toast.error(purchaseInfoValues.message);
    } else {
      toast.success(purchaseInfoValues.message);
      form.reset();
      handleClose?.();
    }
  }

  return (
    <Form {...form}>
      <h2 className="text-md text-center font-medium">{title}</h2>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-wrap items-center gap-5 p-6"
      >
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="mt-4 flex-1 basis-56">
              <FormLabel>بڕی پێدانەوە</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription className="text-muted-foreground text-sm">
                بڕی قەرزی ماوە {isNaN(amountPeriod) ? 0 : amountPeriod}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <CalendarFormItem form={form} name="paidDate" />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>تێبینی</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  cols={6}
                  value={field.value ?? ''}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60" disabled={!form.formState.isDirty}>
            زیادکردن
          </Button>
          <DialogClose className="flex-1 basis-60" onClick={handleClose}>
            <Button type="reset" variant="outline" className="min-w-full">
              داخستن
            </Button>
          </DialogClose>
        </div>
      </form>
    </Form>
  );
}

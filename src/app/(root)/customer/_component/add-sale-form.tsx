'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  createSaleForCustomerActions,
  updateSaleForCustomerActions,
} from '@/actions/sale';
import CalendarFormItem from '@/components/calender-form-item';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { randomValue } from '@/lib/utils';
import {
  CreateSale,
  createSaleSchema,
  OneSale,
  UpdateSale,
  updateSaleSchema,
} from '@/server/schema/sale';

type Props = {
  title: string;
  handleClose?: () => void;
  customerId: number;
  sale?: OneSale;
  customerName?: string;
};

type FormType<T extends boolean> = T extends true ? UpdateSale : CreateSale;

export default function FormSaleForCustomer({
  title,
  handleClose,
  customerId,
  sale,
  customerName = 'default',
}: Props) {
  const isEdit = !!sale;

  const form = useForm<FormType<typeof isEdit>>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateSaleSchema : createSaleSchema),
    defaultValues: defaultValues(customerName, isEdit, {
      ...sale,
      customerId,
    }) as FormType<typeof isEdit>,
  });

  const isLoan = form.watch('saleType') === 'LOAN';
  async function onSubmit(values: FormType<typeof isEdit>) {
    let resSale;
    if (isEdit && sale) {
      const updatedValues = { ...values, id: sale.id } as UpdateSale;
      resSale = await updateSaleForCustomerActions(updatedValues);
    } else {
      resSale = await createSaleForCustomerActions(values as CreateSale);
    }

    if (!resSale.success) {
      toast.error(resSale.message);
    } else {
      toast.success(resSale.message);
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
          name="saleNumber"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>ناوی وەصڵ</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="saleType"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>شێوازی پارەدان</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="شێوازی پارەدان هەڵبژێرە" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CASH">نەقد</SelectItem>
                  <SelectItem value="LOAN">قەرز</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <CalendarFormItem form={form} name="saleDate" />
        {isLoan && (
          <FormField
            control={form.control}
            name="monthlyPaid"
            render={({ field }) => (
              <FormItem className="flex-1 basis-56">
                <FormLabel>بڕی قیستی مانگانە</FormLabel>
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
        )}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>تێبینی</FormLabel>
              <FormControl>
                <Textarea
                  cols={6}
                  {...field}
                  className="resize-none"
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60">
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

function defaultValues(
  name: string,
  isEdit: boolean,
  values?: Partial<OneSale>
) {
  if (!!values && isEdit) {
    return { ...values };
  }

  return {
    customerId: values?.customerId,
    saleNumber: randomValue(name),
    saleDate: new Date(),
    saleType: 'CASH',
  };
}

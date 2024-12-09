'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  createCustomerActions,
  updateCustomerActions,
} from '@/actions/customer';
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
import { Switch } from '@/components/ui/switch';
import {
  CreateCustomer,
  createCustomerSchema,
  OneCustomer,
  UpdateCustomer,
  updateCustomerSchema,
} from '@/server/schema/customer';

type Props = {
  customer?: Partial<OneCustomer>;
  title: string;
  handleClose?: () => void;
};

type FormType<T extends boolean> = T extends true
  ? UpdateCustomer
  : CreateCustomer;

export default function AddCustomer({ customer, title, handleClose }: Props) {
  const isEdit = !!customer;

  const form = useForm<FormType<typeof isEdit>>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateCustomerSchema : createCustomerSchema),
    defaultValues: { ...(customer as FormType<typeof isEdit>) },
  });

  async function onSubmit(values: FormType<typeof isEdit>) {
    let companyValues;

    if (isEdit && customer?.id) {
      companyValues = await updateCustomerActions({
        ...values,
        id: customer.id,
      });
    } else {
      companyValues = await createCustomerActions(values);
    }

    if (!companyValues.success) {
      toast.error(companyValues.message);
    } else {
      toast.success(companyValues.message);
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
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>ناو</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>ژ. مۆبایل</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>ناونیشان</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isSalariedeEmployee"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel className="block">ئایا فەرمانبەرە</FormLabel>
              <FormControl>
                <Switch
                  dir="ltr"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60">
            {isEdit ? 'نوێکردنەوە' : 'زیادکردن'}
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

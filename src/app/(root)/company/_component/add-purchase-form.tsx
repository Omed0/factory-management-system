'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { usePurchaseInfo } from '../purchase-info-state';

import {
  createCompanyPurchaseActions,
  updateCompanyPurchaseActions,
} from '@/actions/company';
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
import {
  OneCompanyPurchase,
  UpdateCompanyPurchase,
} from '@/server/schema/company';
import {
  CreateCompanyPurchase,
  createCompanyPurchaseSchema,
  updateCompanyPurchaseSchema,
} from '@/server/schema/company';
import { useDollar } from '@/hooks/useDollar';
import { now } from '@/lib/constant';
import { useParams } from 'next/navigation';

type Props = {
  purchase?: Partial<OneCompanyPurchase>;
  title: string;
  handleClose?: () => void;
};

type FormType<T extends boolean> = T extends true
  ? UpdateCompanyPurchase
  : CreateCompanyPurchase;

export default function AddPurchase({ purchase, title, handleClose }: Props) {
  const isEdit = !!purchase;
  const { data } = useDollar()
  const param = useParams()
  const companyId = purchase?.companyId || Number(param.id)

  const form = useForm<FormType<typeof isEdit>>({
    mode: 'onSubmit',
    resolver: zodResolver(
      isEdit ? updateCompanyPurchaseSchema : createCompanyPurchaseSchema
    ),
    defaultValues: defaultValues({ companyId, dollar: data.dollar, ...purchase }) as FormType<
      typeof isEdit
    >,
  });

  const { isDirty } = form.formState
  const type = form.watch('type');

  const { refetch } = usePurchaseInfo(purchase?.id ?? 0);

  async function onSubmit(values: FormType<typeof isEdit>) {
    if (!values.companyId) {
      toast.error("کۆمپانیا هەڵبژێرە")
      return
    }
    let companyValues;
    if (isEdit && purchase?.id) {
      companyValues = await updateCompanyPurchaseActions(
        values as UpdateCompanyPurchase
      );
    } else {
      companyValues = await createCompanyPurchaseActions(values);
    }

    if (!companyValues.success) {
      toast.error(companyValues.message);
    } else {
      toast.success(companyValues.message);
      form.reset();
      refetch();
      handleClose?.();
    }
  }

  return (
    <Form {...form}>
      <h2 className="pt-1 text-center text-lg font-medium">{title}</h2>
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
          name="type"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>جۆری پارەدان</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  disabled={isEdit}
                  onValueChange={(value) => field.onChange(value as any)}
                >
                  <SelectTrigger className="w-full justify-evenly">
                    <SelectValue placeholder="جۆری پارە" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="CASH">پارەدانی نەقد</SelectItem>
                    <SelectItem value="LOAN">پارەدانی قەرز</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>کۆی پارەکە</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {type === 'LOAN' && (
          <FormField
            control={form.control}
            name="totalRemaining"
            render={({ field }) => (
              <FormItem className="flex-1 basis-56">
                <FormLabel>بڕی پێشەکی</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="dollar"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>{isEdit ? "نرخی دۆلاری داخڵکراو" : "نرخی دۆلاری ئێستا"}</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CalendarFormItem form={form} name="purchaseDate" />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>تێبینی</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60" disabled={isEdit ? !isDirty : false}>
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

function defaultValues(
  values?: Partial<OneCompanyPurchase>
) {
  if (values) {
    values.type = values.type ?? 'CASH';
    if (values.purchaseDate) {
      values.purchaseDate = new Date(values.purchaseDate);
    } else {
      values.purchaseDate = now;
    }
    return values;
  }
  return { purchaseDate: now, type: 'CASH' };
}

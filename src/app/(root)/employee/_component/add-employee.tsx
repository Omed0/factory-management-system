'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  createEmployeeActions,
  updateEmployeeActions,
} from '@/actions/employee';
import { CurrencyInput } from '@/components/custom-currency-input';
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
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { unlinkImage } from '@/lib/helper';
import { getImageData, IQDtoUSD, uploadImageUsingHandler } from '@/lib/utils';
import {
  CreateEmployee,
  createEmployeeSchema,
  OneEmployee,
  UpdateEmployee,
  updateEmployeeSchema,
} from '@/server/schema/employee';
import Image from 'next/image';
import { X } from 'lucide-react';

type Props = {
  employee?: Partial<OneEmployee>;
  title: string;
  handleClose?: () => void;
};

export default function AddEmployee({ employee, title, handleClose }: Props) {
  const { searchParams } = useSetQuery(100);
  const currency = searchParams.get('currency') || 'USD';
  const { data } = useDollar();
  const isEdit = !!employee;

  const form = useForm<CreateEmployee>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateEmployeeSchema : createEmployeeSchema),
    defaultValues: { dollar: data.dollar, ...(employee as UpdateEmployee), image: null },
  });

  const { displayUrl } = getImageData(form.watch("image"))

  async function onSubmit(values: CreateEmployee) {
    if (currency === 'IQD') {
      values.monthSalary = IQDtoUSD(values.monthSalary, values.dollar || data.dollar);
    }
    let employeeValues;
    if (form.formState.dirtyFields["image"] && values.image.length) {
      const { success, message, path } = await uploadImageUsingHandler(values.image, employee?.image)
      if (!success) {
        toast.error(message)
        return
      }
      values.image = path;
    } else {
      values.image = undefined
    }

    if (isEdit && employee?.id) {
      employeeValues = await updateEmployeeActions(
        employee.id,
        values
      );
    } else {
      employeeValues = await createEmployeeActions(values);
    }

    if (!employeeValues.success) {
      toast.error(employeeValues.message);
    } else {
      toast.success(employeeValues.message);
      !isEdit && form.reset();
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
              <FormLabel>ناوی کارمەند</FormLabel>
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
        <CurrencyInput
          className="flex-1 basis-56"
          form={form}
          name="monthSalary"
          label="مووچەی مانگانە"
          dollar={form.watch("dollar")}
        />
        <FormField
          control={form.control}
          name="dollar"
          render={({ field }) => (
            <FormItem className="flex-1 basis-56">
              <FormLabel>{isEdit ? "نرخی دۆلاری داخڵکراو" : "نرخی دۆلاری ئەمڕۆ"}</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {displayUrl ? (
          <div className="relative flex items-center justify-center basis-[300px] grow min-w-60 max-w-[300px]">
            <Image
              className="rounded-md aspect-video object-cover w-28 border"
              alt="employee image"
              src={displayUrl}
              height={150}
              width={150}
            />
            <span
              onClick={() => form.setValue("image", [])}
              className="cursor-pointer absolute top-2 end-2 rounded-sm">
              <X className="size-6 text-red-500" />
            </span>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem className="flex-1 basis-56">
                <FormLabel>وێنە</FormLabel>
                <FormControl>
                  <Input
                    {...form.register("image")}
                    type='file'
                    className="bg-muted"
                    accept=".png,.jpg,.jpeg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="mt-5 flex w-full flex-wrap gap-5">
          <Button type="submit" className="flex-1 basis-60" disabled={!form.formState.isDirty}>
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

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createProductActions, updateProductActions } from '@/actions/product';
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
import { unlinkImage } from '@/lib/helper';
import {
  CreateProduct,
  createProductSchema,
  OneProduct,
  UpdateProduct,
  updateProductSchema,
} from '@/server/schema/product';
import { getImageData, IQDtoUSD, uploadImageUsingHandler } from '@/lib/utils';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { CurrencyInput } from '@/components/custom-currency-input';

type Props = {
  product?: Partial<OneProduct>;
  title: string;
  handleClose?: () => void;
};

type FormType<T extends boolean> = T extends true
  ? UpdateProduct
  : CreateProduct;

export default function AddProduct({ product, title, handleClose }: Props) {
  const isEdit = !!product;
  const { data } = useDollar()
  const { searchParams } = useSetQuery()
  const currency = searchParams.get("currency") || "USD"

  const form = useForm<CreateProduct>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateProductSchema : createProductSchema),
    defaultValues: {
      unitType: 'METER',
      dollar: data.dollar,
      ...product,
      image: null,
    },
  });
  const { displayUrl } = getImageData(form.watch("image"))

  async function onSubmit(values: CreateProduct) {
    if (currency === 'IQD') {
      values.price = IQDtoUSD(values.price, values.dollar);
    }
    let productValues;
    const isUploadImage = form.formState.dirtyFields["image"] && values.image.length
    if (isUploadImage) {
      const { success, message, path } = await uploadImageUsingHandler(values.image, product?.image)

      if (!success) {
        toast.error(message)
        return
      }
      values.image = path;
    } else {
      values.image = undefined
    }
    
    if (isEdit && product?.id) {
      productValues = await updateProductActions(product.id, values as UpdateProduct);
    } else {
      productValues = await createProductActions(values as CreateProduct);
    }

    if (!productValues.success) {
      toast.error(productValues.message);
    } else {
      toast.success(productValues.message);
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
              <FormLabel>ناوی مەواد</FormLabel>
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
          name="price"
          label="بڕی پارەکە"
          dollar={form.watch("dollar")}
        />
        <FormField
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <FormItem className="flex-2 basis-72">
              <FormLabel>یەکەی مەواد</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className="w-full justify-evenly">
                    <SelectValue placeholder="یەکەی مەواد" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="METER">مەتر</SelectItem>
                    <SelectItem value="PIECE">دانە</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <FormItem className="flex-1 basis-96">
                <FormLabel>وێنەی مەواد</FormLabel>
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

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
import UploadFile from '@/components/upload-file';
import { uploadImage } from '@/lib/helper';
import { unlinkImage } from '@/lib/helper';
import {
  CreateProduct,
  createProductSchema,
  OneProduct,
  UpdateProduct,
  updateProductSchema,
} from '@/server/schema/product';

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

  const form = useForm<FormType<typeof isEdit>>({
    mode: 'onSubmit',
    resolver: zodResolver(isEdit ? updateProductSchema : createProductSchema),
    defaultValues: {
      unitType: 'METER',
      ...product,
      id: Number(product?.id) ?? undefined,
      image: '',
    },
  });

  async function onSubmit(values: FormType<typeof isEdit>) {
    const serializedValues = JSON.parse(JSON.stringify(values));
    let productValues;
    let image;

    if (values.image) {
      if (isEdit && serializedValues?.image) {
        const unlinkedImage = await unlinkImage(serializedValues.image);
        if (!unlinkedImage.success) {
          toast.error(unlinkedImage.error);
          return;
        }
      }
      image = await uploadImage(serializedValues.image);
      if (!image.success) {
        toast.error(image.error);
        return;
      }
      values.image = image.filePath;
    }

    if (isEdit && product?.id) {
      productValues = await updateProductActions(values as UpdateProduct);
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
        <FormField
          control={form.control}
          name="price"
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
          name="image"
          render={({ field }) => (
            <FormItem className="flex-1 basis-96">
              <FormLabel>وێنەی مەواد</FormLabel>
              <FormControl>
                <UploadFile
                  name={field.name}
                  accept={['image/jpeg', 'image/png', 'image/jpg']}
                  field={field}
                />
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

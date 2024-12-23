import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { updateCompanyActions } from '@/actions/company';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UpdateCompany, updateCompanySchema } from '@/server/schema/company';

type Props = {
  infoAction: UpdateCompany;
};

export default function EditTableAction({ infoAction }: Props) {
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateCompany>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: { ...infoAction },
  });

  const exit = () => {
    form.reset();
    setOpen(false);
  };

  const { refetch } = useQuery({
    queryKey: ['companyActions', String(form.watch('id'))],
    enabled: !!form.watch('id') && form.watch('id') > 0,
  });

  async function onSubmit(values: UpdateCompany) {
    const { success, message } = await updateCompanyActions(values);
    if (!success) {
      toast.error(message);
      return;
    }
    toast.success(message);
    refetch();
    exit();
  }

  return (
    <section className="flex items-center gap-2">
      <CustomDialogWithTrigger
        open={open}
        key={infoAction.id}
        className="!max-w-fit px-6 lg:px-16"
        onOpenChange={setOpen}
        button={
          <Button className="border text-end" size="icon" variant="ghost">
            <Pencil className="size-5" />
          </Button>
        }
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mx-auto flex max-w-fit flex-col items-center gap-5 p-6"
          >
            <h2 className="text-md font-medium">{infoAction.name}</h2>
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem className="w-96">
                  <FormLabel>کارمەند</FormLabel>
                  <FormControl>
                    <Input {...field} hidden disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-96">
                  <FormLabel>جۆری کردار</FormLabel>
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
                <FormItem className="w-96">
                  <FormLabel>بڕی پارە</FormLabel>
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
                <FormItem className="w-96">
                  <FormLabel>تێبینی</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex w-full flex-wrap gap-5">
              <Button type="submit" className="flex-1">
                نوێکردنەوە
              </Button>
              <Button
                type="reset"
                variant="outline"
                className="flex-1"
                onClick={exit}
              >
                داخستن
              </Button>
            </div>
          </form>
        </Form>
      </CustomDialogWithTrigger>
    </section>
  );
}

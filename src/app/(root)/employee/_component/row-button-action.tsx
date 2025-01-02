import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Table } from '@tanstack/react-table';
import { Check, ChevronsUpDown, LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import useActionEmployee from '../useActionEmployee';

import { createEmployeeActionActions } from '@/actions/employee';
import { CurrencyInput } from '@/components/custom-currency-input';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FormMessage } from '@/components/ui/form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { cn, getMonthStartAndEndOfMonth, IQDtoUSD } from '@/lib/utils';
import {
  CreateEmployeeAction,
  createEmployeeActionSchema,
  OneEmployee,
} from '@/server/schema/employee';

type Props<TData> = {
  table: Table<TData>;
  item: {
    name: string;
    title: string;
    type: CreateEmployeeAction['type'];
    icon: LucideIcon;
  };
};

export default function RowButtonAction<TData>({ table, item }: Props<TData>) {
  const [open, setOpen] = useState(false);
  const { searchParams } = useSetQuery();
  const { data } = useDollar();

  const isTrash = searchParams.get('status') === 'trash';
  const currency = searchParams.get('currency') || 'USD';

  const form = useForm<CreateEmployeeAction>({
    resolver: zodResolver(createEmployeeActionSchema),
    defaultValues: {
      dollar: data.dollar,
      type: item.type,
      dateAction: new Date(),
    },
  });

  const getSelectedEmployee = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.map((row) => row.original as OneEmployee),
    [table, open]
  );

  const employees = useMemo(
    () => table.getRowModel().rows.map((row) => row.original as OneEmployee),
    [table, open]
  );

  const exit = () => {
    form.reset();
    setOpen(false);
  };

  const { refetch } = useActionEmployee(
    form.watch('employeeId'),
    getMonthStartAndEndOfMonth(new Date())
  );

  async function onSubmit(values: CreateEmployeeAction) {
    if (currency === 'IQD') {
      values.amount = IQDtoUSD(values.amount, values.dollar || data.dollar);
    }
    const { success, message } = await createEmployeeActionActions(values);
    if (!success) {
      toast.error(message);
      return;
    }
    toast.success(message);
    refetch();
    form.reset();
    exit();
  }

  useEffect(() => {
    if (!isTrash && open) {
      if (getSelectedEmployee.length > 0) {
        form.setValue('employeeId', getSelectedEmployee[0].id);
      }
      if (employees.length > 0 && getSelectedEmployee.length === 0) {
        form.setValue('employeeId', employees[0].id);
      }
      form.setValue('type', item.type);
    }

    return () => form.reset();
  }, [open, isTrash, employees, getSelectedEmployee, form, item.type]);

  return (
    <section className="flex items-center gap-2">
      <CustomDialogWithTrigger
        key={item.type}
        open={open}
        className="!max-w-fit px-6 lg:px-16"
        onOpenChange={(e) => {
          if (isTrash) return toast.error('تەنها بۆ کارمەندە ئەکتیڤەکانە');
          //if (!e) setQuery('', '', ['currency']);
          setOpen(e);
        }}
        button={
          <Button
            disabled={isTrash}
            className="h-8 w-full border"
            variant="ghost"
          >
            <item.icon className="me-2 size-5" />
            {item.name}
          </Button>
        }
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mx-auto flex max-w-fit flex-col items-center gap-5 p-6"
          >
            <h2 className="text-md font-medium">{item.title}</h2>
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem className="w-96">
                  <FormLabel>کارمەند</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value
                            ? employees.find(
                              (employee) => employee.id === field.value
                            )?.name
                            : 'کارمەندێک هەڵبژێرە...'}
                          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0">
                        <Command>
                          <CommandInput placeholder="ناوی کارمەند..." />
                          <CommandList>
                            <CommandEmpty>کارمەند نەدۆزرایەوە</CommandEmpty>
                            <CommandGroup>
                              {employees.map((employee) => (
                                <CommandItem
                                  key={employee.id}
                                  value={employee.id.toString()}
                                  onSelect={(currentValue) => {
                                    field.onChange(+currentValue);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 size-4',
                                      field.value === employee.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {employee.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem
                  className="w-96"
                  onLoad={() => form.setValue(field.name, item.type)}
                >
                  <FormLabel>جۆری کردار</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CurrencyInput
              className="w-96"
              form={form}
              name="amount"
              label="بڕی پارە"
              dollar={form.watch("dollar")}
            />
            <FormField
              control={form.control}
              name="dollar"
              render={({ field }) => (
                <FormItem className="w-96">
                  <FormLabel>نرخی دۆلار</FormLabel>
                  <FormControl>
                    <Input {...field} type='number' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="w-96">
                  <FormLabel>تێبینی</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="تێبینی"
                      rows={6}
                      className="w-96 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex w-full flex-wrap gap-5">
              <Button type="submit" className="flex-1" disabled={!form.formState.isDirty}>
                {item.name}
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

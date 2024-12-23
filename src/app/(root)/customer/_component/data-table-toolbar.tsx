'use client';

import { Table } from '@tanstack/react-table';
import { Archive, PlusCircleIcon, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useSetQuery from '@/hooks/useSetQuery';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import FormSaleForCustomer from './add-sale-form';
import AddCustomer from './add-customer-form';

interface CustomerData {
  customer: {
    name: string;
    id: number;
  };
}

interface DataTableToolbarProps<TData extends CustomerData> {
  table: Table<TData>;
}


export function DataTableToolbar<TData extends CustomerData>({
  table,
}: DataTableToolbarProps<TData>) {
  const pathname = usePathname();
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const isSale = pathname.includes(pathname.split('/')[2]);
  const title = isSale ? 'وەصڵەکان' : 'کڕیارەکان';

  const customer = (table.getRowModel().flatRows[0].original)?.customer

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder={`بگەڕێ بۆ ${title}...`}
          value={
            (table
              .getColumn(isSale ? 'saleNumber' : 'name')
              ?.getFilterValue() as string) ?? ''
          }
          onChange={(event) =>
            table
              .getColumn(isSale ? 'saleNumber' : 'name')
              ?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button
          variant={isTrash ? 'default' : 'outline'}
          size="sm"
          className="h-8 lg:flex"
          asChild
        >
          <Link href={`${pathname}?status=trash`} replace>
            <Archive className="size-4" />
          </Link>
        </Button>
        <Button
          variant={isTrash ? 'outline' : 'default'}
          size="sm"
          className="h-8 lg:flex"
          asChild
        >
          <Link href={`${pathname}`} replace>
            <ShieldCheck className="size-4" />
          </Link>
        </Button>
      </div>
      <CustomDialogWithTrigger
        button={
          <Button>
            <PlusCircleIcon className="me-2 size-4" />
            {isSale ? "وەصڵ" : "کڕیار"}
          </Button>
        }
      >
        <section className="w-full p-4">
          {isSale ? (
            <FormSaleForCustomer
              customerName={customer?.name || undefined}
              customerId={customer?.id || 0}
              title="زیادکردنی وەصڵ"
            />
          ) : (
            <AddCustomer title="زیادکردنی کڕیار" />
          )}
        </section>
      </CustomDialogWithTrigger>
    </div>
  );
}

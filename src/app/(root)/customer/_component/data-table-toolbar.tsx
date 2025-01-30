'use client';

import { Table } from '@tanstack/react-table';
import { PlusCircleIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import FormSaleForCustomer from './add-sale-form';
import AddCustomer from './add-customer-form';
import { OneCustomer } from '@/server/schema/customer';
import { useState } from 'react';
import BackButton from '@/components/layout/back-button';
import useInputSetQuery from '@/hooks/use-input-set-query';
import TrashAndActiveButtons from '@/components/trash-and-active-buttons';

interface CustomerData {
  customer: {
    name: string;
    id: number;
  };
}

interface DataTableToolbarProps<TData extends CustomerData> {
  table: Table<TData>;
  customer?: OneCustomer
}


export function DataTableToolbar<TData extends CustomerData>({
  table,
  customer
}: DataTableToolbarProps<TData>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false)

  const isSale = pathname.includes(pathname.split('/')[2]);
  const title = isSale ? 'وەصڵەکان' : 'کڕیارەکان';

  useInputSetQuery("invoice", "saleNumber", table);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder={`بگەڕێ بۆ ${title}...`}
          value={table.getColumn(isSale ? "saleNumber" : "name")?.getFilterValue() as string ?? ''}
          onChange={(event) =>
            table
              .getColumn(isSale ? 'saleNumber' : 'name')
              ?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <TrashAndActiveButtons />
      </div>

      <CustomDialogWithTrigger
        open={open}
        onOpenChange={setOpen}
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
              handleClose={() => setOpen(false)}
              customerName={customer?.name || undefined}
              customerId={customer?.id || 0}
              title="زیادکردنی وەصڵ"
            />
          ) : (
            <AddCustomer
              handleClose={() => setOpen(false)}
              title="زیادکردنی کڕیار" />
          )}
        </section>
      </CustomDialogWithTrigger>
      {isSale && (<BackButton />)}
    </div>
  );
}

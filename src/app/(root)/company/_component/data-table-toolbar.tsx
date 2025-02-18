'use client';

import { Table } from '@tanstack/react-table';
import { PlusCircleIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import AddPurchase from './add-purchase-form';
import AddCompany from './add-company-form';
import { useState } from 'react';
import BackButton from '@/components/layout/back-button';
import useInputSetQuery from '@/hooks/use-input-set-query';
import TrashAndActiveButtons from '@/components/trash-and-active-buttons';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false)

  const title = pathname.includes(pathname.split('/')[2])
  useInputSetQuery("invoice", "name", table);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder={`بگەڕێ بۆ ${title ? "کڕدراوەکان" : "کۆمپانیاکان"}...`}
          value={table.getColumn("name")?.getFilterValue() as string ?? ""}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
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
            {title ? "کڕین" : "کۆمپانیا"}
          </Button>
        }
      >
        <section className="w-full p-4">
          {title ? (
            <AddPurchase
              handleClose={() => setOpen(false)}
              title="زیادکردنی کڕین" />
          ) : (
            <AddCompany
              handleClose={() => setOpen(false)}
              title="زیادکردنی کۆمپانیا" />
          )}
        </section>
      </CustomDialogWithTrigger>
      {title && (<BackButton />)}
    </div>
  );
}

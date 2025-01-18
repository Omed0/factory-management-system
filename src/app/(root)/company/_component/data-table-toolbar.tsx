'use client';

import { Table } from '@tanstack/react-table';
import { Archive, PlusCircleIcon, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useSetQuery from '@/hooks/useSetQuery';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import AddPurchase from './add-purchase-form';
import AddCompany from './add-company-form';
import { useEffect, useState } from 'react';
import BackButton from '@/components/layout/back-button';
import useInputSetQuery from '@/hooks/use-input-set-query';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false)
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

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

'use client';

import { useState } from 'react';
import { Table } from '@tanstack/react-table';
import {
  Archive,
  ArchiveIcon,
  CircleX,
  History,
  PlusCircleIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import AddProduct from './add-product';

import {
  deleteManyProductActions,
  forceDeleteManyProductActions,
  restoreManyProductActions,
} from '@/actions/product';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import useSetQuery from '@/hooks/useSetQuery';
import { OneProduct } from '@/server/schema/product';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const [open, setOpen] = useState(false);
  const { searchParams } = useSetQuery();
  const isSelected =
    table.getIsSomeRowsSelected() || table.getIsAllPageRowsSelected();
  const isTrash = searchParams.get('status') === 'trash';

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder="بگەڕێ بۆ مەواد..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <DropdownMenuMoreAction
          isSelected={isSelected}
          isTrash={isTrash}
          table={table}
        />
        <Button
          variant={isTrash ? 'default' : 'outline'}
          size="sm"
          className="h-8 lg:flex"
          asChild
        >
          <Link href="/product?status=trash" replace>
            <Archive className="size-4" />
          </Link>
        </Button>
        <Button
          variant={isTrash ? 'outline' : 'default'}
          size="sm"
          className="h-8 lg:flex"
          asChild
        >
          <Link href="/product" replace>
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
            زیادکردن
          </Button>
        }
      >
        <section className="w-full p-4">
          <AddProduct
            title="زیادکردنی مەواد"
            handleClose={() => setOpen(false)}
          />
        </section>
      </CustomDialogWithTrigger>
    </div>
  );
}

function DropdownMenuMoreAction<TData>({
  isSelected,
  isTrash,
  table,
}: {
  isSelected: boolean;
  isTrash: boolean;
  table: Table<TData>;
}) {
  const ids = table
    .getSelectedRowModel()
    .rows.map((row) => row.original as OneProduct)
    .map((product) => product.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden h-8 lg:flex">
          <SlidersHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="m-2 w-[150px]">
        <DropdownMenuLabel className="text-sm font-medium">
          {!isSelected ? 'مەواد دیاریبکە' : 'مەوادەکان'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!isSelected}
          onClick={() => table.resetRowSelection(true)}
        >
          <CircleX className="size-4" />
          لادان
        </DropdownMenuItem>
        {isTrash && (
          <DropdownMenuItem
            className="text-muted-foreground"
            disabled={!isSelected}
          >
            <DynamicForm
              id_form="archive-all"
              ids={ids}
              action={restoreManyProductActions}
            >
              <History className="size-4" />
              گەڕاندنەوەی هەمووی
            </DynamicForm>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!isSelected} className="text-red-500">
          {isTrash ? (
            <DynamicForm
              id_form="archive-all"
              ids={ids}
              action={forceDeleteManyProductActions}
            >
              <Trash className="size-4" />
              سڕینەوەی هەمووی
            </DynamicForm>
          ) : (
            <DynamicForm
              id_form="archive-all"
              ids={ids}
              action={deleteManyProductActions}
            >
              <ArchiveIcon className="size-4" />
              ئەرشیفکردن
            </DynamicForm>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DynamicForm({
  ids,
  id_form,
  action,
  children,
}: {
  ids: number[];
  id_form: string;
  action: (ids: number[]) => Promise<{ success: boolean; message: string }>;
  children: React.ReactNode;
}) {
  return (
    <form
      action={async () => {
        const res = await action(ids);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
      }}
      id={id_form}
    >
      <Button
        type="submit"
        variant="ghost"
        className="h-5 text-wrap p-4"
        form={id_form}
      >
        {children}
      </Button>
    </form>
  );
}

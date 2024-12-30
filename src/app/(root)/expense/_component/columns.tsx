'use client';

import { ColumnDef, Row } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

import { Checkbox } from '@/components/ui/checkbox';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { OneExpense } from '@/server/schema/expense';
import useSetQuery from '@/hooks/useSetQuery';

export const columns: ColumnDef<OneExpense>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بابەت" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">{row.original.title}</div>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بڕی پارە" />
    ),
    cell: function CellComponent({ row }) {
      const { amount, dollar } = row.original
      const formatPrice = useConvertCurrency(amount, dollar);
      return (
        <div className="flex w-[100px] items-center">
          <span>{formatPrice}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at).toLocaleDateString(
        'en-GB'
      );
      return (
        <div className="flex w-[100px] items-center">
          <span>{date}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'note',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="تێبینی" />
    ),
    cell: ({ row }) => {
      return (
        <div className="max-w-96 text-wrap">
          <span>{row.getValue('note')}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => <DataTableRowActions row={row as Row<OneExpense>} />,
  },
];

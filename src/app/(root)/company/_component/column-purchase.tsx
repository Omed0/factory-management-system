'use client';

import { ColumnDef, Row } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowPurchaseActions } from './data-table-row-purchase';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { OneCompanyPurchase } from '@/server/schema/company';

export const column_purchase: ColumnDef<OneCompanyPurchase>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      const isFinish =
        row.original?.totalAmount === row.original?.totalRemaining;
      return (
        <div className="flex w-32 items-center gap-3">
          <Checkbox checked={isFinish} />
          <span>{row.original?.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری کڕین" />
    ),
    cell: ({ row }) => {
      const type = row.original?.type;
      return (
        <div className="w-[100px]">
          <Badge variant={type === 'LOAN' ? 'destructive' : 'default'}>
            {type}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی پارەی گشتی" />
    ),
    cell: function CellComponent({ row }) {
      const formatedAmount = useConvertCurrency(row.original?.totalAmount || 0);
      return (
        <div className="w-[100px]">
          <span>{formatedAmount}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalRemaining',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی پارەی دراو" />
    ),
    cell: function CellComponent({ row }) {
      const formatedAmount = useConvertCurrency(
        row.original?.totalRemaining || 0
      );
      return (
        <div className="w-[100px]">
          <span>{formatedAmount}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'purchaseDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const date = new Date(
        row.original?.purchaseDate ?? new Date()
      ).toLocaleDateString('en-GB');
      return (
        <div className="w-[100px]">
          <span>{date}</span>
        </div>
      );
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
          <span>{row.original?.note}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => (
      <DataTableRowPurchaseActions row={row as Row<OneCompanyPurchase>} />
    ),
  },
];

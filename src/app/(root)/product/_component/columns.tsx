'use client';

import { ColumnDef, Row } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

import { Checkbox } from '@/components/ui/checkbox';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { OneProduct } from '@/server/schema/product';

export const columns: ColumnDef<OneProduct>[] = [
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
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      return <div className="w-[100px]">{row.original.name}</div>;
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="نرخ" />
    ),
    cell: function CellComponent({ row }) {
      const price = row.original.price;
      const formatPrice = useConvertCurrency(price);
      return (
        <div className="w-[100px]">
          <span>{formatPrice}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'unitType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری یەکە" />
    ),
    cell: ({ row }) => {
      return (
        <div className="w-[100px]">
          <span>{row.original.unitType}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار تۆمارکردن" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at).toLocaleDateString(
        'en-GB'
      );
      return (
        <div className="w-[100px]">
          <span>{date}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => <DataTableRowActions row={row as Row<OneProduct>} />,
  },
];

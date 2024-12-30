'use client';

import { ColumnDef, Row } from '@tanstack/react-table';
import Image from 'next/image';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

import { Checkbox } from '@/components/ui/checkbox';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { OneEmployee } from '@/server/schema/employee';
import { FALLBACK_IMAGE } from '@/lib/constant';

export const columns: ColumnDef<OneEmployee>[] = [
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
      <DataTableColumnHeader column={column} title="ناوی کارمەند" />
    ),
    cell: ({ row }) => {
      const image = row.original.image
      return (
        <div className="flex items-center gap-3">
          {image && (
            <Image
              className="aspect-square rounded-full size-16 object-cover object-center"
              src={`/${image}`}
              onError={(event) => {
                event.currentTarget.id = FALLBACK_IMAGE;
                event.currentTarget.srcset = FALLBACK_IMAGE;
              }}
              alt={row.original.name}
              height={400}
              width={400}
              quality={100}
            />
          )}
          <span className="max-w-[500px] truncate font-medium">
            {row.original.name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ژمارەی مۆبایل" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          <span>{row.getValue('phone')}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'monthSalary',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="مووچەی مانگانە" />
    ),
    cell: function CellComponent({ row }) {
      const { dollar, monthSalary } = row.original
      const formatPrice = useConvertCurrency(monthSalary, dollar);
      return (
        <div className="flex w-[100px] items-center">
          <span>{formatPrice}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'address',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناونیشان" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          <span>{row.getValue('address')}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => <DataTableRowActions row={row as Row<OneEmployee>} />,
  },
];

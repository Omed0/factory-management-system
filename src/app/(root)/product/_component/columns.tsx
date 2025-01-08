'use client';

import { ColumnDef, Row } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

import { Checkbox } from '@/components/ui/checkbox';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { OneProduct } from '@/server/schema/product';
import Image from 'next/image';
import { FALLBACK_IMAGE } from '@/lib/constant';

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
      const image = row.original.image
      return (
        <div className="flex items-center gap-3">
          {!!image && (
            <Image
              src={`/${image}`}
              className='aspect-square size-16 object-contain'
              alt={row.original.name}
              onError={(event) => {
                event.currentTarget.id = FALLBACK_IMAGE;
                event.currentTarget.srcset = FALLBACK_IMAGE;
              }}
              quality={100}
              height={200}
              width={200}
            />
          )}
          <span>{row.original.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="نرخ" />
    ),
    cell: function CellComponent({ row }) {
      const { price, dollar } = row.original;
      const formatPrice = useConvertCurrency(price, dollar);
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
      const unitType = row.original.unitType === "METER" ? "مەتر" : "دانە"
      return (
        <div className="w-[100px]">
          <span>{unitType}</span>
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
      const date = new Date(row.original.created_at).toLocaleDateString('en-GB');
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

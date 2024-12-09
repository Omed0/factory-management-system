'use client';

import { ColumnDef, Row } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowCustomerActions } from './data-table-row-customer-actions';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OneCustomer } from '@/server/schema/customer';

export const columns: ColumnDef<OneCustomer>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      const isTrash = Boolean(row.original.deleted_at);
      return (
        <Link
          href={!isTrash ? `/customer/${row.original.id}` : '#'}
          className={cn('flex w-[100px] items-center', {
            'text-blue-500 underline': !isTrash,
            'text-foreground/70 cursor-default': isTrash,
          })}
        >
          <span>{row.original.name}</span>
        </Link>
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
          <span>{row.original.phone}</span>
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
          <span>{row.original.address}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'isSalariedeEmployee',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ئایا فەرمانبەرە" />
    ),
    cell: ({ row }) => {
      const isEmployee = row.original.isSalariedeEmployee;
      return (
        <div className="flex w-[100px] items-center">
          <Badge className="" variant={isEmployee ? 'default' : 'outline'}>
            {isEmployee ? 'بەڵی' : 'نەخێر'}
          </Badge>
        </div>
      );
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
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => (
      <DataTableRowCustomerActions row={row as Row<OneCustomer>} />
    ),
  },
];

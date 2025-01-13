'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import Link from 'next/link';
import { CombinedData } from '@/server/access-layer/information';
import { redirect_to_page_name, tr_define_name_type_table, tr_type_calculated } from '@/lib/constant';
import { cn } from '@/lib/utils';

export const columns: ColumnDef<CombinedData>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زنجیرە" />
    ),
    cell: ({ row }) => {
      const { id, type } = row.original;
      const url = redirect_to_page_name.find((item) => item.name === type)?.value(id || 0);
      return (
        <Link
          className={cn("min-w-20", {
            "text-blue-500 underline": row.index !== 0
          })}
          href={typeof url === 'string' ? url : row.index !== 0 ? "/employee" : "#"}
        >
          {row.index}
        </Link>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const { createdAt } = row.original
      const date = createdAt ? new Date(createdAt).toLocaleDateString('en-GB') : '';

      return (<span>{date}</span>)
    },
  },
  {
    accessorKey: 'partner',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="وەسف" />
    ),
    cell: ({ row }) => {
      const { type, partner } = row.original
      return (
        <div className='flex items-center gap-2'>
          {type ? (
            <>
              <span>{tr_type_calculated.get(type)}</span>
              {partner && (<span className='font-semibold'> | {partner}</span>)}
              <span>| {tr_define_name_type_table.get(type)}</span>
            </>
          ) : (
            <span>{partner}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'subtraction',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="پارەدان" />
    ),
    cell: function CellComponent({ row }) {
      const { subtraction, dollar, type } = row.original
      const formatedAmount = useConvertCurrency(subtraction || 0, dollar || undefined);
      const isShow = type === "expense" || type === "companyPurchase" || type === null;

      return (<span>{isShow ? formatedAmount : ""}</span>);
    },
  },
  {
    accessorKey: 'addition',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="پارەوەرگرتن" />
    ),
    cell: function CellComponent({ row }) {
      const { dollar, addition, type } = row.original
      const formatedAmount = useConvertCurrency(addition || 0, dollar || undefined);
      const isShow = type === "expense" || type === "companyPurchase";

      return (<span>{!isShow ? formatedAmount : ""}</span>);
    },
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="باڵانس" />
    ),
    cell: function CellComponent({ row }) {
      const { dollar, balance } = row.original
      const formatedAmount = useConvertCurrency(balance || 0, dollar || undefined);

      return (<span>{formatedAmount}</span>);
    },
  },
];

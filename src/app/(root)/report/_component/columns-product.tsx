'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import useSetQuery from '@/hooks/useSetQuery';
import { report_link, report_name } from '../_constant';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export const columns_product: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      return (
        <div className={"flex w-[100px]"}>
          {row.original.name}
        </div >
      );
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی دراوە لە وەصڵ" />
    ),
    cell: function CellComponent({ row }) {
      const formatPrice = useConvertCurrency(row.getValue('amount'));
      return (
        <div className="flex w-[100px]">
          <span>{formatPrice}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری وەصڵ" />
    ),
    cell: ({ row }) => {
      const tr_type = row.original?.type === "CASH" ? "نەقد" : "قەرز"
      return (
        <div className="flex w-[100px]">
          <span>{tr_type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.date).toLocaleDateString('en-GB');
      return (
        <div className="flex w-[100px]">
          <span>{date}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="عەدەد" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px]">
          <span>{row.getValue('quantity')}</span>
        </div>
      );
    },
  },
];

'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import { report_link, report_name } from '../_constant';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      const params = useParams()

      const id = row.original?.redirectId?.toString()
      const report = params.id || report_name[0]
      const currentLink = report_link.find((v) => v.name === report)?.value(id)

      const isTotalAmountRow = row.original.id == 0

      return (
        <Link
          href={isTotalAmountRow ? "#" : currentLink || "#"}
          className={cn("flex w-[100px] items-center cursor-auto", {
            "text-blue-500 hover:underline cursor-pointer": currentLink && !isTotalAmountRow
          })}
        >
          {row.original.name}
        </Link>
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
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری وەصڵ" />
    ),
    cell: ({ row }) => {
      const tr_type = row.original?.type === "CASH" ? "نەقد" : "قەرز"
      return (
        <div className="flex w-[100px] items-center">
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
      const date = new Date(row.original.date).toLocaleDateString(
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
];

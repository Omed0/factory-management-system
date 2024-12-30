'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import { report_link, report_name } from '../_constant';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<any>[] = [
  //{
  //  accessorKey: 'id',
  //  header: ({ column }) => (
  //    <DataTableColumnHeader column={column} title="زنجیرە" />
  //  ),
  //  cell: ({ row }) => {
  //    const id = row.original?.id?.toString()
  //    return (
  //      <span className="w-[100px]">{id}</span>
  //    );
  //  },
  //},
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
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری وەصڵ" />
    ),
    cell: ({ row }) => {
      const isLoan = row.original?.type === "LOAN"
      const isTotal = row.original?.id === 0
      return (
        <div className="flex w-[100px] items-center">
          {isTotal ? (
            <span></span>
          ) : (
            <Badge variant={isLoan ? "secondary" : "outline"} className='min-w-24 justify-center'>
              {isLoan ? "قەرز" : "نەقد"}
            </Badge>
          )}
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

'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { columns_report, report_link, report_name } from '../_constant';

export const columns_reports: ColumnDef<columns_report>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      const right = isNotExpense();
      return (
        <DataTableColumnHeader column={column} title={right ? "خاوەن" : "زنجیرە"} />
      )
    },
    cell: ({ row }) => {
      const { owner, id } = row.original;
      const isHidden = isNotExpense();
      return (
        isHidden ? (
          <span>{owner?.name}</span>
        ) : +id !== 0 && (
          <span>{id}</span>
        )
      )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="وەصڵ" />
    ),
    cell: ({ row }) => {
      const { name, redirectId, id } = row.original;
      const param = useParams()
      const path = report_link.find((item) => item.name === param.id)?.value(name, redirectId);
      const notRedirect = +id === 0;
      return (
        <div className="flex min-w-24">
          {notRedirect ? (
            <span>{name}</span>
          ) : (
            <Link className="text-blue-500 hover:underline" href={path || '#'}>
              {name}
            </Link>
          )}
        </div>
      )
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
        <div className="flex min-w-24">
          <span>{formatPrice}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => {
      const isHidden = isNotExpense();
      return (isHidden && <DataTableColumnHeader column={column} title="جۆری وەصڵ" />)
    },
    cell: ({ row }) => {
      const { type, id } = row.original;
      const isHidden = isNotExpense() && +id !== 0;
      const tr_type = type === "CASH" ? "نەقد" : "قەرز"
      return (isHidden &&
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
        <div className="flex min-w-20">
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
        <div className="flex text-wrap min-w-32">
          <span>{row.getValue('note')}</span>
        </div>
      );
    },
  },
];


function isNotExpense() {
  const params = useParams();
  const isExpense = params.id === report_name[0];
  return !isExpense;
}
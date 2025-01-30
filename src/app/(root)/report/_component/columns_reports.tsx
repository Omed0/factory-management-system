'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from './data-table-column-header';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { columns_report, report_name } from '../_constant';
import { parseDate } from '@/lib/utils';
import { redirect_to_page_name } from '@/lib/constant';

export const columns_reports: ColumnDef<columns_report>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      const right = isNotExpense();
      return (
        <DataTableColumnHeader column={column} title={right ? "خاوەن" : "زنجیرە"} />
      );
    },
    cell: ({ row }) => {
      const { owner, id } = row.original;
      const isHidden = isNotExpense();
      return isHidden ? (
        <span>{owner?.name ?? "خاوەنی نییە"}</span>
      ) : (
        +id !== 0 && <span>{id}</span>
      );
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="وەصڵ" />
    ),
    cell: ({ row }) => {
      const param = useParams();
      const path = param.id === "sale" ? "customer" : param.id === "purchase" ? "company" : param.id;
      const { name, redirectId, id } = row.original;
      const url = redirect_to_page_name.find(({ name }) => name === path)?.value(name, +redirectId);
      const notRedirect = +id === 0;

      return (
        <div className="flex min-w-24">
          {notRedirect ? (
            <span>{name}</span>
          ) : (
            <Link className="text-blue-500 hover:underline" href={url || '#'}>
              {name}
            </Link>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی وەصڵ" />
    ),
    cell: ({ row }) => {
      const formatPrice = useConvertCurrency(row.original.totalAmount);
      return (
        <div className="flex min-w-24">
          <span>{formatPrice}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalRemainig',
    header: ({ column }) => {
      const isShow = isNotExpense();
      return isShow && <DataTableColumnHeader column={column} title="کۆی دراوە لە وەصڵ" />;
    },
    cell: ({ row }) => {
      const isShow = isNotExpense();
      if (!isShow) return null;
      const formatPrice = useConvertCurrency(row.original.totalRemainig);
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
      return isHidden && <DataTableColumnHeader column={column} title="جۆری وەصڵ" />;
    },
    cell: ({ row }) => {
      const { type, id } = row.original;
      const isHidden = isNotExpense() && +id !== 0;
      const tr_type = type === "CASH" ? "نەقد" : "قەرز";
      return (
        isHidden && (
          <div className="flex w-[100px]">
            <span>{tr_type}</span>
          </div>
        )
      );
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-20">
        <span>{parseDate(row.original.date)}</span>
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'note',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="تێبینی" />
    ),
    cell: ({ row }) => (
      <div className="flex text-wrap min-w-32">
        <span>{row.original.note}</span>
      </div>
    ),
  },
];


function isNotExpense() {
  const params = useParams();
  const isExpense = params.id === report_name[0];
  return !isExpense;
}

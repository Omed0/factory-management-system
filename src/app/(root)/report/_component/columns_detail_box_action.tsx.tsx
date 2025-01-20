'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import Link from 'next/link';
import { CombinedData } from '@/server/access-layer/information';
import { redirect_to_page_name, tr_define_name_type_table, tr_type_calculated } from '@/lib/constant';
import { isShowValue } from '../_constant';
import { parseDate } from '@/lib/utils';

export const columns_detail_box_action: ColumnDef<CombinedData>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زنجیرە" />
    ),
    cell: ({ row }) => {
      const { id, pathname, name } = row.original;
      const url = redirect_to_page_name.find((item) => item.name === pathname)?.value(name!, id || 0);
      const isNotFirst = row.index !== 0;
      return (
        isNotFirst && (
          <Link
            className={"min-w-20 text-blue-500 underline"}
            href={url || "#"}
          >
            {row.index}
          </Link>
        )
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      return (<div>{parseDate(row.original.createdAt)}</div>)
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
      const formatedAmount = useConvertCurrency(subtraction || 0, dollar);
      const isShow = isShowValue.subtraction.includes(type as typeof isShowValue.subtraction[number]);
      return (<div>{isShow ? formatedAmount : ""}</div>);
    },
  },
  {
    accessorKey: 'addition',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="پارەوەرگرتن" />
    ),
    cell: function CellComponent({ row }) {
      const { dollar, addition, type } = row.original
      const formatedAmount = useConvertCurrency(addition || 0, dollar);
      const isShow = isShowValue.addition.includes(type as typeof isShowValue.addition[number]);

      return (<div>{isShow ? formatedAmount : ""}</div>);
    },
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="باڵانس" />
    ),
    cell: function CellComponent({ row }) {
      const { dollar, balance } = row.original
      const formatedAmount = useConvertCurrency(balance || 0, dollar);

      return (<div>{formatedAmount}</div>);
    },
  },
];

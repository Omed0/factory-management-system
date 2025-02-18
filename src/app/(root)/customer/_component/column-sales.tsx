'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowSaleActions } from './data-table-row-sale-actions';

import { Badge } from '@/components/ui/badge';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { cn, parseDate } from '@/lib/utils';
import { OneSale } from '@/server/schema/sale';
import CustomToolTip from '@/components/custom-tool-tip';


export const column_sale: ColumnDef<OneSale>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زنجیرە" />
    ),
    cell: ({ row }) => {
      return (<span>{row.original.id}</span>);
    },
  },
  {
    accessorKey: 'saleNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناوی وەصڵ" />
    ),
    cell: function CellComponent({ row }) {
      const sale = row.original;
      const isTrash = Boolean(sale.deleted_at);
      const status = sale.isFinished || isTrash;
      const showAmount = useConvertCurrency(sale.monthlyPaid, sale.dollar);

      return (
        <div className="flex items-center gap-2">
          <Link
            href={status ? '#' : `${sale.customerId}/sale?invoice=${sale.id}`}
            className={cn('w-32', {
              'text-blue-500 underline': !status,
              'text-foreground/70 cursor-default line-through': status,
            })}
          >
            <CustomToolTip
              isShow={sale.saleType === 'LOAN'}
              trigger={<p>{sale.saleNumber}</p>}
            >
              <p>پارەدانی مانگانە : {showAmount}</p>
            </CustomToolTip>
          </Link>
        </div>
      );
    },
  },
  {
    accessorKey: 'saleType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="جۆری پارەدان" />
    ),
    cell: ({ row }) => {
      const invoiceType = row.original.saleType === 'CASH';
      return (
        <div className="w-[100px]">
          <Badge
            className="min-w-20 justify-center"
            variant={invoiceType ? 'outline' : 'secondary'}
          >
            {invoiceType ? 'نەقد' : 'قەرز'}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی گشتی" />
    ),
    cell: function CellComponent({ row }) {
      const { discount, totalAmount, dollar } = row.original;
      const formatedTotalAmount = useConvertCurrency(totalAmount, dollar);
      const totalAfterDiscount = useConvertCurrency(totalAmount - discount, dollar);
      return (
        <div className="amount-cell w-[100px]">
          {discount ? (
            <>
              <del className="text-red-500">{formatedTotalAmount}</del>
              <span className="block">{totalAfterDiscount}</span>
            </>
          ) : (
            <span>{formatedTotalAmount}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalRemaining',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="کۆی دراوە" />
    ),
    cell: function CellComponent({ row }) {
      const { totalRemaining, dollar } = row.original
      const formatedTotalRemaining = useConvertCurrency(totalRemaining, dollar);
      return (
        <div className="amount-cell w-[100px]">
          <span>{formatedTotalRemaining}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'discount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="داشکاندن" />
    ),
    cell: function CellComponent({ row }) {
      const { discount, dollar } = row.original
      const formatedDiscount = useConvertCurrency(discount, dollar);
      return <div className="amount-cell">{formatedDiscount}</div>;
    },
  },
  {
    accessorKey: 'saleDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      return <div>{parseDate(row.original?.saleDate)}</div>;
    },
  },
  {
    accessorKey: 'note',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="تێبینی" />
    ),
    cell: ({ row }) => {
      return (
        <div className="max-w-96 text-wrap line-clamp-2">
          <span>{row.original?.note}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="زیاتر" />
    ),
    cell: ({ row }) => {
      return (<DataTableRowSaleActions row={row} />)
    },
  },
];

'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowSaleActions } from './data-table-row-sale-actions';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { cn } from '@/lib/utils';
import { OneSale } from '@/server/schema/sale';

export const column_sale: ColumnDef<OneSale>[] = [
  {
    accessorKey: 'saleNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="وەصڵ" />
    ),
    cell: function CellComponent({ row }) {
      const sale = row.original;
      const isTrash = Boolean(sale.deleted_at);
      const status = sale.isFinished || isTrash;

      return (
        <div className="flex items-center gap-2">
          <Checkbox asChild checked={status} className={status ? '' : ''} />
          <Link
            href={status ? '#' : `${sale.customerId}/sale?invoice=${sale.id}`}
            className={cn('w-32', {
              'text-blue-500 underline': !status,
              'text-foreground/70 cursor-default': status,
            })}
          >
            <TooltipMonthlyPaid
              isShow={sale.saleType === 'LOAN'}
              amount={sale.monthlyPaid}
            >
              <p>{sale.saleNumber}</p>
            </TooltipMonthlyPaid>
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
      const discount = row.original.discount;
      const totalAmount = row.original.totalAmount;
      const formatedTotalAmount = useConvertCurrency(totalAmount);
      const totalAfterDiscount = useConvertCurrency(totalAmount - discount);
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
      const { discount, totalRemaining, totalAmount } = row.original;
      const isEqual = totalAmount === totalRemaining;
      const totalAfterDiscount = useConvertCurrency(totalRemaining - discount);
      const formatedTotalRemaining = useConvertCurrency(totalRemaining);
      return (
        <div className="amount-cell w-[100px]">
          {isEqual && !!discount ? (
            <>
              <del className="text-red-500">{formatedTotalRemaining}</del>
              <span className="block">{totalAfterDiscount}</span>
            </>
          ) : (
            <span>{formatedTotalRemaining}</span>
          )}
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
      const formatedDiscount = useConvertCurrency(row.original.discount || 0);
      return <div className="amount-cell">{formatedDiscount}</div>;
    },
  },
  {
    accessorKey: 'saleDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original?.saleDate).toLocaleDateString('en-GB');
      return <div>{date}</div>;
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
    cell: ({ row }) => <DataTableRowSaleActions row={row} />,
  },
];

const TooltipMonthlyPaid = ({
  children,
  amount,
  isShow,
}: {
  children: React.ReactNode;
  amount: number;
  isShow: boolean;
}) => {
  const showAmount = useConvertCurrency(amount);
  return (
    <Tooltip>
      <TooltipTrigger className="text-inherit decoration-inherit [cursor:inherit] [text-decoration:inherit]">
        {children}
      </TooltipTrigger>
      {isShow && (
        <TooltipContent>
          <p>پارەدانی مانگانە : {showAmount}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

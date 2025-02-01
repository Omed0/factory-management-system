'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from './data-table-column-header';
import useConvertCurrency from '@/hooks/useConvertCurrency';
import { PartnersLoan } from '@/server/access-layer/information';
import Link from 'next/link';
import useSetQuery from '@/hooks/useSetQuery';
import { parseDate } from '@/lib/utils';
import { redirect_to_page_name } from '@/lib/constant';

export const columns_loan: ColumnDef<PartnersLoan>[] = [
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="زنجیرە" />
        ),
        cell: ({ row }) => <span>{row.original.id}</span>
    },
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ناو" />
        ),
        cell: ({ row }) => (<span>{row.original?.name || "سڕاوەتەوە"}</span>),
    },
    {
        accessorKey: 'invocie',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="وەصڵ" />
        ),
        cell: function ({ row }) {
            const { searchParams } = useSetQuery()
            const { invoice, partnerId = null } = row.original;
            const partnerLoanType = searchParams.get('loanPartner') || "customer";
            const url = redirect_to_page_name.find(({ name }) => name === partnerLoanType)?.value(invoice, partnerId);

            return (
                partnerId ? (
                    <Link
                        className='cursor-pointer underline text-blue-400'
                        href={url || '#'}
                        passHref>
                        <span>{invoice}</span>
                    </Link>
                ) : (
                    <span>{invoice}</span>
                )
            )
        }
    },
    {
        accessorKey: 'totalAmount',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="کۆی پارەکە" />
        ),
        cell: function CellComponent({ row }) {
            const { totalAmount, dollar, discount } = row.original;
            const TotalAmountWithDiscount = !!discount ? totalAmount - discount : totalAmount; //in company purchase does not have discount so we need to check it
            const formatPrice = useConvertCurrency(totalAmount, dollar);
            const formatPriceWithDiscount = useConvertCurrency(TotalAmountWithDiscount, dollar);
            return (
                <div className="flex min-w-24">
                    {discount > 0 ?
                        (
                            <div className='flex flex-col'>
                                <del className="line-through text-red-500">{formatPrice}</del>
                                <span>{formatPriceWithDiscount}</span>
                            </div>
                        ) :
                        <span>{formatPrice}</span>}
                </div>
            );
        },
    },
    {
        accessorKey: 'totalRemaining',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="کۆی دراوە لە وەصڵ" />
        ),
        cell: function CellComponent({ row }) {
            const { totalRemaining, dollar } = row.original;
            const formatPrice = useConvertCurrency(totalRemaining, dollar);
            return (
                <div className="flex min-w-24">
                    <span>{formatPrice}</span>
                </div>
            );
        },
    },
    {
        accessorKey: 'totalRemaining',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="کۆی قەرزی ماوە" />
        ),
        cell: function CellComponent({ row }) {
            const { totalRemaining, dollar, discount, totalAmount } = row.original;
            const ExistLoan = !!discount ? (totalAmount - discount) - totalRemaining : totalAmount - totalRemaining; //in company purchase does not have discount so we need to check it
            const formatPrice = useConvertCurrency(ExistLoan, dollar);
            return (
                <div className="flex min-w-24">
                    <span>{formatPrice}</span>
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
            return (
                <div className="flex min-w-20">
                    <span>{parseDate(row.original.date)}</span>
                </div>
            );
        },
    },
];

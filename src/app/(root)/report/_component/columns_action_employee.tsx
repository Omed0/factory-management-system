'use client';

import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from './data-table-column-header';

import useConvertCurrency from '@/hooks/useConvertCurrency';
import Link from 'next/link';
import { isShowValue } from '../_constant';
import { parseDate } from '@/lib/utils';
import { employeeActionType } from '@/server/access-layer/information';
import { redirect_to_page_name, tr_employee_action, tr_type_calculated } from '@/lib/constant';

export const columns_action_employee: ColumnDef<employeeActionType>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ناو" />
        ),
        cell: ({ row }) => {
            const isNotFirst = row.index !== 0;
            const { name, employeeId } = row.original;
            const url = redirect_to_page_name.find(({ name }) => name === "employee")?.value(name, row.original.employeeId);
            return (
                isNotFirst && employeeId ? (
                    <Link
                        className={"min-w-14 text-blue-500 underline"}
                        href={url || "#"}
                    >
                        {name}
                    </Link>
                ) : (
                    <span className='min-w-20'>{name || "سڕاوەتەوە"}</span>
                )
            )
        },
    },
    {
        accessorKey: 'type',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="وەسف" />
        ),
        cell: ({ row }) => {
            const { type } = row.original
            return (
                <div className='flex items-center gap-2'>
                    <span>{tr_employee_action.get(type as any)}</span>
                    <span>{!!type && " | "}{tr_type_calculated.get(type)}</span>
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
        accessorKey: 'createdAt',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="بەروار" />
        ),
        cell: ({ row }) => {
            return (<div>{parseDate(row.original.createdAt)}</div>)
        },
    },
];

"use client"

import { ColumnDef, Row } from "@tanstack/react-table"

import { DataTableColumnHeader } from "./data-table-column-header"
import { OneCompanyPurchase } from "@/server/schema/company"
import { DataTableRowPurchaseActions } from "./data-table-row-purchase"
import { Badge } from "@/components/ui/badge"

export const column_purchase: ColumnDef<OneCompanyPurchase>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ناو مەواد" />
        ),
        cell: ({ row }) => {
            return (
                <div className="flex w-32 items-center">
                    <span>{row.original?.name}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "type",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="جۆری کڕین" />
        ),
        cell: ({ row }) => {
            const isFinish = row.original?.totalAmount === row.original?.totalRemaining;
            return (
                <div className="w-[100px]">
                    <Badge variant={!isFinish ? "destructive" : "default"}>
                        {row.original?.type}
                    </Badge>
                </div>
            )
        },
    },
    {
        accessorKey: "totalAmount",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="کۆی پارەی گشتی" />
        ),
        cell: ({ row }) => {
            return (
                <div className="w-[100px]">
                    <span>{row.original?.totalAmount}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "totalRemaining",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="کۆی پارەی دراو" />
        ),
        cell: ({ row }) => {
            return (
                <div className="w-[100px]">
                    <span>{row.original?.totalRemaining ?? 0}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "purchaseDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="بەروار" />
        ),
        cell: ({ row }) => {
            const date = new Date(row.original?.purchaseDate ?? "").toLocaleDateString("en-GB")
            return (
                <div className="w-[100px]">
                    <span>{date}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "note",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="تێبینی" />
        ),
        cell: ({ row }) => {
            return (
                <div className="max-w-96 text-wrap">
                    <span>{row.original?.note}</span>
                </div>
            )
        },
    },
    {
        id: "actions",
        header: ({ column }) => <DataTableColumnHeader column={column} title="زیاتر" />,
        cell: ({ row }) => <DataTableRowPurchaseActions row={row as Row<OneCompanyPurchase>} />,
    },
]

"use client"

import { ColumnDef, Row } from "@tanstack/react-table"

import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { OneCompany } from "@/server/schema/company"
import Link from "next/link"

export const columns: ColumnDef<OneCompany>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناو" />
    ),
    cell: ({ row }) => {
      return (
        <Link
          href={`/company/${row.original.id}`}
          className="flex w-[100px] items-center text-blue-500 underline"
        >
          <span>{row.original.name}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ژمارەی مۆبایل" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          <span>{row.original.phone}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "address",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناونیشان" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          <span>{row.original.address}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بەروار" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at).toLocaleDateString("en-GB")
      return (
        <div className="flex w-[100px] items-center">
          <span>{date}</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: ({ column }) => <DataTableColumnHeader column={column} title="زیاتر" />,
    cell: ({ row }) => <DataTableRowActions row={row as Row<OneCompany>} />,
  },
]

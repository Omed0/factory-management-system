"use client"

import { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "./data-table-column-header"
import useConvertCurrency from "@/hooks/useConvertCurrency"

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بابەت" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          {row.original.title}
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="بڕی پارە" />
    ),
    cell: ({ row }) => {
      const formatPrice = useConvertCurrency(row.getValue("amount"))
      return (
        <div className="flex w-[100px] items-center">
          <span>{formatPrice}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
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
          <span>{row.getValue("note")}</span>
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
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    header: ({ column }) => <DataTableColumnHeader column={column} title="زیاتر" />,
    cell: ({ row }) => {
      const date = new Date(row.original.created_at).toLocaleDateString("en-GB")
      return (
        <div className="flex w-[100px] items-center">
          <span>{date}</span>
        </div>
      )
    },
  },
]

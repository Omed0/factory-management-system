"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"

import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { OneEmployee } from "@/server/schema/employee"
import Image from "next/image"

export const columns: ColumnDef<OneEmployee>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ناوی کارمەند" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          {row.original.image && (
            <Image
              className="rounded-full size-10 object-contain aspect-square"
              src={`/${row.original.image}`}
              alt={row.original.name}
              height={120}
              width={120}
            />
          )}
          <span className="max-w-[500px] truncate font-medium">
            {row.original.name}
          </span>
        </div>
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
          <span>{row.getValue("phone")}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "monthSalary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="مووچەی مانگانە" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center">
          <span>{row.getValue("monthSalary")}</span>
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
          <span>{row.getValue("address")}</span>
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
    cell: ({ row }) => <DataTableRowActions row={row as Row<OneEmployee>} />,
  },
]

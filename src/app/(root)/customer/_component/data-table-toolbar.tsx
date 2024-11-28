"use client"

import { Archive, ShieldCheck } from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useSetQuery from "@/hooks/useSetQuery"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const pathname = usePathname()
  const { searchParams } = useSetQuery()
  const isTrash = searchParams.get("status") === "trash"

  const isSale = pathname.includes(pathname.split("/")[2])
  const title = isSale ? "وەصڵەکان" : "کڕیارەکان"

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder={`بگەڕێ بۆ ${title}...`}
          value={(table.getColumn(isSale ? "saleNumber" : "name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(isSale ? "saleNumber" : "name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button variant={isTrash ? "default" : "outline"} size="sm" className="h-8 lg:flex" asChild>
          <Link href={`${pathname}?status=trash`} replace>
            <Archive className="size-4" />
          </Link>
        </Button>
        <Button variant={isTrash ? "outline" : "default"} size="sm" className="h-8 lg:flex" asChild>
          <Link href={`${pathname}`} replace>
            <ShieldCheck className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

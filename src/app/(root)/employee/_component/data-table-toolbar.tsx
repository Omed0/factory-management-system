"use client"

import { Archive, ArchiveIcon, CircleX, History, ListRestart, ShieldCheck, SlidersHorizontal, Trash } from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuContent,
  DropdownMenuTrigger, DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import useSetQuery from "@/hooks/useSetQuery"
import RowButtonAction from "./row-button-action"
import Link from "next/link"
import { deleteManyEmployeeActions, forceDeleteManyEmployeeActions, restoreManyEmployeeActions } from "@/actions/employee"
import { toast } from "sonner"
import { OneEmployee } from "@/server/schema/employee"
import React from "react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { searchParams } = useSetQuery()
  const isSelected = table.getIsSomeRowsSelected() || table.getIsAllPageRowsSelected()
  const isTrash = searchParams.get("status") === "trash"

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder="بگەڕێ بۆ كارمەندەکان..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <DropdownMenuMoreAction isSelected={isSelected} isTrash={isTrash} table={table} />
        <Button variant={isTrash ? "default" : "outline"} size="sm" className="h-8 lg:flex" asChild>
          <Link href="/employee?status=trash" replace>
            <Archive className="size-4" />
          </Link>
        </Button>
        <Button variant={isTrash ? "outline" : "default"} size="sm" className="h-8 lg:flex" asChild>
          <Link href="/employee" replace>
            <ShieldCheck className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <RowButtonAction table={table} />
        {/*<DataTableViewOptions table={table} />*/}
      </div>
    </div>
  )
}


function DropdownMenuMoreAction<TData>({ isSelected, isTrash, table }:
  { isSelected: boolean, isTrash: boolean, table: Table<TData> }) {
  const ids = table.getSelectedRowModel().rows.map(row => row.original as OneEmployee).map(employee => employee.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 lg:flex"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px] m-2">
        <DropdownMenuLabel className="text-sm font-medium">
          {!isSelected ? "کارمەند دیاریبکە" : "کرادارەکان"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!isSelected} onClick={() => table.resetRowSelection(true)}>
          <CircleX className="h-4 w-4" />
          لادان
        </DropdownMenuItem>
        {isTrash && (
          <DropdownMenuItem className="text-muted-foreground" disabled={!isSelected}>
            <DynamicForm id_form="archive-all" ids={ids} action={restoreManyEmployeeActions}>
              <History className="h-4 w-4" />
              گەڕاندنەوەی هەمووی
            </DynamicForm>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!isSelected} className="text-red-500">
          {isTrash ? (
            <DynamicForm id_form="archive-all" ids={ids} action={forceDeleteManyEmployeeActions}>
              <Trash className="h-4 w-4" />
              سڕینەوەی هەمووی
            </DynamicForm>
          ) : (
            <DynamicForm id_form="archive-all" ids={ids} action={deleteManyEmployeeActions}>
              <ArchiveIcon className="h-4 w-4" />
              ئەرشیفکردن
            </DynamicForm>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DynamicForm({
  ids,
  id_form,
  action,
  children
}: {
  ids: number[]
  id_form: string,
  action: (ids: number[]) => Promise<{ success: boolean, message: string }>,
  children: React.ReactNode
}) {
  return (
    <form action={async (formData: FormData) => {
      const res = await action(ids)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
    }} id={id_form}>
      <Button type="submit" variant='ghost' className="h-5 text-wrap p-4" form={id_form}>
        {children}
      </Button>
    </form>
  )
}
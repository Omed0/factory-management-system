"use client"

import { Edit, Info, MoreHorizontalIcon } from "lucide-react"
import { Row } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import AddEmployee from "./add-employee"
import { OneEmployee } from "@/server/schema/employee"
import { useEffect, useState } from "react"
import DeleteModal from "@/components/delete-modal"
import useSetQuery from "@/hooks/useSetQuery"
import EmployeeInfoActions from "./employee-info-actions"
import RestorModal from "@/components/restore-modal"
import {
  deleteEmployeeActions, forceDeleteEmployeeActions,
  restoreEmployeeActions
} from "@/actions/employee"
import { Badge } from "@/components/ui/badge"
import CalenderRangMultiSide from "@/components/calender-rang-multi-side"
import MonthSelector from "@/components/months-selector"


export function DataTableRowActions({
  row
}: { row: Row<OneEmployee> }) {
  const { searchParams, setQuery } = useSetQuery()
  const isTrash = searchParams.get("status") === "trash"

  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const rowData = row.original

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px] m-2">
        {isTrash ? (
          <RestorModal
            description="دڵنیای لە هێنانەوەی ئەم کارمەندە"
            restorKey={rowData.id}
            classNameButton="w-full h-9"
            action={restoreEmployeeActions}
            title={`${rowData.name}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (!e) {
                setQuery("", "", ["month", "currency"])
                setDropdownOpen(false)
              }
              setOpen(e)
            }}
            button={<Button className="w-full h-9" variant={isTrash ? "link" : "ghost"}>
              <Edit className="size-5 me-2" />
              گۆڕانکاری
            </Button>}
          >
            <section className="w-full p-4">
              <AddEmployee title="زیادکردن کارمەند" employee={{ ...rowData } as OneEmployee} />
            </section>
          </CustomDialogWithTrigger>
        )}
        <CustomDialogWithTrigger
          onOpenChange={(e) => {
            if (!e) {
              setQuery("", "", ["month", "currency"])
              setDropdownOpen(e)
            }
          }}
          button={
            <Button className="w-full h-9" variant="ghost">
              <Info className="size-5 me-2" />
              زانیاری مووچە
            </Button>
          }
        >
          <section className="w-full p-4">
            <div className="w-fit flex items-center gap-4 justify-evenly">
              <Badge variant="secondary" className="text-lg font-medium rounded">
                {rowData.name}
              </Badge>
              <MonthSelector />
            </div>
            <EmployeeInfoActions empId={rowData.id} name={rowData.name} />
          </section>
        </CustomDialogWithTrigger>
        <DropdownMenuSeparator />
        <DeleteModal
          description={`${isTrash ? "ئەم کارمەندە بە تەواوی دەسڕێتەوە" : 'دڵنیایی لە ئەرشیفکردنی ئەم کارمەندە'}`}
          submit={isTrash ? forceDeleteEmployeeActions : deleteEmployeeActions}
          classNameButton="bg-red-500 text-white w-full h-9"
          title={`${rowData.name}`}
          deleteKey={rowData.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

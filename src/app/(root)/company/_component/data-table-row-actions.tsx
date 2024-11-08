"use client"

import { Edit, MoreHorizontalIcon } from "lucide-react"
import { Row } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { useState } from "react"
import DeleteModal from "@/components/delete-modal"
import useSetQuery from "@/hooks/useSetQuery"
import RestorModal from "@/components/restore-modal"
import { OneCompany } from "@/server/schema/company"
import AddCompany from "./add-company-form"
import { deleteCompanyActions, forceDeleteCompanyActions, restoreCompanyActions } from "@/actions/company"


export function DataTableRowActions({
  row
}: { row: Row<OneCompany> }) {
  const { searchParams } = useSetQuery()
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
            description="دڵنیای لە هێنانەوەی ئەم کۆمپانیایە"
            restorKey={rowData.id}
            classNameButton="w-full h-9"
            action={restoreCompanyActions}
            title={`${rowData.name}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (!e) setDropdownOpen(false)
              setOpen(e)
            }}
            button={<Button className="w-full h-9" variant={isTrash ? "link" : "ghost"}>
              <Edit className="size-5 me-2" />
              گۆڕانکاری
            </Button>}
          >
            <section className="w-full p-4">
              <AddCompany
                title="زیادکردنی کۆمپانیا"
                company={{ ...rowData } as OneCompany}
                handleClose={() => {
                  setOpen(false)
                  setDropdownOpen(false)
                }}
              />
            </section>
          </CustomDialogWithTrigger>
        )}
        <DropdownMenuSeparator />
        <DeleteModal
          description={`${isTrash ? "ئەم کۆمپانیایە بە تەواوی دەسڕێتەوە" : 'دڵنیایی لە ئەرشیفکردنی ئەم کۆمپانیایە'}`}
          submit={isTrash ? forceDeleteCompanyActions : deleteCompanyActions}
          classNameButton="bg-red-500 text-white w-full h-9"
          title={`${rowData.name}`}
          onClose={() => {
            setDropdownOpen(false)
          }}
          deleteKey={rowData.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


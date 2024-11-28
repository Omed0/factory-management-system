"use client"

import { Table } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import CalenderRangMultiSide from "@/components/calender-rang-multi-side"
import useSetQuery from "@/hooks/useSetQuery"
import { LineChartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { searchParams } = useSetQuery()
  const report = searchParams.get("report") || "خەرجی"

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="secondary" className="h-8">
              <LineChartIcon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>ڕاپۆرت</p>
          </TooltipContent>
        </Tooltip>
        <Input
          placeholder={`بگەڕێ بۆ ${report}...`}
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      <CalenderRangMultiSide className="h-8" />
    </div>
  )
}

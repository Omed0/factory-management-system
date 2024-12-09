'use client';

import { Table } from '@tanstack/react-table';
import { LineChartIcon } from 'lucide-react';

import CalenderRangMultiSide from '@/components/calender-rang-multi-side';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useSetQuery from '@/hooks/useSetQuery';
import { tr_report_name } from '../_constant';
import { useParams } from 'next/navigation';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const params = useParams()
  const report = params.id

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
          placeholder={`بگەڕێ بۆ ${tr_report_name.find((e) => e.name === report)?.value}...`}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      <CalenderRangMultiSide className="h-8" />
    </div>
  );
}

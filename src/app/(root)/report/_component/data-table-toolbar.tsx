'use client';

import { Table } from '@tanstack/react-table';

import CalenderRangMultiSide from '@/components/calender-rang-multi-side';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import { CalendarX2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSetQuery from '@/hooks/useSetQuery';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPartnersLoanSchema } from '@/server/schema/information';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

const text_input_base_path = [
  { name: "each-action", value: "ناو", field: "partner" },
  { name: "sale", value: "ناوی کڕیار", field: "name" },
  { name: "purchase", value: "ناوی کۆمپانیا", field: "name" },
  { name: "expense", value: "ناوی خەرجی", field: "name" },
  { name: "loan", value: "ناو", field: "name" },
]

const text_base_path = [
  { name: "person", value: "ڕاپۆرتی کەسی" },
  { name: "each-action", value: "کەشف حساب قاسە" },
  { name: "sale", value: "ڕاپۆرتی فرۆشتن" },
  { name: "purchase", value: "ڕاپۆرتی کڕین" },
  { name: "expense", value: "ڕاپۆرتی خەرجی" },
  { name: "loan", value: "قەرزەکان" },
]

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { setQuery, searchParams } = useSetQuery(0)
  const pathname = usePathname()
  const input = text_input_base_path.find(item => pathname.includes(item.name))
  const text = text_base_path.find(item => pathname.includes(item.name))

  const isLoan = pathname.includes("loan")
  const defaultTypeLoan = searchParams.get("loanPartner") || "customer"

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-3">
        <Badge variant="secondary" className='rounded p-2'>
          {text?.value}
        </Badge>
        <Input
          placeholder={`بگەڕی بۆ ${input?.value}`}
          value={(table.getColumn(input?.field || "name")?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn(input?.field || "name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      {isLoan ? (
        <Select
          defaultValue={defaultTypeLoan}
          onValueChange={(value) => setQuery("loanPartner", value)}
        >
          <SelectTrigger className="min-w-28 h-8 max-w-fit">
            <SelectValue placeholder={defaultTypeLoan || "قەرزەکان"} />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="customer">کڕیار</SelectItem>
            <SelectItem value="company">کۆمپانیا</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <>
          <CalenderRangMultiSide className="h-8" noDefault />
          <Button
            onClick={() => setQuery("date", "")}
            variant="secondary" size="sm" className='h-8 ms-4'>
            <CalendarX2 className='size-5' />
          </Button>
        </>
      )}
    </div>
  );
}

'use client'

import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import useSetQuery from '@/hooks/useSetQuery'
import { TradePartner } from '@/server/schema/information'

type Props = {
  type: "company" | "customer",
  name: string
  partners: TradePartner[]
}


export default function SupplierSelector({ type, name, partners }: Props) {

  const { setQuery } = useSetQuery(50)
  const isCompany = type === "company" ? "کۆمپانیا" : "کڕیار"

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(name ?? "")

  useEffect(() => {
    if (value) {
      setQuery("name", value)
    }
    return () => setQuery("name", "")
  }, [value])


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-72 justify-between"
        >
          {value
            ? partners.find((partner) => partner.id === +value)?.name
            : `بگەڕێ بۆ ${isCompany}`}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`بگەڕێ بۆ ${isCompany}`} className="h-9 ms-2" />
          <CommandList>
            <CommandEmpty>هیچ کەسێک نەدۆزرایەوە</CommandEmpty>
            <CommandGroup>
              {partners.map((partner) => (
                <CommandItem
                  key={partner.id}
                  value={partner.id.toString()}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  {partner.name}
                  <Check
                    className={cn(
                      "ms-auto",
                      value === partner.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


'use client'

import { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Building, Check, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import useSetQuery from '@/hooks/useSetQuery'
import { TradePartner, TradePartnerTypes } from '@/server/schema/information'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import CalenderRangMultiSide from '@/components/calender-rang-multi-side'

type Props = {
  type_partner: TradePartnerTypes['type'],
  name: string
  partners: TradePartner[]
}


export default function SupplierSelector({ type_partner, partners, name }: Props) {

  const { setQuery } = useSetQuery(50)
  const isCompany = type_partner === "company" ? "کۆمپانیا" : "کڕیار"

  const [open, setOpen] = useState(false)
  const value = useMemo(() => {
    return partners.find((partner) => partner.id === +name) || partners[0]
  }, [name, partners, type_partner])


  return (
    <div className='flex items-center gap-4'>
      <CalenderRangMultiSide noDefault isShowResetButton btnClassName='h-10' className='' />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger defaultValue={value.id} asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-72 justify-between"
          >
            {value ? value.name
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
                      setQuery("name", currentValue)
                      setOpen(false)
                    }}
                  >
                    {partner.name}
                    <Check
                      className={cn(
                        "ms-auto",
                        value.id === partner.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className='flex items-center gap-2'>
        {typePartner.map((type) => (
          <Tooltip key={type.name}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setQuery("type", type.value, ["name"])}
                variant={type.value == type_partner ? "default" : "outline"}
              >
                <type.icon className='size-6 text-inherit' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{type.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}


const typePartner = [
  { name: "کڕیار", value: "customer", icon: User },
  { name: "کۆمپانیا", value: "company", icon: Building },
]
import useSetQuery from "@/hooks/useSetQuery"
import { addDays, format, formatDate } from "date-fns"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "./ui/calendar"

type Props = {
  className?: string
  setState?: Dispatch<SetStateAction<DateRange | undefined>>
}

export default function CalenderRangMultiSide({ className, setState }: Props) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const { setQuery } = useSetQuery(100)
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(currentYear, currentMonth, 1),
    to: addDays(new Date(currentYear, currentMonth, 1), 30),
  })

  useEffect(() => {
    if (!setState && date?.from && date.to) {
      setQuery("date", `${toIsoString(date.from)}&${toIsoString(date.to)}`)
    } else {
      setState?.(date)
    }

    return () => {
      setQuery("date", "")
    }
  }, [date?.from, date?.to])


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !date && "text-muted-foreground", className
          )}
        >
          <CalendarIcon />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>بەروار دیاری بکە</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          dir="ltr"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}


function toIsoString(date: Date) {
  const Time = format(date.getTime(), "LLL dd, y")
  return Time;
}
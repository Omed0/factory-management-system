"use client";

import { Dispatch, SetStateAction, useState } from 'react';
import { DateRange, SelectRangeEventHandler } from 'react-day-picker';
import { format } from 'date-fns';
import { CalendarIcon, CalendarX2 } from 'lucide-react';

import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

import useSetQuery from '@/hooks/useSetQuery';
import { cn, seperateDates } from '@/lib/utils';

type Props = {
  className?: string;
  btnClassName?: string;
  setState?: Dispatch<SetStateAction<DateRange | undefined>>;
  noDefault?: boolean;
  isShowResetButton?: boolean;
};

export default function CalenderRangMultiSide({ className, setState, noDefault = false, isShowResetButton = false, btnClassName }: Props) {
  const { setQuery, searchParams } = useSetQuery(30);
  const dates = seperateDates(searchParams.get("date"));

  // Initialize date state based on noDefault
  const [date, setDate] = useState<DateRange | undefined>(
    noDefault
      ? undefined // If noDefault is true, do not set default dates
      : {
        from: dates.from ? new Date(dates.from) : undefined,
        to: dates.to ? new Date(dates.to) : undefined,
      }
  );

  const handleChange: SelectRangeEventHandler = (range, selectedDay, activeModifiers, e) => {
    setDate(range);
    setState && setState(range);
    if (range && range.from && range.to) {
      setQuery('date', `${range.from.toLocaleDateString()}&${range.to.toLocaleDateString()}`);
    }
  };

  // Handle reset functionality
  const handleReset = () => {
    setDate(undefined);
    setQuery("date", ""); // Clear the query parameter
  };

  return (
    <div dir='rtl' className="flex items-center gap-2">
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
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
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
            onSelect={handleChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {isShowResetButton && (
        <Button
          onClick={handleReset}
          variant="default"
          size="sm"
          className={cn("h-8 ms-2", btnClassName)}
        >
          <CalendarX2 className='size-5' />
        </Button>
      )
      }
    </div>
  );
}

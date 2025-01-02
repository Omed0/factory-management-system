"use client"

import { Dispatch, SetStateAction, useState } from 'react';
import { DateRange, SelectRangeEventHandler } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

import useSetQuery from '@/hooks/useSetQuery';
import { cn, seperateDates, toIsoString } from '@/lib/utils';


type Props = {
  className?: string;
  setState?: Dispatch<SetStateAction<DateRange | undefined>>;
};

export default function CalenderRangMultiSide({ className, setState }: Props) {
  const { setQuery, searchParams } = useSetQuery(30);
  const dates = seperateDates(searchParams.get("date"))
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(dates.from),
    to: new Date(dates.to)
  });


  const handleChange: SelectRangeEventHandler = (range, selectedDay, activeModifiers, e) => {
    setDate(range);
    if (range && range.from && range.to) {
      setQuery('date', `${range.from.toLocaleDateString()}&${range.to.toLocaleDateString()}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn(
            'w-[300px] justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'LLL dd, y')} -{' '}
                {format(date.to, 'LLL dd, y')}
              </>
            ) : (
              format(date.from, 'LLL dd, y')
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
  );
}

import { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { format, getMonth } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function CalendarFormItem<T extends FieldValues>({
  form,
  isEdit = false,
  name,
  className,
}: {
  form: UseFormReturn<T>;
  isEdit?: boolean;
  name: Path<T>;
  className?: string;
}) {
  const [month, setMonth] = useState<Date>(form.getValues(name) || new Date());

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex-1 basis-56', className)}>
          <FormLabel>بەروار</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full text-start font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  {field.value ? (
                    format(field.value, 'yyyy-MM-dd')
                  ) : (
                    <span>بەرواری پارەدان</span>
                  )}
                  <CalendarIcon className="ml-auto size-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                dir='ltr'
                initialFocus
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={isEdit}
                onMonthChange={(date) => setMonth(date)}
                month={month}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

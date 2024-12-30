import { FieldPath, FieldValues, PathValue, UseFormReturn } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useSetQuery from '@/hooks/useSetQuery';
import { useCallback, useState } from 'react';
import { IQDtoUSD, USDtoIQD } from '@/lib/utils';
import { toast } from 'sonner';

interface CurrencyInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  className?: string;
  dollar: number
}

export function CurrencyInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  form,
  name,
  label,
  description,
  className,
  dollar
}: CurrencyInputProps<TFieldValues, TName>) {
  const { setQuery, searchParams } = useSetQuery(1);
  const [isLoading, setIsLoading] = useState(false)
  const currency = searchParams.get('currency') || 'USD';
  const value = form.watch(name)

  const handleChangeCurrency = useCallback((cur: "IQD" | "USD") => {
    try {
      setIsLoading(true)
      setQuery("currency", cur)
      const convertedAmount = cur === "IQD" ? USDtoIQD(value, dollar) : IQDtoUSD(value, dollar);
      if (convertedAmount) {
        form.setValue(name, convertedAmount as PathValue<TFieldValues, TName>);
      }
    } catch (error: unknown) {
      toast.error("هەڵەیەک روویدا")
    } finally {
      setIsLoading(false)
    }
  }, [currency, value, dollar])

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex">
              <Select
                disabled={isLoading}
                defaultValue={"USD"}
                onValueChange={handleChangeCurrency}
              >
                <FormControl>
                  <SelectTrigger
                    disabled={isLoading}
                    className="w-fit gap-3 rounded-s-none border-s-0 focus:ring-0 focus:ring-offset-0"
                  >
                    <SelectValue placeholder={currency} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="USD">دۆلار</SelectItem>
                  <SelectItem value="IQD">دینار</SelectItem>
                </SelectContent>
              </Select>
              <Input
                {...field}
                type="number"
                className="rounded-s-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage className="rtl:text-right" />
        </FormItem>
      )}
    />
  );
}

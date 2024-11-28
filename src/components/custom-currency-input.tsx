import { Control, FieldPath, FieldValues } from "react-hook-form"
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import useSetQuery from "@/hooks/useSetQuery"

interface CurrencyInputProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
    control: Control<TFieldValues>
    name: TName
    label: string
    description?: string
    className?: string
}

export function CurrencyInput<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ control, name, label, description, className }: CurrencyInputProps<TFieldValues, TName>) {

    const { setQuery, searchParams } = useSetQuery(50)
    const currency = searchParams.get("currency") || "USD"

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div className="flex">
                            <Select
                                value={currency}
                                onValueChange={(currency) => setQuery("currency", currency)}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-fit border-s-0 rounded-s-none gap-3 focus:ring-0 focus:ring-offset-0">
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
                                onChange={(e) => field.onChange(e)}
                                value={field.value || ""}
                            />
                        </div>
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage className="rtl:text-right" />
                </FormItem>
            )}
        />
    )
}


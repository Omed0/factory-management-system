import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { CreateEmployeeAction, OneEmployee, createEmployeeActionSchema } from "@/server/schema/employee"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown, LucideIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useMemo, useState } from "react"
import { Table } from "@tanstack/react-table"
import useSetQuery from "@/hooks/useSetQuery"
import { toast } from "sonner"
import { IQDtoUSD, cn, getMonthStartAndEndOfMonth } from "@/lib/utils"
import { createEmployeeActionActions } from "@/actions/employee"
import { CurrencyInput } from "@/components/custom-currency-input"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDollar } from "@/hooks/useDollar"
import useActionEmployee from "../useActionEmployee"

type Props<TData> = {
    table: Table<TData>
    item: {
        name: string
        title: string
        type: CreateEmployeeAction["type"]
        icon: LucideIcon
    }
}

export default function RowButtonAction<TData>({ table, item }: Props<TData>) {
    const [open, setOpen] = useState(false)
    const { searchParams, setQuery } = useSetQuery()
    const { data } = useDollar()

    const isTrash = searchParams.get("status") === "trash"
    const currency = searchParams.get("currency") || "USD"

    const getSelectedEmployee = useMemo(() =>
        table.getSelectedRowModel().rows.map((row) => row.original as OneEmployee), [table])

    const employees = useMemo(() =>
        table.getRowModel().rows.map((row) => row.original as OneEmployee), [table])

    const form = useForm<CreateEmployeeAction>({
        resolver: zodResolver(createEmployeeActionSchema),
        defaultValues: {
            employeeId: 0,
            note: "",
            amount: 0,
            type: item.type,
            dateAction: new Date(),
        },
    });

    const exit = () => {
        form.reset()
        setOpen(false)
    }

    const { refetch } = useActionEmployee(form.watch("employeeId"), getMonthStartAndEndOfMonth(new Date()))

    async function onSubmit(values: CreateEmployeeAction) {
        if (currency === "IQD") {
            values.amount = IQDtoUSD(values.amount, data.dollar)
        }
        const { success, message } = await createEmployeeActionActions(values)
        if (!success) {
            toast.error(message)
            return
        }
        toast.success(message)
        refetch()
        form.reset()
        exit()
    }

    useEffect(() => {
        if (!isTrash && open) {
            if (getSelectedEmployee.length > 0) {
                form.setValue("employeeId", getSelectedEmployee[0].id)
            }
            if (employees.length > 0 && getSelectedEmployee.length === 0) {
                form.setValue("employeeId", employees[0].id)
            }
            form.setValue("type", item.type)
        }

        return () => form.reset()
    }, [open, isTrash, employees, getSelectedEmployee])

    return (
        <section className="flex items-center gap-2">
            <CustomDialogWithTrigger
                key={item.type}
                open={open}
                className="!max-w-fit px-6 lg:px-16"
                onOpenChange={(e) => {
                    if (isTrash) return toast.error("تەنها بۆ کارمەندە ئەکتیڤەکانە")
                    if (!e) setQuery("", "", ["currency"])
                    setOpen(e)
                }}
                button={
                    <Button disabled={isTrash} className="w-full h-8 border" variant="ghost">
                        <item.icon className="size-5 me-2" />
                        {item.name}
                    </Button>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-fit mx-auto p-6 flex flex-col items-center gap-5">
                        <h2 className="text-md font-medium">{item.title}</h2>
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem className="w-96">
                                    <FormLabel>کارمەند</FormLabel>
                                    <FormControl>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between"
                                                >
                                                    {field.value
                                                        ? employees.find((employee) =>
                                                            employee.id === field.value)?.name
                                                        : "کارمەندێک هەڵبژێرە..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[280px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="ناوی کارمەند..." />
                                                    <CommandList>
                                                        <CommandEmpty>کارمەند نەدۆزرایەوە</CommandEmpty>
                                                        <CommandGroup>
                                                            {employees.map((employee) => (
                                                                <CommandItem
                                                                    key={employee.id}
                                                                    value={employee.id.toString()}
                                                                    onSelect={(currentValue) => {
                                                                        field.onChange(+currentValue)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === employee.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {employee.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="w-96" onLoad={() => form.setValue(field.name, item.type)}>
                                    <FormLabel>جۆری کردار</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <CurrencyInput
                            className="w-96"
                            control={form.control}
                            name="amount"
                            label="بڕی پارە"
                        />
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem className="w-96">
                                    <FormLabel>تێبینی</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="تێبینی" rows={6} className="w-96 resize-none" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="w-full flex flex-wrap gap-5">
                            <Button type="submit" className="flex-1">
                                {item.name}
                            </Button>
                            <Button
                                type="reset"
                                variant="outline"
                                className="flex-1"
                                onClick={exit}
                            >
                                داخستن
                            </Button>
                        </div>
                    </form>
                </Form>
            </CustomDialogWithTrigger>
        </section>
    )
}




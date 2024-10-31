import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { CreateEmployeeAction, OneEmployee, createEmployeeActionSchema } from "@/server/schema/employee"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarClock, ClockArrowUp, HandCoins, History, Check, ChevronsUpDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { Row, Table } from "@tanstack/react-table"
import useSetQuery from "@/hooks/useSetQuery"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
import { createEmployeeActionActions } from "@/actions/employee"


type Props<TData> = {
    table: Table<TData>
}

export default function RowButtonAction<TData>({ table }: Props<TData>) {
    const { searchParams } = useSetQuery()
    const isTrash = searchParams.get("status") === "trash"
    const getSelectedEmployee = table.getSelectedRowModel().rows.map((row) => row.original as OneEmployee)
    const employees = table.getRowModel().rows.map((row) => row.original as OneEmployee)

    const form = useForm<CreateEmployeeAction>({
        resolver: zodResolver(createEmployeeActionSchema),
        defaultValues: {
            employee_id: 0,
            note: "",
            amount: 0,
            type: "ABSENT" as const,
            dateAction: new Date(),
        },
    });

    async function onSubmit(values: CreateEmployeeAction) {
        const { success, message } = await createEmployeeActionActions(values.employee_id, values)

        if (!success) return toast.error(message)
        toast.success(message)
    }

    return (
        <section className="flex items-center gap-2">
            {buttonAction.map((item) => {
                const [open, setOpen] = useState(false)
                const exit = () => {
                    form.reset()
                    setOpen(false)
                }

                useEffect(() => {
                    if (!isTrash && open) {
                        if (getSelectedEmployee.length > 0) {
                            form.setValue("employee_id", getSelectedEmployee[0].id)
                        }
                        if (employees.length > 0 && getSelectedEmployee.length === 0) {
                            form.setValue("employee_id", employees[0].id)
                        }
                        form.setValue("type", item.type)
                    }
                }, [open, isTrash, getSelectedEmployee, employees])

                return (
                    <CustomDialogWithTrigger
                        key={item.type}
                        open={open}
                        className="!max-w-fit px-6 lg:px-16"
                        onOpenChange={(e) => {
                            if (isTrash) return toast.error("تەنها بۆ کارمەندە ئەکتیڤەکانە")
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
                                    name="employee_id"
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
                                        <FormItem className="w-96">
                                            <FormLabel>جۆری کردار</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem className="w-96">
                                            <FormLabel>بڕی پارە</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
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
                )
            })}
        </section>
    )
}



const buttonAction = [
    {
        name: "سزادان",
        icon: History,
        title: "سزادانی کارمەند",
        type: "PUNISHMENT" as const,
        action: (employee: CreateEmployeeAction) => { }
    },
    {
        name: "پاداشت",
        icon: HandCoins,
        title: "پاداشتی کارمەند",
        type: "BONUS" as const,
        action: (employee: CreateEmployeeAction) => { }
    },
    {
        name: "مۆڵەت",
        icon: CalendarClock,
        title: "مۆڵەتی کارمەند",
        type: "ABSENT" as const,
        action: (employee: CreateEmployeeAction) => { }
    },
    {
        name: "کارکردنی زیادە",
        icon: ClockArrowUp,
        title: "کارکردنی زیادەی کارمەند",
        type: "OVERTIME" as const,
        action: (employee: CreateEmployeeAction) => { }
    }
]

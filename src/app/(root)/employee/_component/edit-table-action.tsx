import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil } from "lucide-react"
import { useForm } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { toast } from "sonner"
import { updateEmployeeActionActions } from "@/actions/employee"
import { useQuery } from "@tanstack/react-query"
import {
    Form, FormControl, FormField,
    FormItem, FormLabel
} from "@/components/ui/form"
import {
    UpdateEmployeeAction,
    updateEmployeeActionSchema
} from "@/server/schema/employee"
import { CurrencyInput } from "@/components/custom-currency-input"
import useSetQuery from "@/hooks/useSetQuery"
import { IQDtoUSD } from "@/lib/utils"
import { useDollar } from "@/hooks/useDollar"

type Props = {
    id: number
    infoAction: UpdateEmployeeAction
}

export default function EditTableAction({ id, infoAction }: Props) {
    const [open, setOpen] = useState(false)
    const { searchParams } = useSetQuery()
    const { data } = useDollar()

    const currency = searchParams.get("currency") || "USD"

    const form = useForm<UpdateEmployeeAction>({
        resolver: zodResolver(updateEmployeeActionSchema),
        defaultValues: { ...infoAction },
    });

    const exit = () => {
        form.reset()
        setOpen(false)
    }

    const empId = form.watch("employeeId") || 0

    const { refetch } = useQuery({
        queryKey: ["employeeActions", String(empId)],
        enabled: empId > 0
    })

    async function onSubmit(values: UpdateEmployeeAction) {
        if (values.amount && currency === "IQD") {
            values.amount = IQDtoUSD(values.amount, data.dollar)
        }

        const { success, message } = await updateEmployeeActionActions(id, values)
        if (!success) {
            toast.error(message)
            return
        }
        toast.success(message)
        refetch()
        exit()
    }


    return (
        <section className="flex items-center gap-2">
            <CustomDialogWithTrigger
                open={open}
                key={infoAction.type}
                className="!max-w-fit px-6 lg:px-16"
                onOpenChange={setOpen}
                button={
                    <Button className="border text-end" size="icon" variant="ghost">
                        <Pencil className="size-5" />
                    </Button>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-fit mx-auto p-6 flex flex-col items-center gap-5">
                        <h2 className="text-md font-medium">{infoAction.type}</h2>
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem className="w-96">
                                    <FormLabel>کارمەند</FormLabel>
                                    <FormControl>
                                        <Input {...field} hidden disabled />
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
                                نوێکردنەوە
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




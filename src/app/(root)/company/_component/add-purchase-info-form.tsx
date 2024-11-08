"use client"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { CreateCompanyPurchaseInfo, createCompanyPurchaseInfoSchema } from "@/server/schema/company";
import { toast } from "sonner";
import { createCompanyPurchaseInfoActions } from "@/actions/company";
import CalendarFormItem from "@/components/calender-form-item";
import { Textarea } from "@/components/ui/textarea";

type Props = {
    title: string;
    handleClose?: () => void;
    amountPeriod: number;
}

export default function AddCompanyPurchaseInfo({ title, handleClose, amountPeriod }: Props) {

    const form = useForm<CreateCompanyPurchaseInfo>({
        mode: "onSubmit",
        resolver: zodResolver(createCompanyPurchaseInfoSchema),
        defaultValues: {
            companyPurchaseId: 0,
            amount: 0,
            date: new Date(),
            note: "",
        },
    });


    async function onSubmit(values: CreateCompanyPurchaseInfo) {
        const purchaseInfoValues = await createCompanyPurchaseInfoActions(values)
        if (values.amount > amountPeriod) {
            toast.error("نابێت بڕی پێدانەوە لە قەرزی ماوە زیاتر بێت")
            return
        }
        if (!purchaseInfoValues.success) {
            toast.error(purchaseInfoValues.message)
        } else {
            toast.success(purchaseInfoValues.message)
            form.reset()
            handleClose?.()
        }
    }

    return (
        <Form {...form}>
            <h2 className="text-md font-medium text-center">
                {title}
            </h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-wrap gap-5 items-center">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56 mt-4">
                            <FormLabel>بڕی پێدانەوە</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                                بڕی قەرزی ماوە {isNaN(amountPeriod) ? 0 : amountPeriod}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <CalendarFormItem form={form} name="date" />
                <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>تێبینی</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    cols={6}
                                    value={field.value ?? ""}
                                    className="resize-none"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="w-full flex flex-wrap gap-5 mt-5">
                    <DialogClose className="flex-1 basis-60" onClick={handleClose}>
                        <Button
                            type="reset"
                            variant="outline"
                            className="min-w-full"
                        >
                            داخستن
                        </Button>
                    </DialogClose>
                    <Button type="submit" className="flex-1 basis-60">
                        زیادکردن
                    </Button>
                </div>
            </form>
        </Form>
    )
}
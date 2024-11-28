"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { OneExpense } from "@/server/schema/expense";
import { createExpenseSchema, updateExpenseSchema, UpdateExpense } from "@/server/schema/expense";
import { CreateExpense } from "@/server/schema/expense";
import { createExpenseActions, updateExpenseActions } from "@/actions/expense";
import { Textarea } from "@/components/ui/textarea";

type Props = {
    expense?: Partial<OneExpense>;
    title: string;
    handleClose?: () => void;
}

export default function AddExpense({ expense, title, handleClose }: Props) {
    const isEdit = !!expense;

    const form = useForm<CreateExpense>({
        mode: "onSubmit",
        resolver: zodResolver(isEdit ? updateExpenseSchema : createExpenseSchema),
        defaultValues: { ...expense as UpdateExpense },
    });


    async function onSubmit(values: CreateExpense) {
        let serializedValues = JSON.parse(JSON.stringify(values))
        let expenseValues

        if (isEdit && expense?.id) {
            expenseValues = await updateExpenseActions(Number(expense.id), serializedValues)
        } else {
            expenseValues = await createExpenseActions(serializedValues)
        }

        if (!expenseValues.success) {
            toast.error(expenseValues.message)
        } else {
            toast.success(expenseValues.message)
            form.reset()
            handleClose?.()
        }
    }

    return (
        <Form {...form}>
            <h2 className="text-md font-medium text-center pt-1">{title}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-wrap gap-5 items-center">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>ناوی خەرجی</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>بری پارەکە</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>تێبینی</FormLabel>
                            <FormControl>
                                <Textarea cols={6} className="resize-none h-20" {...field} />
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
                        {isEdit ? "نوێکردنەوە" : "زیادکردن"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { OneCompanyPurchase } from "@/server/schema/company";
import { toast } from "sonner";
import {
    CreateCompanyPurchase, createCompanyPurchaseSchema,
    updateCompanyPurchaseSchema
} from "@/server/schema/company";
import { createCompanyPurchaseActions, updateCompanyPurchaseActions } from "@/actions/company";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useParams } from "next/navigation";


type Props = {
    purchase?: Partial<OneCompanyPurchase>;
    title: string;
    handleClose?: () => void;
}

export default function AddPurchase({ purchase, title, handleClose }: Props) {
    const isEdit = !!purchase;
    const params = useParams()
    const companyId = purchase?.companyId ?? Number(params.id)

    const form = useForm<CreateCompanyPurchase>({
        mode: "onSubmit",
        resolver: zodResolver(isEdit ? updateCompanyPurchaseSchema : createCompanyPurchaseSchema),
        defaultValues: defaultValues({ ...purchase as CreateCompanyPurchase, companyId }),
    });

    const type = form.watch("type");

    async function onSubmit(values: CreateCompanyPurchase) {
        let companyValues
        if (isEdit && purchase?.id) {
            companyValues = await updateCompanyPurchaseActions({ ...values, id: Number(purchase.id) })
        } else {
            companyValues = await createCompanyPurchaseActions(values)
        }

        if (!companyValues.success) {
            toast.error(companyValues.message)
        } else {
            toast.success(companyValues.message)
            form.reset()
            handleClose?.()
        }
    }

    return (
        <Form {...form}>
            <h2 className="text-lg font-medium text-center pt-1">{title}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-wrap gap-5 items-center">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>ناوی مەواد</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>جۆری پارەدان</FormLabel>
                            <FormControl>
                                <Select
                                    {...field}
                                    disabled={isEdit}
                                    onValueChange={(value) => field.onChange(value as any)}
                                >
                                    <SelectTrigger className="w-full justify-evenly">
                                        <SelectValue placeholder="جۆری پارە" />
                                    </SelectTrigger>
                                    <SelectContent className="w-full">
                                        <SelectItem value="CASH">پارەدانی نەقد</SelectItem>
                                        <SelectItem value="LOAN">پارەدانی قەرز</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>کۆی پارەکە</FormLabel>
                            <FormControl>
                                <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {type === "LOAN" && (
                    <FormField
                        control={form.control}
                        name="totalRemaining"
                        render={({ field }) => (
                            <FormItem className="flex-1 basis-56">
                                <FormLabel>بڕی پێشەکی</FormLabel>
                                <FormControl>
                                    <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <CalendarFormItem form={form} isEdit={isEdit} />
                <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>تێبینی</FormLabel>
                            <FormControl>
                                <Textarea {...field} value={field.value ?? ''} />
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


function defaultValues(values: CreateCompanyPurchase) {
    values.type = values.type ?? "CASH"
    if (values.purchaseDate) {
        values.purchaseDate = new Date(values.purchaseDate)
    } else {
        values.purchaseDate = new Date()
    }
    return values
}

function CalendarFormItem({ form, isEdit }: {
    form: UseFormReturn<CreateCompanyPurchase>,
    isEdit: boolean
}) {
    return (
        <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
                <FormItem className="flex-1 basis-56">
                    <FormLabel>بەروار</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full text-start font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                        format(field.value, "yyyy-MM-dd")
                                    ) : (
                                        <span>بەرواری پارەدان</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={isEdit}
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

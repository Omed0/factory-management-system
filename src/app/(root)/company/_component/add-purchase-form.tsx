"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { OneCompanyPurchase, UpdateCompanyPurchase } from "@/server/schema/company";
import { toast } from "sonner";
import {
    CreateCompanyPurchase, createCompanyPurchaseSchema,
    updateCompanyPurchaseSchema
} from "@/server/schema/company";
import { createCompanyPurchaseActions, updateCompanyPurchaseActions } from "@/actions/company";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "next/navigation";
import CalendarFormItem from "@/components/calender-form-item";
import { usePurchaseInfo } from "../purchase-info-state";


type Props = {
    purchase?: Partial<OneCompanyPurchase>;
    title: string;
    handleClose?: () => void;
}

type FormType<T extends boolean> = T extends true ? UpdateCompanyPurchase : CreateCompanyPurchase;

export default function AddPurchase({ purchase, title, handleClose }: Props) {
    const isEdit = !!purchase;
    const params = useParams()
    const companyId = Number(params.id)

    const form = useForm<FormType<typeof isEdit>>({
        mode: "onSubmit",
        resolver: zodResolver(isEdit ? updateCompanyPurchaseSchema : createCompanyPurchaseSchema),
        defaultValues: defaultValues(purchase, companyId) as FormType<typeof isEdit>,
    });

    const type = form.watch("type");
    const { refetch } = usePurchaseInfo(purchase?.id ?? 0)
    async function onSubmit(values: FormType<typeof isEdit>) {
        let companyValues
        if (isEdit && purchase?.id) {
            companyValues = await updateCompanyPurchaseActions(values as UpdateCompanyPurchase)
        } else {
            companyValues = await createCompanyPurchaseActions(values)
        }

        if (!companyValues.success) {
            toast.error(companyValues.message)
        } else {
            toast.success(companyValues.message)
            form.reset()
            refetch()
            handleClose?.()
        }
    }

    return (
        <Form {...form}>
            <h2 className="text-lg font-medium text-center pt-1">{title}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-wrap gap-5 items-center">
                {/*{isEdit && (
                    <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                            <FormItem className="flex-1 basis-56 hidden" hidden>
                                <FormControl>
                                    <Input {...field} hidden />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                )}*/}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>ناو</FormLabel>
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
                                <Input {...field} type="number" onChange={(e) => field.onChange(e.target.valueAsNumber)} />
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
                                    <Input {...field} type="number" onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <CalendarFormItem form={form} name="purchaseDate" />
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
                    <Button type="submit" className="flex-1 basis-60">
                        {isEdit ? "نوێکردنەوە" : "زیادکردن"}
                    </Button>
                    <DialogClose className="flex-1 basis-60" onClick={handleClose}>
                        <Button
                            type="reset"
                            variant="outline"
                            className="min-w-full"
                        >
                            داخستن
                        </Button>
                    </DialogClose>
                </div>
            </form>
        </Form>
    )
}


function defaultValues(values: Partial<OneCompanyPurchase>, companyId: number) {
    if (values) {
        values.type = values.type ?? "CASH"
        if (values.purchaseDate) {
            values.purchaseDate = new Date(values.purchaseDate)
        } else {
            values.purchaseDate = new Date()
        }
        return values
    }
    return { companyId, purchaseDate: new Date(), type: "CASH" }
}

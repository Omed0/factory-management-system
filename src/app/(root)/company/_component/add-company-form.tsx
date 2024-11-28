"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { OneCompany, updateCompanySchema, } from "@/server/schema/company";
import { toast } from "sonner";
import { CreateCompany, UpdateCompany, createCompanySchema } from "@/server/schema/company";
import { createCompanyActions, updateCompanyActions } from "@/actions/company";

type Props = {
    company?: Partial<OneCompany>;
    title: string;
    handleClose?: () => void;
}

export default function AddCompany({ company, title, handleClose }: Props) {
    const isEdit = !!company;

    const form = useForm<CreateCompany>({
        mode: "onSubmit",
        resolver: zodResolver(isEdit ? updateCompanySchema : createCompanySchema),
        defaultValues: { ...company as UpdateCompany },
    });


    async function onSubmit(values: CreateCompany) {
        let serializedValues = JSON.parse(JSON.stringify(values))
        let companyValues

        if (isEdit && company?.id) {
            companyValues = await updateCompanyActions(serializedValues)
        } else {
            companyValues = await createCompanyActions(serializedValues)
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
            <h2 className="text-md font-medium text-center pt-1">{title}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-wrap gap-5 items-center">
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
                    name="phone"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>ژ. مۆبایل</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>ناونیشان</FormLabel>
                            <FormControl>
                                <Input {...field} />
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
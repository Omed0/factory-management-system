"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
    CreateEmployee, createEmployeeSchema, OneEmployee,
    UpdateEmployee, updateEmployeeSchema
} from "@/server/schema/employee";
import UploadFile from "@/components/upload-file";
import { createEmployeeActions, updateEmployeeActions } from "@/actions/employee";
import { toast } from "sonner";
import { unlinkImage, uploadImage } from "@/lib/helper";
import { CurrencyInput } from "@/components/custom-currency-input";
import useSetQuery from "@/hooks/useSetQuery";
import { IQDtoUSD } from "@/lib/utils";
import { useDollar } from "@/hooks/useDollar";

type Props = {
    employee?: Partial<OneEmployee>;
    title: string;
    handleClose?: () => void;
}

export default function AddEmployee({ employee, title, handleClose }: Props) {
    const { searchParams } = useSetQuery(100)
    const currency = searchParams.get("currency") || "USD"
    const { data } = useDollar()
    const isEdit = !!employee;

    const form = useForm<CreateEmployee>({
        mode: "onSubmit",
        resolver: zodResolver(isEdit ? updateEmployeeSchema : createEmployeeSchema),
        defaultValues: { ...employee as UpdateEmployee },
    });


    async function onSubmit(values: CreateEmployee) {
        if (currency === "IQD") {
            values.monthSalary = IQDtoUSD(values.monthSalary, data.dollar)
        }

        let serializedValues = JSON.parse(JSON.stringify(values))
        let employeeValues
        let image

        if (!!serializedValues.image) {
            if (isEdit && employee?.image) {
                const unlinkedImage = await unlinkImage(employee.image)
                if (!unlinkedImage.success) return toast.error(unlinkedImage.error)
            }
            image = await uploadImage(serializedValues.image)
            if (!image.success) return toast.error(image.error)
            serializedValues.image = image.filePath
        }
        console.log(serializedValues)
        if (isEdit && employee?.id) {
            employeeValues = await updateEmployeeActions(employee.id, serializedValues)
        } else {
            employeeValues = await createEmployeeActions(serializedValues)
        }

        if (!employeeValues.success) {
            toast.error(employeeValues.message)
        } else {
            toast.success(employeeValues.message)
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
                            <FormLabel>ناوی کارمەند</FormLabel>
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
                <CurrencyInput
                    className="flex-1 basis-56"
                    control={form.control}
                    name="monthSalary"
                    label="مووچەی مانگانە"
                />
                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-56">
                            <FormLabel>وێنە</FormLabel>
                            <FormControl>
                                <UploadFile
                                    name={field.name}
                                    accept={['image/jpeg', 'image/png', 'image/jpg']}
                                    field={field}
                                />
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
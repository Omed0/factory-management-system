"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
    ArrowUp,
    DatabaseZap,
    HardDriveDownload,
    LoaderCircle,
    Send,
    X,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";
import CustomDialogWithTrigger from "./custom-dialog-trigger";
import { Form } from "../ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { DialogClose } from "../ui/dialog";


type Props = {
    onClose?: () => void;
}


export default function RestoreButton({ onClose }: Props) {
    const [loadingRestore, setLoadingRestore] = useState(false);
    const [modalTelegram, setModalTelegram] = useState(false)

    const router = useRouter();

    const handleRestore = async (values: "telegram" | "local") => {
        const restoreSource = values;
        setLoadingRestore(true);

        const formData = new FormData();
        formData.append("restoreSource", restoreSource);

        try {
            const response = await fetch("/api/restore", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                toast.success("سەرکەووتوبوو", {
                    description: "ڕیستۆرکرا بە فایلی تێلێگرام",
                    duration: 4000,
                });
                router.refresh();
                onClose && onClose();
            } else {
                toast.error("هەڵەیەک ڕوویدا، ڕیستۆر نەکرا");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("هەڵەیەک ڕوویدا، ڕیستۆر نەکرا");
        } finally {
            setLoadingRestore(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-3">
                    <ArrowUp className="size-5" />
                    Restore
                    {loadingRestore ? (
                        <LoaderCircle className="size-5 animate-spin duration-300" />
                    ) : (
                        <DatabaseZap className="size-5" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 mx-3">
                <DropdownMenuLabel className="text-end">
                    ڕیستۆردانی باکئەپ
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        className="justify-end gap-3 cursor-pointer"
                        onClick={() => handleRestore("local")}
                    >
                        لۆکاڵ
                        <HardDriveDownload className="size-5" />
                    </DropdownMenuItem>
                    <CustomDialogWithTrigger
                        open={modalTelegram}
                        onOpenChange={setModalTelegram}
                        className="p-14"
                        button={<Button variant="ghost" className="justify-end gap-3 w-full px-2 cursor-pointer">
                            تێلێگرام
                            <Send className="size-5" />
                        </Button>}
                    >
                        <section>
                            <FormRestoreSql onClose={onClose} />
                        </section>
                    </CustomDialogWithTrigger>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}



function FormRestoreSql({ onClose }: Props) {
    const form = useForm({
        resolver: zodResolver(validFiles),
        defaultValues: { files: [] },
    })

    const handleSubmit = async (values: any) => {
        const formData = new FormData();
        Array.from(values.files as FileList).forEach((file: File) => {
            formData.append("files", file);
        });
        formData.append("restoreSource", "upload");

        const response = await fetch("/api/restore", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            toast.success(data.message, {
                duration: 4000,
            });
            onClose && onClose();
        } else {
            toast.error(data.message);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="relative w-full flex flex-col gap-3"
            >
                <Input
                    type="file"
                    multiple
                    accept=".zip,.rar"
                    {...form.register("files")}
                    className="flex-1"
                />
                <span className="text-sm text-gray-500">
                    فایلەکانی ZIP بۆ ڕیستۆرکردنەوەی داتابەیس
                </span>
                <span className="text-sm text-red-500">
                    {form.formState.errors.files?.message}
                </span>
                <span
                    onClick={() => form.setValue("files", [])}
                    className="cursor-pointer absolute top-2 end-2 rounded-sm">
                    <X className="size-6 text-red-500" />
                </span>

                <div className="mt-5 flex w-full flex-wrap gap-5">
                    <Button type="submit" className="flex-1 basis-60" disabled={!form.formState.isDirty}>
                        ڕیستۆرکردن
                    </Button>
                    <DialogClose className="flex-1 basis-60">
                        <Button type="reset" variant="outline" className="min-w-full">
                            داخستن
                        </Button>
                    </DialogClose>
                </div>
            </form>
        </Form>
    )
}

const validFiles = z.object({
    files: z.any().refine((files) => {
        if (files instanceof FileList) {
            return files.length > 0;
        }
        return false;
    }, {
        message: "پێویستە فایلەکان هەڵبژێریت",
    }),
});
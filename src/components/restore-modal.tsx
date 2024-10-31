"use client"

import { History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CustomDialogWithTrigger from "./layout/custom-dialog-trigger";

type DialogModalProps = {
    restorKey: number
    onClose?: () => void
    action: (key: number) => Promise<{ message: string, success: boolean }>
    classNameButton?: string
    title?: string
    description?: string
};

export default function RestorModal({ restorKey, onClose, action,
    classNameButton, title, description }: DialogModalProps) {
    const [open, setOpen] = useState(false);

    const handleChange = () => {
        if (open) {
            setOpen(false);
            onClose && onClose();
        } else {
            setOpen(true);
        }
    };

    return (
        <CustomDialogWithTrigger
            open={open}
            onOpenChange={handleChange}
            button={<Button variant="link" className={classNameButton}>
                <History className="size-5 me-1" />
                هێنانەوە
            </Button>}
            className="flex flex-col py-10 px-12 md:max-w-xl overflow-hidden"
        >

            <DialogHeader>
                <DialogTitle>
                    <span className="w-fit block mx-auto p-2 bg-red-200/80 rounded-full">
                        <History size={28} color="red" className="stroke-[1.5px]" />
                    </span>
                </DialogTitle>
            </DialogHeader>
            <form
                action={async () => {
                    if (restorKey) {
                        const { message, success } = await action(restorKey)
                        if (success) {
                            toast.info(message)
                            handleChange()
                            return
                        } else {
                            return toast.error(message)
                        }
                    }
                    return toast.error("ئەم داتایە نەدۆزرایەوە");
                }}
                className="w-full flex flex-col gap-4"
            >
                <div className="text-center space-y-2">
                    <h2 className="text-xl text-foreground">
                        هێنانەوەی {title ?? "ئەم داتایە"}
                    </h2>
                    <p className="text-base text-foreground/60">
                        {description ?? "دڵنیای لە هێنانەوەی ئەم داتایە..؟"}
                    </p>
                </div>
                <DialogFooter className="w-full gap-3 sm:justify-center mt-3">
                    <Button onClick={handleChange} variant="outline" type="reset" className="w-full">
                        داخستن
                    </Button>
                    <Button className="w-full" type="submit">
                        هێنانەوە
                    </Button>
                </DialogFooter>
            </form>
        </CustomDialogWithTrigger>
    );
}

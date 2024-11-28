"use client"

import { CircleAlert, Trash } from "lucide-react";
import { toast } from "sonner";
import { useState, ReactNode } from "react";
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@radix-ui/react-dialog";

type ConfirmationModalProps = {
    title: string;
    description: string;
    icon?: ReactNode;
    onConfirm: () => Promise<{ message: string; success: boolean }>;
    onClose?: () => void;
    children: ReactNode;
};

export default function ConfirmationDeleteModal({
    title,
    description,
    icon = <CircleAlert size={28} className="stroke-[1.5px]" />,
    onConfirm,
    onClose,
    children
}: ConfirmationModalProps) {
    const [open, setOpen] = useState(false);

    const handleChange = () => {
        if (open) {
            setOpen(false);
            onClose?.();
        } else {
            setOpen(true);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={handleChange}
        >
            <DialogTrigger>
                {children}
            </DialogTrigger>
            <DialogContent className="flex flex-col py-10 px-12 md:max-w-xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        <span className="w-fit block mx-auto p-2 bg-red-200/80 rounded-full">
                            {icon}
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <form
                    action={async () => {
                        const { message, success } = await onConfirm();
                        if (success) {
                            toast.success(message);
                            handleChange();
                        } else {
                            toast.error(message);
                        }
                    }}
                    className="w-full flex flex-col gap-4"
                >
                    <div className="text-center space-y-2">
                        <h2 className="text-xl text-foreground">{title}</h2>
                        <p className="text-base text-foreground/60">{description}</p>
                    </div>
                    <DialogFooter className="w-full gap-3 sm:justify-center mt-3">
                        <Button variant={"outline"} className="w-full" type="submit">
                            <Trash className="size-5" />
                            دڵنیام
                        </Button>
                        <Button onClick={handleChange} variant="destructive" type="reset" className="w-full">
                            گەڕانەوە
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client"

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";

type Props = {
    className?: string;
    children: React.ReactNode;
    button: React.ReactNode;
    onOpenChange?: DialogProps["onOpenChange"];
    open?: boolean;
};

export default function CustomDialogWithTrigger({
    button, children, onOpenChange, open, className
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {button}
            </DialogTrigger>
            <DialogContent
                className={cn(
                    "min-w-0 w-[97%] md:max-w-[44rem] rounded-lg border-none outline-none p-0 overflow-x-hidden overflow-y-auto max-h-[95%]",
                    className
                )}
            >
                <DialogTitle hidden></DialogTitle>
                {children}
            </DialogContent>
        </Dialog>
    );
}


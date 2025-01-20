"use client"

import { useState } from "react";
import CustomDialogWithTrigger from "./layout/custom-dialog-trigger";
import { Button } from "./ui/button";
import { CircleAlert, Database, Trash } from "lucide-react";
import { DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import BackupButton from "./layout/backup-button";
import RestoreButton from "./layout/restore-button";


type Props = {
    onClose?: () => void;
}

export default function ModalDatabasePurpose({ onClose }: Props) {

    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
        onClose && onClose();
    }

    return (
        <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
                if (!e) {
                    onClose && onClose();
                }
                setOpen(e);
            }}
            button={
                <Button variant="outline" size="sm" className="h-9">
                    <Database className="size-5" />
                </Button>
            }
            className="flex flex-col overflow-hidden px-12 py-10 md:max-w-xl"
        >
            <DialogHeader>
                <DialogTitle>
                    <span className="mx-auto block w-fit rounded-full bg-sky-100 p-2">
                        <CircleAlert size={28} color="skyblue" className="stroke-[1.5px]" />
                    </span>
                </DialogTitle>
            </DialogHeader>
            <div className="flex w-full flex-col gap-6">
                <p className="text-foreground/60 text-base text-center">
                    باکئەپ کردن و ڕیستۆرکردنەوەی داتابەیس
                </p>
                <div className="flex items-center gap-5 justify-center w-full">

                </div>
                <DialogFooter className="mt-3 w-full gap-3 sm:justify-center">
                    <BackupButton onClose={handleClose} />
                    <RestoreButton onClose={handleClose} />
                </DialogFooter>
            </div>
        </CustomDialogWithTrigger>
    )
}
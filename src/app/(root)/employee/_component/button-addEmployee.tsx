"use client"

import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { PlusCircleIcon } from "lucide-react"
import AddEmployee from "./add-employee"
import { useState } from "react"


type Props = {}

export default function ButtonAddEmployee({ }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <CustomDialogWithTrigger
            open={open}
            onOpenChange={setOpen}
            button={
                <Button>
                    <PlusCircleIcon className="me-2 size-4" />
                    زیادکردن
                </Button>
            }
        >
            <section className="w-full p-4">
                <AddEmployee
                    handleClose={() => setOpen(false)}
                    title="زیادکردن کارمەند" />
            </section>
        </CustomDialogWithTrigger>
    )
}
"use client"

import { updateDollarActions } from "@/actions/boxes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"



export default function FormDollar() {
    return (
        <form
            dir="rtl"
            className="flex items-center gap-4"
            action={async (formData) => {
                const res = await updateDollarActions(formData)
                if (!res.success) {
                    toast.error(res.message)
                    return
                }
                toast.success(res.message)
            }}>
            <Label htmlFor="dollar" className="w-full">
                <Input
                    name="dollar"
                    placeholder="نرخی دۆلار بنووسە"
                    className="w-full"
                />
            </Label>
            <Button className="">
                تازەکردنەوە
                <DollarSign className="size-5" />
            </Button>
        </form>
    )
}
"use client"

import { deleteEmployeeActionActions } from "@/actions/employee"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import useSetQuery from "@/hooks/useSetQuery"
import { formatCurrency, getMonthStartAndEndOfMonth } from "@/lib/utils"
import EditTableAction from "./edit-table-action"
import { UpdateEmployeeAction } from "@/server/schema/employee"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import useActionEmployee from "../useActionEmployee"
import { useDollar } from "@/hooks/useDollar"

type Props = {
    empId: number
    name: string
}


export default function EmployeeInfoActions({ empId, name }: Props) {
    const { searchParams } = useSetQuery()
    const { data: { dollar } } = useDollar()

    const month = searchParams.get("month")
    const currency = searchParams.get("currency") || "USD"
    const now = new Date()

    const dateQuery = month ? getMonthStartAndEndOfMonth(new Date(now.setMonth(+month - 1))) :
        getMonthStartAndEndOfMonth(now)

    const { data: employeeActions, isLoading, error, isError, refetch } = useActionEmployee(empId, dateQuery)

    useEffect(() => {
        if (month) refetch()
    }, [month])

    if (isError) return <div>{error.message}</div>

    return (
        <Table>
            <TableCaption>
                {employeeActions?.length === 0 && name && (
                    <p className="text-inherit">{name} هیچ داتایەکی نییە</p>
                )}
            </TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">جۆر</TableHead>
                    <TableHead>بڕ</TableHead>
                    <TableHead>کات</TableHead>
                    <TableHead className="text-right">تێبینی</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {!isLoading && employeeActions?.map((action, index) => (
                    <TableRow key={action.id}>
                        <TableCell>{action.type}</TableCell>
                        <TableCell>{formatCurrency(action.amount, dollar, currency)}</TableCell>
                        <TableCell>{new Date(action.dateAction).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-96 text-wrap">
                            {action.note}
                        </TableCell>
                        <TableCell className="text-end flex items-center justify-end gap-10">
                            <EditTableAction
                                id={action.id}
                                key={action.id}
                                infoAction={{ ...action } as UpdateEmployeeAction}
                            />
                            <form action={async () => {
                                const { success, message } = await deleteEmployeeActionActions(action.id)
                                if (!success) {
                                    toast.error(message)
                                    return
                                }
                                toast.success(message)
                                refetch()
                            }}>
                                <Button variant="destructive" size="icon" className="border">
                                    <Trash className="size-5" />
                                </Button>
                            </form>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

    )
}
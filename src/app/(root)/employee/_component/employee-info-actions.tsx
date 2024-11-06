"use client"

import { deleteEmployeeActionActions, getEmployeeActionActions } from "@/actions/employee"
import { Badge } from "@/components/ui/badge"
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
import { getMonthStartAndEndOfMonth } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import EditTableAction from "./edit-table-action"
import { UpdateEmployeeAction } from "@/server/schema/employee"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type Props = {
    empId: number
    name: string
}


export default function EmployeeInfoActions({ empId, name }: Props) {
    const { searchParams } = useSetQuery()
    const date = searchParams.get("date")?.split("&")
    const isIQD = searchParams.get("currency") === "IQD"

    const dateQuery = date && date?.length > 0 ?
        getMonthStartAndEndOfMonth(new Date(date?.[0])) : getMonthStartAndEndOfMonth(new Date())

    const { data: employeeActions, isLoading, error, isError, refetch } = useQuery({
        queryKey: ["employeeActions", String(empId)],
        queryFn: async () => await getEmployeeActionActions(empId, dateQuery),
        enabled: !!empId
    })

    if (isError) return <div>{error.message}</div>

    return (
        <Table>
            <TableCaption>
                {employeeActions?.length === 0 && name ? (
                    <p className="text-inherit">{name} هیچ داتایەکی نییە</p>
                ) : (
                    <Badge variant="outline" className="text-md font-semibold">
                        {name}
                    </Badge>
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
                {!isLoading && employeeActions?.map((action) => (
                    <TableRow key={action.id}>
                        <TableCell>{action.type}</TableCell>
                        <TableCell>{action.amount}</TableCell>
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
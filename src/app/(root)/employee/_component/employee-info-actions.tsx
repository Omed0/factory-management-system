"use client"

import { getEmployeeActionActions } from "@/actions/employee"
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

type Props = {
    empId: number
}


export default function EmployeeInfoActions({ empId }: Props) {
    const { searchParams } = useSetQuery()
    const date = searchParams.get("date")?.split("&")
    const isIQD = searchParams.get("currency") === "IQD"

    const dateQuery = date ? getMonthStartAndEndOfMonth(new Date(date?.[0])) : getMonthStartAndEndOfMonth(new Date())
    const { data: employeeActions, isLoading, error, isError } = useQuery({
        queryKey: ["employeeActions", empId],
        queryFn: async () => await getEmployeeActionActions(empId, dateQuery),
        enabled: !!empId
    })

    if (isError) return <div>{error.message}</div>

    return (
        <Table>
            <TableCaption>
                {employeeActions?.length === 0 && "هیچ داتایەکی نییە"}
                {isLoading && "چاوەڕوانبە..."}
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
                        <TableCell className="text-right">{action.note}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

    )
}
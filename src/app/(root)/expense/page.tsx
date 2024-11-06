import { PlusCircleIcon } from "lucide-react"

import { HandCoins } from "lucide-react"
import { getExpensesListActions, getExpensesListTrashedActions } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import AddEmployee from "../employee/_component/add-employee"
import { DataTable } from "./_component/data-table"
import { columns } from "./_component/columns"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import AddExpense from "./_component/add-expense"

type Props = {
    searchParams: {
        status: string
    }
}

export default async function Expense({ searchParams }: Props) {
    const isTrash = searchParams.status === "trash"

    let expenses
    if (isTrash) {
        expenses = await getExpensesListTrashedActions()
    } else {
        expenses = await getExpensesListActions()
    }

    if (!expenses.success) {
        return <div>{expenses.message as string}</div>
    }

    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex items-center gap-2">
                <HandCoins className="size-5" />
                <h1 className="text-lg font-medium">
                    {isTrash ? "خەرجیە ئەرشیفکراوەکان" : "خەرجیە بەردەستەکان"}
                </h1>
            </div>
            <DataTable
                columns={columns}
                data={expenses.data || []}
            />
        </section>
    )
}
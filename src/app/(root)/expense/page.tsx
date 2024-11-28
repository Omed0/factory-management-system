
import { HandCoins } from "lucide-react"
import { getExpensesListActions } from "@/actions/expense"
import { DataTable } from "./_component/data-table"
import { columns } from "./_component/columns"

type Props = {
    searchParams: {
        status: string
    }
}

export default async function Expense({ searchParams }: Props) {
    const isTrash = searchParams.status === "trash"

    const expenses = await getExpensesListActions({ isTrash })

    if (!expenses.success) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{expenses.message}</h1>
            </div>
        </div>
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
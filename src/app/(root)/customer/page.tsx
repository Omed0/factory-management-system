import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"

import { PlusCircleIcon, UsersRound } from "lucide-react"
import AddCustomer from "./_component/add-customer-form"
import { columns } from "./_component/columns"
import { DataTable } from "./_component/data-table"
import { getCustomerListActions } from "@/actions/customer"

type Props = {
    searchParams: {
        status: "trash" | "active"
    }
}

export default async function Customer({ searchParams }: Props) {
    const isTrash = searchParams.status === "trash"
    const customers = await getCustomerListActions(isTrash)

    if (!customers.success) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{customers.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex justify-between">
                <div className="flex items-center gap-2">
                    <UsersRound className="size-5" />
                    <h1 className="text-lg font-medium">
                        {isTrash ? "کڕیارە ئەرشیفکراوەکان" : "کڕیارە بەردەستەکان"}
                    </h1>
                </div>
                <CustomDialogWithTrigger
                    button={
                        <Button>
                            <PlusCircleIcon className="me-2 h-4 w-4" />
                            کڕیار
                        </Button>}
                >
                    <section className="w-full p-4">
                        <AddCustomer title="زیادکردنی کڕیار" />
                    </section>
                </CustomDialogWithTrigger>
            </div>
            <DataTable
                columns={columns}
                data={customers.data ?? []}
            />
        </section>
    )
}
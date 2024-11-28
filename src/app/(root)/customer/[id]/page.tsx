import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { PlusCircleIcon, UsersRound } from "lucide-react"
import { DataTable } from "../_component/data-table"
import { column_sale } from "../_component/column-sales"
import { getCustomerListSaleActions } from "@/actions/sale"
import FormSaleForCustomer from "../_component/add-sale-form"
import Link from "next/link"

type Props = {
    searchParams: {
        status: "trash" | "active"
    },
    params: {
        id: string
    }
}

export default async function SpecificCustomerSales({ searchParams, params }: Props) {
    const isTrash = searchParams.status === "trash"
    const customerId = Number(params.id)
    const sales = await getCustomerListSaleActions(customerId, isTrash)

    if (!sales.success) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{sales.message}</h1>
                <Link
                    replace href="/customer"
                    className="p-3 hover:underline underline-offset-8 text-blue-500"
                >بچۆرەوە بۆ کڕیارەکان</Link>
            </div>
        </div>
    }


    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex justify-between">
                <div className="flex items-center gap-2">
                    <UsersRound className="size-5" />
                    <h1 className="text-lg font-medium">
                        {isTrash ? "وەصڵە ئەرشیفکراوەکان" : "وەصڵە بەردەستەکان"}
                    </h1>
                </div>
                <CustomDialogWithTrigger
                    button={
                        <Button>
                            <PlusCircleIcon className="me-2 h-4 w-4" />
                            فرۆشتن
                        </Button>}
                >
                    <section className="w-full p-4">
                        <FormSaleForCustomer
                            customerName={sales.data?.name}
                            customerId={customerId}
                            title="زیادکردنی وەصڵ" />
                    </section>
                </CustomDialogWithTrigger>
            </div>
            <DataTable
                columns={column_sale}
                data={sales.data?.sale ?? []}
            />
        </section>
    )
}
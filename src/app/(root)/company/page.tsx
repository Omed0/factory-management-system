import { PlusCircleIcon } from "lucide-react"

import { getCompanyListActions } from "@/actions/company"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import { columns } from "./_component/columns"
import AddCompany from "./_component/add-company-form"
import { DataTable } from "./_component/data-table"

type Props = {
    searchParams: {
        status: "trash" | "active"
    }
}

export default async function Company({ searchParams }: Props) {
    const isTrash = searchParams.status === "trash"
    const companies = await getCompanyListActions(isTrash)

    if (!companies.success) {
        return <div>{companies.message}</div>
    }

    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex justify-between">
                <div className="flex items-center gap-2">
                    <Users className="size-5" />
                    <h1 className="text-lg font-medium">
                        {isTrash ? "کۆمپانیا ئەرشیفکراوەکان" : "کۆمپانیا بەردەستەکان"}
                    </h1>
                </div>
                <CustomDialogWithTrigger
                    button={
                        <Button>
                            <PlusCircleIcon className="me-2 h-4 w-4" />
                            کۆمپانیا
                        </Button>}
                >
                    <section className="w-full p-4">
                        <AddCompany title="زیادکردنی کۆمپانیا" />
                    </section>
                </CustomDialogWithTrigger>
            </div>
            <DataTable
                columns={columns}
                data={companies.data ?? []}
            />
        </section>
    )
}
import { Button } from "@/components/ui/button"
import { columns } from "./_component/columns"
import { DataTable } from "./_component/data-table"
import { PlusCircleIcon, Users } from "lucide-react"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import AddEmployee from "./_component/add-employee"
import { getEmployeesListActions, getEmployeesListTrashedActions } from "@/actions/employee"

type Props = {
    searchParams: {
        status: string
    }
}

export default async function Employee({ searchParams }: Props) {
    const isTrash = searchParams.status === "trash"
    let employees
    if (isTrash) {
        employees = await getEmployeesListTrashedActions()
    } else {
        employees = await getEmployeesListActions()
    }

    if ("error" in employees) {
        return <div>{employees.error as string}</div>
    }

    return (
        <section className="w-full space-y-4 p-2">
            <div className="flex justify-between">
                <div className="flex items-center gap-2">
                    <Users className="size-5" />
                    <h1 className="text-lg font-medium">
                        {isTrash ? "کارمەندە ئەرشیفکراوەکان" : "کارمەندە بەردەستەکان"}
                    </h1>
                </div>
                <CustomDialogWithTrigger
                    button={
                        <Button>
                            <PlusCircleIcon className="me-2 h-4 w-4" />
                            زیادکردن
                        </Button>}
                >
                    <section className="w-full p-4">
                        <AddEmployee title="زیادکردن کارمەند" />
                    </section>
                </CustomDialogWithTrigger>
            </div>
            <DataTable
                columns={columns}
                data={employees}
            />
        </section>
    )
}
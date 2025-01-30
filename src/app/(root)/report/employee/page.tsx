import { getActionsEmployeeActions } from '@/actions/information';
import { changeDateToString, seperateDates } from '@/lib/utils';
import { DataTable } from '../_component/data-table';
import { columns_action_employee } from '../_component/columns_action_employee';


type Props = {
    searchParams: {
        date: string
        name: string
    }
}

export const dynamic = 'force-dynamic'

export default async function ReportActionsEmployee({ searchParams }: Props) {
    const dates = searchParams.date ? changeDateToString(seperateDates(searchParams.date)) : undefined // if date is not provided, it will show all data

    const Actions = await getActionsEmployeeActions({ name: searchParams.name, ...dates })

    if (!Actions.success || !Actions.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{Actions.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2 pt-5">
            <DataTable columns={columns_action_employee} data={Actions.data.reverse() || []} />
        </section>
    );
}

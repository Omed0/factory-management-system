import { getReportByNameActions } from '@/actions/information';
import { changeDateToString, seperateDates } from '@/lib/utils';
import { DataTable } from '../_component/data-table';
import { columns_report, report_name } from '../_constant';
import { columns_reports } from '../_component/columns_reports';


type Props = {
    params: {
        id: string
    },
    searchParams: {
        date: string
    }
}

export const dynamic = 'force-dynamic'

export default async function Reports({ searchParams, params }: Props) {
    const dates = changeDateToString(seperateDates(searchParams.date))

    const reports = await getReportByNameActions({ ...dates, name: params?.id as any ?? report_name[0] })

    if (!reports.success || !reports.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{reports.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2 pt-5">
            <DataTable columns={columns_reports} data={reports.data as columns_report[]} />
        </section>
    );
}

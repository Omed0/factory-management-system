import { getReportByNameActions } from '@/actions/information';
import { seperateDates } from '@/lib/utils';
import { DataTable } from '../_component/data-table';
import { columns } from '../_component/columns';
import { report_name } from '../_constant';


type Props = {
    params: {
        id: string
    },
    searchParams: {
        date: string
    }
}

export default async function Report({ searchParams, params }: Props) {
    const dates = seperateDates(searchParams.date)

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
            <DataTable columns={columns} data={reports.data} />
        </section>
    );
}

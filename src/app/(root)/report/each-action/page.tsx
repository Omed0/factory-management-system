import { getDetailActionBoxActions } from '@/actions/information';
import { changeDateToString, seperateDates, sleep } from '@/lib/utils';
import { DataTable } from '../_component/data-table';
import { columns } from '../_component/columns';


type Props = {
    searchParams: {
        date: string
    }
}

export const dynamic = 'force-dynamic'

export default async function Report({ searchParams }: Props) {
    const dates = searchParams.date ? changeDateToString(seperateDates(searchParams.date)) : undefined // if date is not provided, it will show all data

    const detailBox = await getDetailActionBoxActions(dates)

    if (!detailBox.success || !detailBox.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{detailBox.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2 pt-5">
            <DataTable columns={columns} data={detailBox.data.reverse()} />
        </section>
    );
}

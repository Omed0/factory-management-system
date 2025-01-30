import { getSelfInvoiceActions } from '@/actions/information';
import { DataTable } from '../_component/data-table';
import { ReportTradePartnerTypes } from '@/server/schema/information';
import { changeDateToString, seperateDates } from '@/lib/utils';
import { column_purchase } from './_components/column_purchase';
import { column_sale } from './_components/column_sale';


type Props = {
    searchParams: {
        type: ReportTradePartnerTypes['type'],
        date: string,
        status: string
    }
}

export const dynamic = 'force-dynamic'

export default async function ReportLoans({ searchParams }: Props) {
    const dates = searchParams.date ? changeDateToString(seperateDates(searchParams.date)) : undefined // if date is not provided, it will show all data
    const type = searchParams.type || 'customer';
    const isTrash = searchParams.status === "trash" || false
    const column = type === "customer" ? column_sale : column_purchase;

    const res = await getSelfInvoiceActions({ dates, type, isTrash });


    if (!res.success || !res.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{res.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2 pt-5">
            <DataTable columns={column as any} data={(res.data ?? []) as any} />
        </section>
    );
}

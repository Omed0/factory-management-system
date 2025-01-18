import { getPartnersLoanActions } from '@/actions/information';
import { DataTable } from '../_component/data-table';
import { PartnersLoanTypes } from '@/server/schema/information';
import { columns_loan } from '../_component/columns-loan';


type Props = {
    searchParams: {
        loanPartner: "customer" | "company" | undefined;
    }
}

export const dynamic = 'force-dynamic'

export default async function ReportLoans({ searchParams }: Props) {
    const type = searchParams.loanPartner ?? "customer"
    const loans = await getPartnersLoanActions({ type });

    if (!loans.success || !loans.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{loans.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-2 pt-5">
            <DataTable columns={columns_loan} data={loans.data ?? []} />
        </section>
    );
}

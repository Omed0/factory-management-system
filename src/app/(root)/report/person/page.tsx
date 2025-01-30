import { changeDateToString, seperateDates } from "@/lib/utils";
import SupplierSelector from "../_component/supplier-selector";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentChart from "../_component/payment-chart";
import FinancialSummary from "../_component/financial-summary";
import { getReportPartnerChartActions, getReportPartnerSpecificTimeActions, getTradePartnerActions } from "@/actions/information";
import { getReportChartPartnerTypes } from "@/server/schema/information";

type Props = {
    searchParams: {
        date: string
        name: string;
        type: getReportChartPartnerTypes['type']
    }
}

export const dynamic = 'force-dynamic'

export default async function PersonReport({ searchParams }: Props) {
    const { date, name, type = "customer" } = searchParams
    const isCompany = type === "company" ? "کۆمپانیا" : "کڕیار"

    const dates = changeDateToString(seperateDates(date))

    const { success, data, message } = await getTradePartnerActions({ type })

    if (!success || !data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{message}</h1>
            </div>
        </div>
    }

    const partner = (data.find((partner) => partner?.id === +name)?.id || data?.[0]?.id || 0).toString()

    const report_chart = await getReportPartnerChartActions({ id: partner, type })
    const report_partner = await getReportPartnerSpecificTimeActions({ id: partner, type, dates })

    if (!report_chart.data || !report_partner.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{report_partner.message || report_chart.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-4">
            <div className="flex items-center justify-between gap-2 py-4">
                <h1 className="text-xl font-semibold">{`ڕاپۆرتی ${isCompany}`}</h1>
                <SupplierSelector type_partner={type} name={name} partners={data} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Suspense fallback={<Skeleton className="h-[200px]" />}>
                    <FinancialSummary type={type} data={report_partner.data} />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-[200px]" />}>
                    <PaymentChart type={type} data={report_chart.data} />
                </Suspense>
            </div>
        </section>
    );
}
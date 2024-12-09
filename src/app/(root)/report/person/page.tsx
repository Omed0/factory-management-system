import { seperateDates } from "@/lib/utils";
import SupplierSelector from "../_component/supplier-selector";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentChart from "../_component/payment-chart";
import FinancialSummary from "../_component/financial-summary";
import { getTradePartnerActions } from "@/actions/information";

type Props = {
    searchParams: {
        date: string
        name: string;
        type: "company" | "customer"
    }
}

export default async function PersonReport({ searchParams }: Props) {
    const { date, name, type } = searchParams
    const isCompany = type === "company" ? "کۆمپانیا" : "کڕیار"

    const dates = seperateDates(date)

    const partners = await getTradePartnerActions({ type: type ?? "customer", name })

    if (!partners.success || !partners.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{partners.message}</h1>
            </div>
        </div>
    }

    return (
        <section className="w-full space-y-4 p-5">
            <div className="flex items-center justify-between gap-2 py-4">
                <h1 className="text-xl font-semibold">{`ڕاپۆرتی ${isCompany}`}</h1>
                <SupplierSelector type={type} name={name} partners={partners.data} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Suspense fallback={<Skeleton className="h-[200px]" />}>
                    <FinancialSummary type={type} />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-[200px]" />}>
                    <PaymentChart type={type} />
                </Suspense>
            </div>
        </section>
    );
}
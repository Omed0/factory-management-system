"use client"

import { getCustomersWhoDidntGiveLoanActions } from "@/actions/information";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import useConvertCurrency from "@/hooks/useConvertCurrency";
import { format } from "date-fns";
import Link from "next/link";

type Props = {
    sale: Exclude<Awaited<ReturnType<typeof getCustomersWhoDidntGiveLoanActions>>['data'], undefined>['oneMonthAgoCustomers'][0],
}

export default function NotificationCard({ sale }: Props) {
    const invocieName = sale.saleNumber
    const totalAmount = useConvertCurrency(sale.totalAmount, sale.dollar)
    const totalRemainig = useConvertCurrency(sale.totalRemaining, sale.dollar)
    const discount = sale.discount
    const totalAmountAfterDiscount = useConvertCurrency(sale.totalAmount - discount || 0, sale.dollar)

    const precentage = (sale.totalRemaining / sale.totalAmount) * 100
    const lastPaid = sale.paidLoans.length ? sale.paidLoans[sale.paidLoans.length - 1].paidDate : sale.saleDate
    const formatDateLastPaid = lastPaid.toLocaleDateString("en-GB")

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between p-4">
                <CardTitle className="tracking-wider font-medium">
                    <p><strong>وەصڵ:</strong> {invocieName}</p>
                </CardTitle>
                <CardDescription>
                    <Link href={`/customer/${sale.customerId}?invoice=${sale.saleNumber}`}
                        className="text-blue-500 hover:underline"
                    >{sale.customer?.name}</Link>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex">
                    <strong>کۆی گشتی:</strong>
                    {!!discount ? (
                        <>
                            <del className="mx-3 text-red-500">{totalAmount}</del>
                            <p>{totalAmountAfterDiscount}</p>
                        </>
                    ) : (
                        <p className="inline ms-2">{totalAmount}</p>
                    )}
                </div>
                <p className="flex">
                    <strong className="me-7">کۆی دراو:</strong>
                    {totalRemainig}
                </p>
                <p>
                    <strong className="me-6">کۆتا بەرواری پارەدان:</strong>
                    {formatDateLastPaid}
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary"
                        style={{ width: `${precentage}%` }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
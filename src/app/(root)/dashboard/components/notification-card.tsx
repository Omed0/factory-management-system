"use client"

import { getCustomersWhoDidntGiveLoanActions } from "@/actions/information";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import useConvertCurrency from "@/hooks/useConvertCurrency";
import { useDollar } from "@/hooks/useDollar";
import { formatCurrency } from "@/lib/utils";
import { Customers, Sales } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

type Props = {
    customer: Exclude<Awaited<ReturnType<typeof getCustomersWhoDidntGiveLoanActions>>['data'], undefined>['oneMonthAgoCustomers'][0],
}

export default function NotificationCard({ customer }: Props) {
    const sale = customer.sales[0]

    const invocieName = sale.saleNumber
    const totalAmount = useConvertCurrency(sale.totalAmount)
    const totalRemainig = useConvertCurrency(sale.totalRemaining)
    const discount = sale.discount
    const totalAmountAfterDiscount = useConvertCurrency(sale.totalAmount - discount || 0)

    const precentage = (sale.totalRemaining / sale.totalAmount) * 100
    const lastPaid = sale.paidLoans[sale.paidLoans.length - 1].paidDate
    const formatDateLastPaid = format(lastPaid, "dd-MM-yyy")

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between p-4">
                <CardTitle className="tracking-wider font-medium">
                    <p><strong>وەصڵ:</strong> {invocieName}</p>
                </CardTitle>
                <CardDescription>
                    <Link href={`/customer/${customer.id}`}
                        className="text-blue-500 hover:underline"
                    >{customer.name}</Link>
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
                        <p>{totalAmount}</p>
                    )}
                </div>
                <p>
                    <strong className="me-6">کۆی دراو:</strong>
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
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useConvertCurrency from "@/hooks/useConvertCurrency"
import { Contact, CreditCard, DollarSign, LucideIcon, UserRoundPlus } from "lucide-react"


type Props = {
    amounts: {
        totalRemainingAfterDiscount: number;
        totalCustomers: number;
        activeLoanCustomersCount: number;
        salesCreatedCount: number
    }
}

export default function Cards({ amounts }: Props) {
    const { activeLoanCustomersCount, totalCustomers,
        totalRemainingAfterDiscount, salesCreatedCount } = amounts

    const cards = [
        { name: "کۆی داهات", amount: useConvertCurrency(totalRemainingAfterDiscount), icon: DollarSign },
        { name: "زیادبوونی کڕیار", amount: totalCustomers, icon: UserRoundPlus },
        { name: "زیادبوونی وەصڵ", amount: salesCreatedCount, icon: CreditCard },
        { name: "کڕیاری قەرز ماوە", amount: activeLoanCustomersCount, icon: Contact },
    ]

    return (
        <div className="flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.name}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <card.icon className='size-5' />
                        <CardTitle className="text-sm font-medium">
                            {card.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='text-end'>
                        <div className="text-2xl font-bold">{card.amount}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
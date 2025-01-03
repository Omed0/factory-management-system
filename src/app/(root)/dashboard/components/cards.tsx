"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useConvertCurrency from "@/hooks/useConvertCurrency"
import { Contact, CreditCard, DollarSign, LucideIcon, UserRoundPlus, Vault } from "lucide-react"


type Props = {
    amounts: {
        totalIncome: number;
        totalCustomers: number;
        activeLoanCustomersCount: number;
        totalMoneyInBox: number;
        totalSalesCount: number;
        totalOutgoing: number;
        addition_employee_actions: number;
        subtraction_employee_actions: number;
    }
}

export default function Cards({ amounts }: Props) {
    const { activeLoanCustomersCount, totalCustomers,
        totalIncome, totalSalesCount, totalMoneyInBox, totalOutgoing,
        addition_employee_actions,
        subtraction_employee_actions } = amounts

    const cards = [
        { name: "کۆی گشتی قاسە", amount: useConvertCurrency(totalMoneyInBox), icon: Vault },
        { name: "کۆی کڕینەکان", amount: useConvertCurrency(totalOutgoing), icon: DollarSign },
        { name: "کۆی فرۆشتنەکان", amount: useConvertCurrency(totalIncome), icon: DollarSign },
        { name: "کۆی دەستکەوت لە کارمەند", amount: useConvertCurrency(addition_employee_actions), icon: DollarSign },
        { name: "کۆی پێدراو بە کارمەند", amount: useConvertCurrency(subtraction_employee_actions), icon: DollarSign },
        { name: "زیادبوونی کڕیار", amount: totalCustomers, icon: UserRoundPlus },
        { name: "زیادبوونی وەصڵ", amount: totalSalesCount, icon: CreditCard },
        { name: "کڕیاری قەرز", amount: activeLoanCustomersCount, icon: Contact },
    ]

    return (
        <div dir="rtl" className="w-full grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
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
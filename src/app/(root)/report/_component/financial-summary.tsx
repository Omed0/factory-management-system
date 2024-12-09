"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useConvertCurrency from "@/hooks/useConvertCurrency";
import { Banknote, DiamondPercent, DollarSign, HandCoins } from "lucide-react";

type Props = {
  type: "company" | "customer"
}

export default async function FinancialSummary({ type }: Props) {
  const isCompany = type === "company" ? "کۆی گشتی کڕدراو" : "کۆی گشتی فرۆشراو"

  const totalAmount = 140000
  const totalExistLoan = 5000
  const totalRemainig = 9000
  const totalDiscount = 3000

  const formatedTotalAmount = useConvertCurrency(totalAmount);
  const formatedTotalAmountAfterDiscount = useConvertCurrency(totalAmount - totalDiscount);
  const formatedTotalRemaining = useConvertCurrency(totalRemainig);
  const formatedTotalRemainingAfterDiscount = useConvertCurrency(totalRemainig - totalDiscount);
  const formatedtotalExistLoan = useConvertCurrency(totalExistLoan);
  const formatedtotalExistLoanAfterDiscount = useConvertCurrency(totalExistLoan - totalDiscount);
  const formatedtotalDiscount = useConvertCurrency(totalDiscount);


  const info = [
    { name: isCompany, amount: formatedTotalAmount, discount: formatedTotalAmountAfterDiscount, icon: DollarSign },
    { name: "کۆی واصڵ کراو", amount: formatedTotalRemaining, discount: formatedTotalRemainingAfterDiscount, icon: HandCoins },
    { name: "کۆی قەرزی ماوە", amount: formatedtotalExistLoan, discount: formatedtotalExistLoanAfterDiscount, icon: Banknote },
    { name: "کۆی داشکاندن", amount: formatedtotalDiscount, icon: DiamondPercent },
  ]

  return (
    <div className="h-fit grid grid-cols-2 gap-4">
      {info.map((info) => (
        <Card key={info.name}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium tracking-wider">{info.name}</CardTitle>
            <info.icon className="size-5" />
          </CardHeader>
          <CardContent>
            {!!info.discount ? (
              <>
                <del className="text-2xl font-bold text-red-500 text-opacity-60">{info.amount}</del>
                <p>{info.discount}</p>
              </>
            ) : (
              <p className="text-2xl font-bold">{info.amount}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


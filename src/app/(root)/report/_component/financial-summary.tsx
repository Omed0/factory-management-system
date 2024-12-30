"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useConvertCurrency from "@/hooks/useConvertCurrency";
import { da } from "date-fns/locale";
import { Banknote, DiamondPercent, DollarSign, HandCoins } from "lucide-react";

type Props = {
  type: "companies" | "customers"
  data: {
    totalRemaining: number;
    totalAmount: number;
    totalDiscount: number;
    totalAvailableLoan: number;
  };
}

export default async function FinancialSummary({ type, data }: Props) {
  const isCompany = type === "companies" ? "کۆی گشتی کڕدراو" : "کۆی گشتی فرۆشراو"

  const totalAmount = data.totalAmount
  const totalExistLoan = data.totalAvailableLoan
  const totalRemainig = data.totalRemaining
  const totalDiscount = data.totalDiscount

  const formatedTotalAmount = useConvertCurrency(totalAmount);
  const formatedTotalAmountAfterDiscount = useConvertCurrency(totalAmount - totalDiscount);
  const formatedTotalRemaining = useConvertCurrency(totalRemainig);
  const formatedtotalExistLoan = useConvertCurrency(totalExistLoan);
  const formatedtotalDiscount = useConvertCurrency(totalDiscount);


  const info = [
    {
      name: isCompany, amount: formatedTotalAmount,
      discount: totalDiscount > 0 ? formatedTotalAmountAfterDiscount : 0, icon: DollarSign
    },
    { name: "کۆی واصڵ کراو", amount: formatedTotalRemaining, icon: HandCoins },
    { name: "کۆی قەرزی ماوە", amount: formatedtotalExistLoan, icon: Banknote },
    { name: "کۆی داشکاندن", amount: formatedtotalDiscount, icon: DiamondPercent, hasNoDiscount: type === "companies" },
  ]

  return (
    <div className="h-fit grid grid-cols-2 gap-4">
      {info.map((info) => (
        !info.hasNoDiscount && (<Card key={info.name}>
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
        </Card>)
      ))}
    </div>
  )
}


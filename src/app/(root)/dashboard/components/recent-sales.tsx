"use client"

import CustomToolTip from '@/components/custom-tool-tip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { FALLBACK_IMAGE } from '@/lib/constant';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';


type Props = {
  data: any
}

export function RecentSales({ data }: Props) {
  const { latestSales } = data
  const { searchParams } = useSetQuery()
  const { data: { dollar } } = useDollar()
  const currency = searchParams.get("currency") || "USD"

  const formatAmounts = (amount: number) => {
    return formatCurrency(amount, dollar, currency)
  }

  return (
    <div dir='rtl' className="space-y-8">
      {latestSales.map((sale: any) => {
        const isGivingAllMoney = (sale.totalAmount - sale.discount) === sale.totalRemaining
        return (
          <div key={sale.id} className="flex items-center">
            <Avatar className="size-9">
              <AvatarImage src={FALLBACK_IMAGE} alt="Avatar" />
              <AvatarFallback>{sale.customer?.name.slice(0, 3)}</AvatarFallback>
            </Avatar>
            <div className="ms-4 space-y-1">
              <Link
                className='underline text-blue-400 leading-none'
                href={`/customer/${sale.customerId}`}>
                {sale.customer?.name}</Link>
              <p className="text-muted-foreground text-sm">
                {sale.customer?.phone}
              </p>
            </div>
            <div className='ms-auto space-y-0.5 text-end'>
              <CustomToolTip
                trigger={<p className={cn("cursor-text", {
                  "line-through": isGivingAllMoney
                })}>{sale.saleNumber}</p>}
              >
                <p>{isGivingAllMoney ? "تەواو بووە" : "ماویەتی"}</p>
              </CustomToolTip>

              {!!sale.discount ? (
                <div className='flex flex-col'>
                  <del className="font-medium text-red-500 text-opacity-60">
                    {formatAmounts(sale.totalAmount)}
                  </del>
                  <p>
                    {formatAmounts(sale.totalAmount - sale.discount)}
                  </p>
                </div>
              ) : (
                <p className="ms-auto font-medium">{formatAmounts(sale.totalAmount)}</p>
              )}
            </div>
          </div>
        )
      })
      }
    </div >
  );
}

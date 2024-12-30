"use client"

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { FALLBACK_IMAGE } from '@/lib/constant';
import { formatCurrency } from '@/lib/utils';


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
      {latestSales.map((sale: any) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className="size-9">
            <AvatarImage src={FALLBACK_IMAGE} alt="Avatar" />
            <AvatarFallback>{sale.customer?.name.slice(0, 3)}</AvatarFallback>
          </Avatar>
          <div className="ms-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.customer?.name}</p>
            <p className="text-muted-foreground text-sm">
              {sale.customer?.phone}
            </p>
          </div>
          {!!sale.discount ? (
            <div className='flex flex-col ms-auto'>
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
      ))
      }
    </div >
  );
}

'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useDollar } from "@/hooks/useDollar"
import useSetQuery from "@/hooks/useSetQuery"
import { now } from "@/lib/constant"
import { formatCurrency, parseDate } from "@/lib/utils"
import { TradePartnerTypes } from "@/server/schema/information"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

type Props = {
  type: TradePartnerTypes['type']
  data: {
    chartData: {
      month: number;
      now: number;
      past: number;
    }[];
    percentageChange: number;
  }

}

const chartConfig = {
  now: {
    label: "ئێستا",
    color: "hsl(var(--chart-2))",
  },
  past: {
    label: "پێشوو",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function PaymentChart({ type, data }: Props) {
  const isCompany = type === "company" ? "کڕدراو" : "فرۆشراو"
  const { searchParams } = useSetQuery()
  const { data: { dollar } } = useDollar()
  const currency = searchParams.get("currency") || "USD"


  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{isCompany}</CardTitle>
          <CardDescription>
            شیکاری چوار مانگی ڕابردوو
          </CardDescription>
        </div>
        <p>{parseDate(now)}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data.chartData}
            margin={{
              left: 10,
              right: 10,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              formatter={(value) => formatCurrency(+value, dollar, currency)}
              content={<ChartTooltipContent hideLabel indicator="dot" />}
            />
            <Area
              dataKey="now"
              type="natural"
              fill="var(--color-now)"
              fillOpacity={0.4}
              stroke="var(--color-now)"
              stackId="a"
            />
            <Area
              dataKey="past"
              type="natural"
              fill="var(--color-past)"
              fillOpacity={0.4}
              stroke="var(--color-past)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 font-medium leading-none">
          لەچاو چوار مانگی ڕابردوو تر {data.percentageChange} {data.percentageChange > 0 ? (
            <TrendingUp className="size-5 text-green-600" />
          ) : (
            <TrendingDown className="size-5 text-red-600" />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

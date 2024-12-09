'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

type Props = {
  type: "company" | "customer"
}

const chartData = [
  { month: "یەکەم", now: 186, past: 80 },
  { month: "دووەم", now: 305, past: 200 },
  { month: "سێیەم", now: 237, past: 120 },
  { month: "چوارەم", now: 73, past: 190 },
]

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

export default function PaymentChart({ type }: Props) {
  const isCompany = type === "company" ? "کڕدراو" : "فرۆشراو"
  const now = new Date().toLocaleDateString()

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{isCompany}</CardTitle>
          <CardDescription>
            شیکاری چوار مانگی ڕابردوو
          </CardDescription>
        </div>
        <p>{now}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 20,
              right: 20,
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
              content={<ChartTooltipContent indicator="dot" />}
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
        <div className="flex items-center gap-2 font-medium leading-none">
          لەچاو چوار مانگی ڕابردوو تر  <TrendingUp className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  )
}

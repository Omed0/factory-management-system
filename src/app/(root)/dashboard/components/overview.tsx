'use client';

import { getDashboardInfoChartActions } from '@/actions/information';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

type Props = {
  data: Awaited<ReturnType<typeof getDashboardInfoChartActions>>['data']
}

export function Overview({ data }: Props) {

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          stroke="#888888"
          fontSize={13}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={14}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Bar
          dataKey="totalIncome"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

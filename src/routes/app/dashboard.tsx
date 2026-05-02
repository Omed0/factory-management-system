import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { formatCurrency } from '~/lib/utils'
import { cn } from '~/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface DashboardStats {
  total_sales: number
  total_revenue: number
  outstanding_loans: number
  active_customers: number
  average_sale_value: number
  current_dollar: number
}

interface MonthlyPoint { period: string; revenue: number }

const getDashboardStats = createServerFn({ method: 'GET' }).handler(async (): Promise<DashboardStats> => {
  const sb = getSupabaseServer()
  const { data: dollar } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  const dollarRate = dollar?.price ?? 1500

  const [
    { count: totalSales },
    { data: revenue },
    { data: loans },
    { count: customers },
  ] = await Promise.all([
    sb.from('sales').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    sb.from('sales').select('total_amount').is('deleted_at', null),
    sb.from('sales').select('total_remaining').gt('total_remaining', 0).is('deleted_at', null),
    sb.from('customers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  const totalRevenue     = revenue?.reduce((sum, r) => sum + (r.total_amount || 0), 0) ?? 0
  const outstandingLoans = loans?.reduce((sum, l) => sum + (l.total_remaining || 0), 0) ?? 0
  const avgSaleValue     = (totalSales ?? 0) > 0 ? totalRevenue / (totalSales ?? 1) : 0

  return {
    total_sales: totalSales ?? 0,
    total_revenue: totalRevenue,
    outstanding_loans: outstandingLoans,
    active_customers: customers ?? 0,
    average_sale_value: avgSaleValue,
    current_dollar: dollarRate,
  }
})

const getMonthlyRevenue = createServerFn({ method: 'GET' }).handler(async (): Promise<MonthlyPoint[]> => {
  const sb = getSupabaseServer()
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400_000).toISOString()
  const { data } = await sb
    .from('sales')
    .select('total_amount, sale_date')
    .gte('sale_date', sixMonthsAgo)
    .is('deleted_at', null)

  const byMonth = new Map<string, number>()
  for (const r of data ?? []) {
    const dt  = new Date(r.sale_date)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.total_amount))
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue }))
})

export const Route = createFileRoute('/app/dashboard')({ component: Dashboard })

interface KpiConfig {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}

function KpiCard({ label, value, sub, icon: Icon, color }: KpiConfig) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={cn('rounded-lg p-2.5 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold tracking-tight mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 60_000,
  })
  const { data: monthly } = useQuery({
    queryKey: ['dashboard-monthly'],
    queryFn: getMonthlyRevenue,
    refetchInterval: 60_000,
  })
  const { settings } = Route.useRouteContext()
  const currency = settings?.display_currency ?? 'IQD'
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.loading')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const kpis: KpiConfig[] = [
    {
      label: t('dashboard.totalSales'),
      value: stats.total_sales.toLocaleString(),
      sub: t('dashboard.allTimeTransactions'),
      icon: ShoppingCart,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: t('dashboard.totalRevenue'),
      value: formatCurrency(stats.total_revenue, currency),
      sub: currency !== 'USD' ? `≈ $${Math.round(stats.total_revenue / stats.current_dollar).toLocaleString()} USD` : undefined,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      label: t('dashboard.outstandingLoans'),
      value: formatCurrency(stats.outstanding_loans, currency),
      sub: t('dashboard.unpaidBalances'),
      icon: Wallet,
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      label: t('dashboard.activeCustomers'),
      value: stats.active_customers.toLocaleString(),
      sub: t('dashboard.registeredCustomers'),
      icon: Users,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      label: t('dashboard.avgSaleValue'),
      value: formatCurrency(stats.average_sale_value, currency),
      sub: t('dashboard.perTransaction'),
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      label: t('dashboard.usdExchangeRate'),
      value: formatCurrency(stats.current_dollar, currency),
      sub: t('dashboard.per1Usd'),
      icon: DollarSign,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {monthly && monthly.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.monthlyRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v, currency)} width={90} />
                <ChartTooltip
                  formatter={(value: number) => [formatCurrency(value, currency), t('dashboard.totalRevenue')]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

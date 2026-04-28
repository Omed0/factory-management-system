import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react'

import { getSupabaseServer } from '~/lib/supabase.server'
import { formatCurrency } from '~/lib/utils'
import { cn } from '~/lib/utils'

interface DashboardStats {
  total_sales: number
  total_revenue: number
  outstanding_loans: number
  active_customers: number
  average_sale_value: number
  current_dollar: number
}

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

  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.total_amount || 0), 0) ?? 0
  const outstandingLoans = loans?.reduce((sum, l) => sum + (l.total_remaining || 0), 0) ?? 0
  const avgSaleValue = (totalSales ?? 0) > 0 ? totalRevenue / (totalSales ?? 1) : 0

  return {
    total_sales: totalSales ?? 0,
    total_revenue: totalRevenue,
    outstanding_loans: outstandingLoans,
    active_customers: customers ?? 0,
    average_sale_value: avgSaleValue,
    current_dollar: dollarRate,
  }
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading overview…</p>
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
      label: 'Total Sales',
      value: stats.total_sales.toLocaleString(),
      sub: 'all-time transactions',
      icon: ShoppingCart,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.total_revenue, 'IQD'),
      sub: `≈ $${Math.round(stats.total_revenue / stats.current_dollar).toLocaleString()} USD`,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      label: 'Outstanding Loans',
      value: formatCurrency(stats.outstanding_loans, 'IQD'),
      sub: 'unpaid balances',
      icon: Wallet,
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      label: 'Active Customers',
      value: stats.active_customers.toLocaleString(),
      sub: 'registered customers',
      icon: Users,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      label: 'Avg Sale Value',
      value: formatCurrency(stats.average_sale_value, 'IQD'),
      sub: 'per transaction',
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      label: 'USD Exchange Rate',
      value: formatCurrency(stats.current_dollar, 'IQD'),
      sub: 'per 1 USD',
      icon: DollarSign,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Business overview at a glance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
    </div>
  )
}

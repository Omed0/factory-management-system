import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Printer } from 'lucide-react'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { formatCurrency } from '~/lib/utils'

type ReportKind = 'sales' | 'expenses' | 'purchases' | 'profit' | 'audit'

const Schema = z.object({
  kind: z.enum(['sales', 'expenses', 'purchases', 'profit', 'audit']),
  from: z.string(),
  to: z.string(),
})

interface ReportRow { period: string; total: number; count: number }

interface AuditResult {
  sales_count: number
  sales_billed: number
  sales_cash_collected: number
  sales_outstanding: number
  purchases_count: number
  purchases_billed: number
  purchases_cash_paid: number
  purchases_outstanding: number
  expenses_count: number
  expenses_total: number
  employee_count: number
  salary_total: number
  bonus_total: number
  deduction_total: number
  payroll_net: number
  cash_in: number
  cash_out: number
  net_balance: number
}

const runAudit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ from: z.string(), to: z.string() }).parse(d))
  .handler(async ({ data }): Promise<AuditResult> => {
    const sb = getSupabaseServer()
    const { data: ok } = await (sb.rpc as any)('has_permission', { p_resource: 'reports', p_action: 'view' })
    if (!ok) throw new Error('Forbidden')

    const from    = new Date(data.from)
    const to      = new Date(data.to + 'T23:59:59')
    const fromISO = from.toISOString()
    const toISO   = to.toISOString()

    const [salesRes, paidLoansRes, purchasesRes, purchPayRes, expensesRes, employeesRes, actionsRes] =
      await Promise.all([
        (sb.from('sales') as any).select('total_amount, total_remaining, sale_type')
          .gte('sale_date', fromISO).lte('sale_date', toISO).is('deleted_at', null),
        (sb.from('paid_loans') as any).select('amount')
          .gte('paid_at', fromISO).lte('paid_at', toISO),
        (sb.from('company_purchases') as any).select('total_amount, total_remaining, type')
          .gte('purchase_date', fromISO).lte('purchase_date', toISO).is('deleted_at', null),
        (sb.from('purchase_payments') as any).select('amount')
          .gte('paid_at', fromISO).lte('paid_at', toISO),
        (sb.from('expenses') as any).select('amount')
          .gte('created_at', fromISO).lte('created_at', toISO).is('deleted_at', null),
        (sb.from('employees') as any).select('month_salary, created_at, deleted_at'),
        (sb.from('employee_actions') as any).select('type, amount')
          .gte('action_date', fromISO).lte('action_date', toISO),
      ])

    // ── Sales ─────────────────────────────────────────────────────────────────
    const sales = (salesRes.data ?? []) as any[]
    const sales_billed      = sales.reduce((s, r) => s + Number(r.total_amount), 0)
    const sales_outstanding = sales.reduce((s, r) => s + Number(r.total_remaining), 0)
    const cash_sales        = sales.filter(r => r.sale_type === 'CASH').reduce((s, r) => s + Number(r.total_amount), 0)
    const loan_pmts_in      = ((paidLoansRes.data ?? []) as any[]).reduce((s, r) => s + Number(r.amount), 0)
    const sales_cash_collected = cash_sales + loan_pmts_in

    // ── Purchases ─────────────────────────────────────────────────────────────
    const purchases = (purchasesRes.data ?? []) as any[]
    const purchases_billed      = purchases.reduce((s, r) => s + Number(r.total_amount), 0)
    const purchases_outstanding = purchases.reduce((s, r) => s + Number(r.total_remaining), 0)
    const cash_purch            = purchases.filter(r => r.type === 'CASH').reduce((s, r) => s + Number(r.total_amount), 0)
    const purch_pmts_out        = ((purchPayRes.data ?? []) as any[]).reduce((s, r) => s + Number(r.amount), 0)
    const purchases_cash_paid   = cash_purch + purch_pmts_out

    // ── Expenses ──────────────────────────────────────────────────────────────
    const expenses_total = ((expensesRes.data ?? []) as any[]).reduce((s, r) => s + Number(r.amount), 0)

    // ── Payroll ───────────────────────────────────────────────────────────────
    const employees = (employeesRes.data ?? []) as Array<{ month_salary: number; created_at: string; deleted_at: string | null }>
    let salary_total   = 0
    let employee_count = 0
    for (const emp of employees) {
      const empStart = new Date(emp.created_at)
      const empEnd   = emp.deleted_at ? new Date(emp.deleted_at) : to
      if (empEnd <= from) continue
      employee_count++
      const overlapStart = empStart > from ? empStart : from
      const overlapEnd   = empEnd < to    ? empEnd   : to
      const days         = (overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000
      salary_total      += (days / 30.44) * Number(emp.month_salary)
    }

    const actions     = (actionsRes.data ?? []) as Array<{ type: string; amount: number }>
    let bonus_total     = 0
    let deduction_total = 0
    for (const a of actions) {
      if (a.type === 'BONUS' || a.type === 'OVERTIME') bonus_total     += Number(a.amount)
      else                                             deduction_total  += Number(a.amount)
    }

    const payroll_net = salary_total + bonus_total - deduction_total
    const cash_in     = sales_cash_collected
    const cash_out    = purchases_cash_paid + expenses_total + payroll_net

    return {
      sales_count: sales.length, sales_billed, sales_cash_collected, sales_outstanding,
      purchases_count: purchases.length, purchases_billed, purchases_cash_paid, purchases_outstanding,
      expenses_count: ((expensesRes.data ?? []) as any[]).length, expenses_total,
      employee_count, salary_total, bonus_total, deduction_total, payroll_net,
      cash_in, cash_out, net_balance: cash_in - cash_out,
    }
  })

const runReport = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }): Promise<ReportRow[]> => {
    const sb = getSupabaseServer()
    const { data: ok } = await (sb.rpc as any)('has_permission', { p_resource: 'reports', p_action: 'view' })
    if (!ok) throw new Error('Forbidden')

    const fromISO = new Date(data.from).toISOString()
    const toISO   = new Date(data.to + 'T23:59:59').toISOString()

    if (data.kind === 'profit') {
      const [salesRes, expRes, purRes] = await Promise.all([
        (sb.from('sales') as any).select('total_amount, sale_date').gte('sale_date', fromISO).lte('sale_date', toISO).is('deleted_at', null),
        (sb.from('expenses') as any).select('amount, created_at').gte('created_at', fromISO).lte('created_at', toISO).is('deleted_at', null),
        (sb.from('company_purchases') as any).select('total_amount, purchase_date').gte('purchase_date', fromISO).lte('purchase_date', toISO).is('deleted_at', null),
      ])

      type Acc = { sales: number; expenses: number; purchases: number; count: number }
      const byMonth = new Map<string, Acc>()
      const toKey = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
      const init  = (): Acc => ({ sales: 0, expenses: 0, purchases: 0, count: 0 })

      for (const r of (salesRes.data ?? []) as any[]) {
        const k = toKey(r.sale_date); const cur = byMonth.get(k) ?? init()
        cur.sales += Number(r.total_amount); cur.count++; byMonth.set(k, cur)
      }
      for (const r of (expRes.data ?? []) as any[]) {
        const k = toKey(r.created_at); const cur = byMonth.get(k) ?? init()
        cur.expenses += Number(r.amount); byMonth.set(k, cur)
      }
      for (const r of (purRes.data ?? []) as any[]) {
        const k = toKey(r.purchase_date); const cur = byMonth.get(k) ?? init()
        cur.purchases += Number(r.total_amount); byMonth.set(k, cur)
      }

      return [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, v]) => ({ period, total: v.sales - v.expenses - v.purchases, count: v.count }))
    }

    const table     = data.kind === 'sales' ? 'sales' : data.kind === 'expenses' ? 'expenses' : 'company_purchases'
    const amountCol = data.kind === 'expenses' ? 'amount' : 'total_amount'
    const dateCol   = data.kind === 'sales' ? 'sale_date' : data.kind === 'purchases' ? 'purchase_date' : 'created_at'

    const { data: rows, error } = await (sb.from(table) as any)
      .select(`${amountCol}, ${dateCol}`)
      .gte(dateCol, fromISO)
      .lte(dateCol, toISO)
      .is('deleted_at', null)
    if (error) throw new Error(error.message)

    const byMonth = new Map<string, { total: number; count: number }>()
    for (const r of rows ?? []) {
      const dt  = new Date((r as any)[dateCol])
      const k   = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
      const cur = byMonth.get(k) ?? { total: 0, count: 0 }
      cur.total += Number((r as any)[amountCol])
      cur.count += 1
      byMonth.set(k, cur)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, total: v.total, count: v.count }))
  })

export const Route = createFileRoute('/app/reports')({ component: ReportsPage })

function ReportsPage() {
  const { permissions, settings } = Route.useRouteContext()
  const { t } = useTranslation()
  const canView  = can(permissions, 'reports', 'view')
  const currency = settings?.display_currency ?? 'IQD'

  const today    = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)

  const [params, setParams]       = useState<{ kind: ReportKind; from: string; to: string }>({ kind: 'sales', from: monthAgo, to: today })
  const [submitted, setSubmitted] = useState(params)

  const isAudit = submitted.kind === 'audit'

  const report = useQuery({
    queryKey: ['report', submitted.kind, submitted.from, submitted.to],
    queryFn:  () => runReport({ data: submitted }),
    enabled:  canView && !isAudit,
  })

  const auditQ = useQuery({
    queryKey: ['audit', submitted.from, submitted.to],
    queryFn:  () => runAudit({ data: { from: submitted.from, to: submitted.to } }),
    enabled:  canView && isAudit,
  })

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">{t('reports.noPermission')}</p>
      </div>
    )
  }

  const rows       = report.data ?? []
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const grandCount = rows.reduce((s, r) => s + r.count, 0)
  const isProfit   = submitted.kind === 'profit'
  const isFetching = isAudit ? auditQ.isFetching : report.isFetching

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t('reports.print')}
        </Button>
      </div>

      <Card className="no-print">
        <CardHeader><CardTitle>{t('reports.filters')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="grid gap-1.5">
            <Label>{t('common.type')}</Label>
            <Select value={params.kind} onValueChange={(v) => setParams((p) => ({ ...p, kind: v as ReportKind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">{t('reports.salesOption')}</SelectItem>
                <SelectItem value="expenses">{t('reports.expensesOption')}</SelectItem>
                <SelectItem value="purchases">{t('reports.purchasesOption')}</SelectItem>
                <SelectItem value="profit">{t('reports.profitOption')}</SelectItem>
                <SelectItem value="audit">{t('reports.auditOption')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t('reports.from')}</Label>
            <Input type="date" value={params.from} onChange={(e) => setParams((p) => ({ ...p, from: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t('reports.to')}</Label>
            <Input type="date" value={params.to} onChange={(e) => setParams((p) => ({ ...p, to: e.target.value }))} />
          </div>
          <Button onClick={() => setSubmitted({ ...params })} disabled={isFetching}>
            {isFetching ? t('reports.running') : t('reports.run')}
          </Button>
        </CardContent>
      </Card>

      {isAudit ? (
        <div>
          {auditQ.isFetching ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : auditQ.isError ? (
            <p className="text-sm text-destructive">{(auditQ.error as Error).message}</p>
          ) : auditQ.data ? (
            <AuditView data={auditQ.data} currency={currency} t={t} from={submitted.from} to={submitted.to} />
          ) : null}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('reports.result')} — {t(`reports.${submitted.kind}Option`)} ({submitted.from} → {submitted.to})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.isFetching ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : report.isError ? (
              <p className="text-sm text-destructive">{(report.error as Error).message}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('reports.noRecords')}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('reports.grandTotal')}: <strong>{formatCurrency(grandTotal, currency)}</strong>
                  {!isProfit && <> — {grandCount} {t('reports.records')}</>}
                </p>

                <ResponsiveContainer width="100%" height={220} className="mb-6">
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v, currency)} width={90} />
                    <ChartTooltip
                      formatter={(value: unknown) => [formatCurrency(Number(value), currency), isProfit ? t('reports.profitOption') : t(`reports.${submitted.kind}Option`)]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="total" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start p-2">{t('reports.month')}</th>
                      {!isProfit && <th className="text-start p-2">{t('reports.count')}</th>}
                      <th className="text-start p-2">{isProfit ? t('reports.profitOption') : t('reports.totalIqd')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.period} className="border-t border-border">
                        <td className="p-2">{r.period}</td>
                        {!isProfit && <td className="p-2">{r.count}</td>}
                        <td className={`p-2 font-mono ${r.total < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(r.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <style>{`@media print { .no-print { display: none !important } }`}</style>
    </div>
  )
}

// ─── Audit View ───────────────────────────────────────────────────────────────

function AuditRow({ label, value, currency, sub, positive, negative, bold }: {
  label: string; value: number; currency: string
  sub?: boolean; positive?: boolean; negative?: boolean; bold?: boolean
}) {
  const cls = positive ? 'text-green-700 dark:text-green-400' : negative ? 'text-destructive' : ''
  return (
    <div className={`flex justify-between items-center py-1.5 ${sub ? 'ps-4 text-sm text-muted-foreground' : ''} ${bold ? 'font-semibold' : ''}`}>
      <span className={cls || (sub ? '' : 'text-foreground')}>{label}</span>
      <span className={`font-mono text-sm ${cls}`}>{formatCurrency(Math.abs(value), currency)}</span>
    </div>
  )
}

function AuditView({ data: d, currency, t, from, to }: {
  data: AuditResult; currency: string
  t: (k: string, o?: Record<string, unknown>) => string
  from: string; to: string
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('reports.auditOption')} — {from} → {to}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Revenue ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700 dark:text-green-400">{t('reports.revenueSection')}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <AuditRow label={`${t('reports.salesBilled')} (${d.sales_count})`}         value={d.sales_billed}          currency={currency} />
            <AuditRow label={t('reports.salesReceived')} value={d.sales_cash_collected} currency={currency} sub positive />
            <AuditRow label={t('reports.salesOutstanding')} value={d.sales_outstanding} currency={currency} sub />
          </CardContent>
        </Card>

        {/* ── Costs ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">{t('reports.costsSection')}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <AuditRow label={`${t('reports.purchasesBilled')} (${d.purchases_count})`} value={d.purchases_billed}        currency={currency} />
            <AuditRow label={t('reports.purchasesPaid')}  value={d.purchases_cash_paid}    currency={currency} sub negative />
            <AuditRow label={t('reports.purchasesOwed')}  value={d.purchases_outstanding}  currency={currency} sub />
            <AuditRow label={`${t('reports.expensesSection')} (${d.expenses_count})`}  value={d.expenses_total}          currency={currency} negative />
            <AuditRow label={`${t('reports.payrollEst')} (${t('reports.employeeCount', { count: d.employee_count })})`}
                      value={d.payroll_net} currency={currency} negative />
            <AuditRow label={t('reports.salaryEst')}      value={d.salary_total}    currency={currency} sub />
            <AuditRow label={t('reports.bonuses')}        value={d.bonus_total}     currency={currency} sub />
            <AuditRow label={t('reports.deductions')}     value={d.deduction_total} currency={currency} sub />
            <AuditRow label={t('reports.payrollNet')}     value={d.payroll_net}     currency={currency} sub bold />
          </CardContent>
        </Card>
      </div>

      {/* ── Cash Flow Summary ── */}
      <Card className={`border-2 ${d.net_balance >= 0 ? 'border-green-500' : 'border-destructive'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('reports.cashFlowSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <AuditRow label={t('reports.netCashIn')}  value={d.cash_in}  currency={currency} positive bold />
          <AuditRow label={t('reports.netCashOut')} value={d.cash_out} currency={currency} negative bold />
          <div className={`flex justify-between items-center py-3 font-bold text-lg ${d.net_balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
            <span>{t('reports.netBalance')}</span>
            <span className="font-mono">{formatCurrency(d.net_balance, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('reports.salaryNote')}</p>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useState } from 'react';

import { getSupabaseServer } from '~/lib/supabase.server';
import { can } from '~/lib/auth';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { formatCurrency } from '~/lib/utils';

type ReportKind = 'sales' | 'expenses' | 'purchases';

const Schema = z.object({
  kind: z.enum(['sales', 'expenses', 'purchases']),
  from: z.string(),
  to: z.string(),
});

interface ReportRow { period: string; total: number; count: number; }

const runReport = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }): Promise<ReportRow[]> => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'reports', p_action: 'view' });
    if (!ok) throw new Error('Forbidden');

    const table = data.kind === 'sales' ? 'sales' : data.kind === 'expenses' ? 'expenses' : 'company_purchases';
    const amountCol = data.kind === 'expenses' ? 'amount' : 'total_amount';
    const dateCol   = data.kind === 'sales' ? 'sale_date' : data.kind === 'purchases' ? 'purchase_date' : 'created_at';

    const { data: rows, error } = await sb
      .from(table)
      .select(`${amountCol}, ${dateCol}`)
      .gte(dateCol, new Date(data.from).toISOString())
      .lte(dateCol, new Date(data.to + 'T23:59:59').toISOString())
      .is('deleted_at', null);
    if (error) throw new Error(error.message);

    const byMonth = new Map<string, { total: number; count: number }>();
    for (const r of rows ?? []) {
      const dt = new Date((r as any)[dateCol]);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { total: 0, count: 0 };
      cur.total += Number((r as any)[amountCol]);
      cur.count += 1;
      byMonth.set(key, cur);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, total: v.total, count: v.count }));
  });

export const Route = createFileRoute('/app/reports')({ component: ReportsPage });

function ReportsPage() {
  const { permissions } = Route.useRouteContext();
  const canView = can(permissions, 'reports', 'view');

  const today    = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [params, setParams]       = useState<{ kind: ReportKind; from: string; to: string }>({ kind: 'sales', from: monthAgo, to: today });
  const [submitted, setSubmitted] = useState(params);

  const report = useQuery({
    queryKey: ['report', submitted.kind, submitted.from, submitted.to],
    queryFn: () => runReport({ data: submitted }),
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You don't have permission to view reports.</p>
      </div>
    );
  }

  const grandTotal = (report.data ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={params.kind} onValueChange={(v) => setParams((p) => ({ ...p, kind: v as ReportKind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="purchases">Purchases</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Input type="date" value={params.from} onChange={(e) => setParams((p) => ({ ...p, from: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Input type="date" value={params.to} onChange={(e) => setParams((p) => ({ ...p, to: e.target.value }))} />
          </div>
          <Button onClick={() => setSubmitted({ ...params })} disabled={report.isFetching}>
            {report.isFetching ? 'Running…' : 'Run'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result — {submitted.kind} ({submitted.from} → {submitted.to})</CardTitle>
        </CardHeader>
        <CardContent>
          {report.isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : report.isError ? (
            <p className="text-sm text-destructive">{(report.error as Error).message}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Grand total: <strong>{formatCurrency(grandTotal, 'IQD')}</strong>
                {' '}— {(report.data ?? []).reduce((s, r) => s + r.count, 0)} records
              </p>
              {(report.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No records in this date range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start p-2">Month</th>
                      <th className="text-start p-2">Count</th>
                      <th className="text-start p-2">Total (IQD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.data ?? []).map((r) => (
                      <tr key={r.period} className="border-t border-border">
                        <td className="p-2">{r.period}</td>
                        <td className="p-2">{r.count}</td>
                        <td className="p-2 font-mono">{formatCurrency(r.total, 'IQD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

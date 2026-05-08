import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Printer } from "lucide-react";

import { getSupabaseServer } from "~/lib/supabase.server";
import { can } from "~/lib/auth";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { formatMoney } from "~/lib/currency";

type ReportKind = "sales" | "expenses" | "purchases" | "profit" | "audit";
type SimpleKind = "sales" | "expenses" | "purchases";

const DateRangeSchema = z.object({ from: z.string(), to: z.string() });
const Schema = z.object({
  kind: z.enum(["sales", "expenses", "purchases"]),
  from: z.string(),
  to: z.string(),
});

interface ReportRow {
  period: string;
  total: number;
  count: number;
}
interface TopProduct {
  name: string;
  total_qty: number;
  total_revenue: number;
}
interface TopCustomer {
  name: string;
  count: number;
  total: number;
}
interface ExpenseCategory {
  category: string;
  total: number;
}
interface DollarPoint {
  recorded_at: string;
  price: number;
}

interface ProfitRow {
  period: string;
  accrual: number;
  cash: number;
  count: number;
}

interface PayrollEmployee {
  name: string;
  days: number;
  monthly_salary: number;
  prorated: number;
}

interface AuditResult {
  sales_count: number;
  sales_billed: number;
  sales_cash_collected: number;
  sales_outstanding: number;
  purchases_count: number;
  purchases_billed: number;
  purchases_cash_paid: number;
  purchases_outstanding: number;
  expenses_count: number;
  expenses_total: number;
  employee_count: number;
  salary_total: number;
  bonus_total: number;
  deduction_total: number;
  payroll_net: number;
  cash_in: number;
  cash_out: number;
  net_balance: number;
  payroll_employees: PayrollEmployee[];
}

// ─── server fns ───────────────────────────────────────────────────────────────

const runAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateRangeSchema.parse(d))
  .handler(async ({ data }): Promise<AuditResult> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const from = new Date(data.from);
    const to = new Date(data.to + "T23:59:59");
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const [
      salesRes,
      paidLoansRes,
      purchasesRes,
      purchPayRes,
      expensesRes,
      employeesRes,
      actionsRes,
    ] = await Promise.all([
      (sb.from("sales") as any)
        .select("total_amount, total_remaining, sale_type")
        .gte("sale_date", fromISO)
        .lte("sale_date", toISO)
        .is("deleted_at", null),
      // J.1 fix: inner-join parent sale to exclude payments of soft-deleted sales.
      (sb.from("paid_loans") as any)
        .select("amount, sales!inner(deleted_at)")
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO)
        .is("sales.deleted_at", null),
      (sb.from("company_purchases") as any)
        .select("total_amount, total_remaining, type")
        .gte("purchase_date", fromISO)
        .lte("purchase_date", toISO)
        .is("deleted_at", null),
      // J.1 fix: same pattern for purchase_payments.
      (sb.from("purchase_payments") as any)
        .select("amount, company_purchases!inner(deleted_at)")
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO)
        .is("company_purchases.deleted_at", null),
      (sb.from("expenses") as any)
        .select("amount")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .is("deleted_at", null),
      (sb.from("employees") as any).select(
        "name, month_salary, created_at, deleted_at",
      ),
      (sb.from("employee_actions") as any)
        .select("type, amount")
        .gte("action_date", fromISO)
        .lte("action_date", toISO),
    ]);

    const sales = (salesRes.data ?? []) as any[];
    const sales_billed = sales.reduce((s, r) => s + Number(r.total_amount), 0);
    const sales_outstanding = sales.reduce(
      (s, r) => s + Number(r.total_remaining),
      0,
    );
    const cash_sales = sales
      .filter((r) => r.sale_type === "CASH")
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const loan_pmts_in = ((paidLoansRes.data ?? []) as any[]).reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const sales_cash_collected = cash_sales + loan_pmts_in;

    const purchases = (purchasesRes.data ?? []) as any[];
    const purchases_billed = purchases.reduce(
      (s, r) => s + Number(r.total_amount),
      0,
    );
    const purchases_outstanding = purchases.reduce(
      (s, r) => s + Number(r.total_remaining),
      0,
    );
    const cash_purch = purchases
      .filter((r) => r.type === "CASH")
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const purch_pmts_out = ((purchPayRes.data ?? []) as any[]).reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const purchases_cash_paid = cash_purch + purch_pmts_out;

    const expenses_total = ((expensesRes.data ?? []) as any[]).reduce(
      (s, r) => s + Number(r.amount),
      0,
    );

    const employees = (employeesRes.data ?? []) as Array<{
      name: string;
      month_salary: number;
      created_at: string;
      deleted_at: string | null;
    }>;
    let salary_total = 0;
    let employee_count = 0;
    const payroll_employees: PayrollEmployee[] = [];
    for (const emp of employees) {
      const empStart = new Date(emp.created_at);
      const empEnd = emp.deleted_at ? new Date(emp.deleted_at) : to;
      if (empEnd <= from) continue;
      employee_count++;
      const overlapStart = empStart > from ? empStart : from;
      const overlapEnd = empEnd < to ? empEnd : to;
      const days = Math.round(
        (overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000,
      );
      const prorated = (days / 30.44) * Number(emp.month_salary);
      salary_total += prorated;
      payroll_employees.push({
        name: emp.name,
        days,
        monthly_salary: Number(emp.month_salary),
        prorated,
      });
    }

    const actions = (actionsRes.data ?? []) as Array<{
      type: string;
      amount: number;
    }>;
    let bonus_total = 0;
    let deduction_total = 0;
    for (const a of actions) {
      if (a.type === "BONUS" || a.type === "OVERTIME")
        bonus_total += Number(a.amount);
      else if (a.type !== "TERMINATE")
        deduction_total += Number(a.amount);
    }

    const payroll_net = salary_total + bonus_total - deduction_total;
    const cash_in = sales_cash_collected;
    const cash_out = purchases_cash_paid + expenses_total + payroll_net;

    return {
      sales_count: sales.length,
      sales_billed,
      sales_cash_collected,
      sales_outstanding,
      purchases_count: purchases.length,
      purchases_billed,
      purchases_cash_paid,
      purchases_outstanding,
      expenses_count: ((expensesRes.data ?? []) as any[]).length,
      expenses_total,
      employee_count,
      salary_total,
      bonus_total,
      deduction_total,
      payroll_net,
      cash_in,
      cash_out,
      net_balance: cash_in - cash_out,
      payroll_employees,
    };
  });

const runReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }): Promise<ReportRow[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const table =
      data.kind === "sales"
        ? "sales"
        : data.kind === "expenses"
          ? "expenses"
          : "company_purchases";
    const amountCol = data.kind === "expenses" ? "amount" : "total_amount";
    const dateCol =
      data.kind === "sales"
        ? "sale_date"
        : data.kind === "purchases"
          ? "purchase_date"
          : "created_at";

    const { data: rows, error } = await (sb.from(table) as any)
      .select(`${amountCol}, ${dateCol}`)
      .gte(dateCol, fromISO)
      .lte(dateCol, toISO)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);

    const byMonth = new Map<string, { total: number; count: number }>();
    for (const r of rows ?? []) {
      const k = ((r as any)[dateCol] as string).slice(0, 7);
      const cur = byMonth.get(k) ?? { total: 0, count: 0 };
      cur.total += Number((r as any)[amountCol]);
      cur.count += 1;
      byMonth.set(k, cur);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, total: v.total, count: v.count }));
  });

const runProfitReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateRangeSchema.parse(d))
  .handler(async ({ data }): Promise<ProfitRow[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const [salesRes, paidLoansRes, expRes, purRes, purchPayRes] =
      await Promise.all([
        (sb.from("sales") as any)
          .select("total_amount, sale_type, sale_date")
          .gte("sale_date", fromISO)
          .lte("sale_date", toISO)
          .is("deleted_at", null),
        (sb.from("paid_loans") as any)
          .select("amount, paid_at, sales!inner(deleted_at)")
          .gte("paid_at", fromISO)
          .lte("paid_at", toISO)
          .is("sales.deleted_at", null),
        (sb.from("expenses") as any)
          .select("amount, created_at")
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .is("deleted_at", null),
        (sb.from("company_purchases") as any)
          .select("total_amount, type, purchase_date")
          .gte("purchase_date", fromISO)
          .lte("purchase_date", toISO)
          .is("deleted_at", null),
        (sb.from("purchase_payments") as any)
          .select("amount, paid_at, company_purchases!inner(deleted_at)")
          .gte("paid_at", fromISO)
          .lte("paid_at", toISO)
          .is("company_purchases.deleted_at", null),
      ]);

    type ProfitAcc = {
      accrual_in: number;
      accrual_out: number;
      cash_in: number;
      cash_out: number;
      count: number;
    };
    const byMonth = new Map<string, ProfitAcc>();
    const getOrInit = (k: string): ProfitAcc => {
      if (!byMonth.has(k))
        byMonth.set(k, {
          accrual_in: 0,
          accrual_out: 0,
          cash_in: 0,
          cash_out: 0,
          count: 0,
        });
      return byMonth.get(k)!;
    };

    for (const r of (salesRes.data ?? []) as any[]) {
      const k = (r.sale_date as string).slice(0, 7);
      const cur = getOrInit(k);
      cur.accrual_in += Number(r.total_amount);
      if (r.sale_type === "CASH") cur.cash_in += Number(r.total_amount);
      cur.count++;
    }
    for (const r of (paidLoansRes.data ?? []) as any[]) {
      const k = (r.paid_at as string).slice(0, 7);
      getOrInit(k).cash_in += Number(r.amount);
    }
    for (const r of (expRes.data ?? []) as any[]) {
      const k = (r.created_at as string).slice(0, 7);
      const cur = getOrInit(k);
      cur.accrual_out += Number(r.amount);
      cur.cash_out += Number(r.amount);
    }
    for (const r of (purRes.data ?? []) as any[]) {
      const k = (r.purchase_date as string).slice(0, 7);
      const cur = getOrInit(k);
      cur.accrual_out += Number(r.total_amount);
      if (r.type === "CASH") cur.cash_out += Number(r.total_amount);
    }
    for (const r of (purchPayRes.data ?? []) as any[]) {
      const k = (r.paid_at as string).slice(0, 7);
      getOrInit(k).cash_out += Number(r.amount);
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({
        period,
        accrual: v.accrual_in - v.accrual_out,
        cash: v.cash_in - v.cash_out,
        count: v.count,
      }));
  });

const getTopProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    DateRangeSchema.extend({ limit: z.number().default(10) }).parse(d),
  )
  .handler(async ({ data }): Promise<TopProduct[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const { data: salesData } = await (sb.from("sales") as any)
      .select("sale_items(quantity, unit_price, products(name))")
      .gte("sale_date", fromISO)
      .lte("sale_date", toISO)
      .is("deleted_at", null);

    const productMap = new Map<string, TopProduct>();
    for (const sale of (salesData ?? []) as any[]) {
      for (const item of (sale.sale_items ?? []) as any[]) {
        const name = item.products?.name ?? "Unknown";
        const cur = productMap.get(name) ?? {
          name,
          total_qty: 0,
          total_revenue: 0,
        };
        cur.total_qty += Number(item.quantity);
        cur.total_revenue += Number(item.quantity) * Number(item.unit_price);
        productMap.set(name, cur);
      }
    }
    return [...productMap.values()]
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, data.limit);
  });

const getTopCustomers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    DateRangeSchema.extend({ limit: z.number().default(10) }).parse(d),
  )
  .handler(async ({ data }): Promise<TopCustomer[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const { data: salesData } = await (sb.from("sales") as any)
      .select("total_amount, customers(name)")
      .gte("sale_date", fromISO)
      .lte("sale_date", toISO)
      .is("deleted_at", null);

    const customerMap = new Map<string, TopCustomer>();
    for (const sale of (salesData ?? []) as any[]) {
      const name = (sale.customers as any)?.name ?? "Walk-in";
      const cur = customerMap.get(name) ?? { name, count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(sale.total_amount);
      customerMap.set(name, cur);
    }
    return [...customerMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, data.limit);
  });

const getExpenseBreakdown = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateRangeSchema.parse(d))
  .handler(async ({ data }): Promise<ExpenseCategory[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const { data: expData } = await (sb.from("expenses") as any)
      .select("amount, category")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .is("deleted_at", null);

    const catMap = new Map<string, number>();
    for (const e of (expData ?? []) as any[]) {
      const cat = (e.category as string | null) ?? "Uncategorized";
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(e.amount));
    }
    return [...catMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([category, total]) => ({ category, total }));
  });

const getDollarHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateRangeSchema.parse(d))
  .handler(async ({ data }): Promise<DollarPoint[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "reports",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");

    const fromISO = new Date(data.from).toISOString();
    const toISO = new Date(data.to + "T23:59:59").toISOString();

    const { data: rows } = await (sb.from("dollar_history") as any)
      .select("price, recorded_at")
      .gte("recorded_at", fromISO)
      .lte("recorded_at", toISO)
      .order("recorded_at", { ascending: true });

    return (rows ?? []) as DollarPoint[];
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

const PIE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function ReportsPage() {
  const { permissions, settings, dollarRate = 1 } = Route.useRouteContext();
  const { t } = useTranslation();
  const canView = can(permissions, "reports", "view");
  const currency = settings?.base_currency ?? "IQD";
  const fmt = (n: number) => formatMoney(n, currency, dollarRate);

  const [params, setParams] = useState<{
    kind: ReportKind;
    from: string;
    to: string;
  }>({ kind: "sales", from: daysAgo(30), to: today() });
  const [submitted, setSubmitted] = useState(params);

  const isAudit = submitted.kind === "audit";
  const isProfit = submitted.kind === "profit";

  const report = useQuery({
    queryKey: ["report", submitted.kind, submitted.from, submitted.to],
    queryFn: () =>
      runReport({
        data: { ...submitted, kind: submitted.kind as SimpleKind },
      }),
    enabled: canView && !isAudit && !isProfit,
  });

  const profitQ = useQuery({
    queryKey: ["profit-report", submitted.from, submitted.to],
    queryFn: () =>
      runProfitReport({ data: { from: submitted.from, to: submitted.to } }),
    enabled: canView && isProfit,
  });

  const auditQ = useQuery({
    queryKey: ["audit", submitted.from, submitted.to],
    queryFn: () =>
      runAudit({ data: { from: submitted.from, to: submitted.to } }),
    enabled: canView && isAudit,
  });

  const topProductsQ = useQuery({
    queryKey: ["top-products", submitted.from, submitted.to],
    queryFn: () =>
      getTopProducts({
        data: { from: submitted.from, to: submitted.to, limit: 10 },
      }),
    enabled: canView,
  });

  const topCustomersQ = useQuery({
    queryKey: ["top-customers", submitted.from, submitted.to],
    queryFn: () =>
      getTopCustomers({
        data: { from: submitted.from, to: submitted.to, limit: 10 },
      }),
    enabled: canView,
  });

  const expBreakdownQ = useQuery({
    queryKey: ["expense-breakdown", submitted.from, submitted.to],
    queryFn: () =>
      getExpenseBreakdown({ data: { from: submitted.from, to: submitted.to } }),
    enabled: canView,
  });

  const dollarHistoryQ = useQuery({
    queryKey: ["dollar-history", submitted.from, submitted.to],
    queryFn: () =>
      getDollarHistory({ data: { from: submitted.from, to: submitted.to } }),
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">{t("reports.noPermission")}</p>
      </div>
    );
  }

  const rows = report.data ?? [];
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandCount = rows.reduce((s, r) => s + r.count, 0);
  const isFetching = isAudit
    ? auditQ.isFetching
    : isProfit
      ? profitQ.isFetching
      : report.isFetching;

  const QUICK_RANGES = [
    { label: t("reports.quickToday"), from: today(), to: today() },
    { label: t("reports.quickWeek"), from: daysAgo(6), to: today() },
    { label: t("reports.quickMonth"), from: daysAgo(29), to: today() },
    { label: t("reports.quick3Months"), from: daysAgo(89), to: today() },
    { label: t("reports.quickYear"), from: daysAgo(364), to: today() },
  ];

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("reports.print")}
        </Button>
      </div>

      {/* Quick-range buttons */}
      <div className="flex flex-wrap gap-2 no-print">
        {QUICK_RANGES.map((r) => (
          <Button
            key={r.label}
            variant={
              submitted.from === r.from && submitted.to === r.to
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              const next = { ...params, from: r.from, to: r.to };
              setParams(next);
              setSubmitted(next);
            }}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle>{t("reports.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="grid gap-1.5">
            <Label>{t("common.type")}</Label>
            <Select
              value={params.kind}
              onValueChange={(v) =>
                setParams((p) => ({ ...p, kind: v as ReportKind }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">
                  {t("reports.salesOption")}
                </SelectItem>
                <SelectItem value="expenses">
                  {t("reports.expensesOption")}
                </SelectItem>
                <SelectItem value="purchases">
                  {t("reports.purchasesOption")}
                </SelectItem>
                <SelectItem value="profit">
                  {t("reports.profitOption")}
                </SelectItem>
                <SelectItem value="audit">
                  {t("reports.auditOption")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("reports.from")}</Label>
            <Input
              type="date"
              value={params.from}
              onChange={(e) =>
                setParams((p) => ({ ...p, from: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("reports.to")}</Label>
            <Input
              type="date"
              value={params.to}
              onChange={(e) => setParams((p) => ({ ...p, to: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => setSubmitted({ ...params })}
            disabled={isFetching}
          >
            {isFetching ? t("reports.running") : t("reports.run")}
          </Button>
        </CardContent>
      </Card>

      {/* Main report */}
      {isAudit ? (
        <div>
          {auditQ.isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : auditQ.isError ? (
            <p className="text-sm text-destructive">
              {(auditQ.error as Error).message}
            </p>
          ) : auditQ.data ? (
            <AuditView
              data={auditQ.data}
              currency={currency}
              dollarRate={dollarRate}
              t={t}
              from={submitted.from}
              to={submitted.to}
            />
          ) : null}
        </div>
      ) : isProfit ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("reports.result")} — {t("reports.profitOption")} (
              {submitted.from} → {submitted.to})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profitQ.isFetching ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : profitQ.isError ? (
              <p className="text-sm text-destructive">
                {(profitQ.error as Error).message}
              </p>
            ) : !profitQ.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240} className="mb-6">
                  <AreaChart
                    data={profitQ.data}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="accrualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => fmt(v)}
                      width={90}
                    />
                    <ChartTooltip
                      formatter={(value: unknown, name: unknown) => [
                        fmt(Number(value)),
                        name === "accrual"
                          ? t("reports.accrualProfit")
                          : t("reports.cashProfit"),
                      ]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "accrual"
                          ? t("reports.accrualProfit")
                          : t("reports.cashProfit")
                      }
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="accrual"
                      stroke="var(--color-primary)"
                      fill="url(#accrualGrad)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      stroke="#22c55e"
                      fill="url(#cashGrad)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start p-2">{t("reports.month")}</th>
                      <th className="text-start p-2">
                        {t("reports.accrualProfit")}
                      </th>
                      <th className="text-start p-2">
                        {t("reports.cashProfit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitQ.data.map((r) => (
                      <tr key={r.period} className="border-t border-border">
                        <td className="p-2">{r.period}</td>
                        <td
                          className={`p-2 font-mono ${r.accrual < 0 ? "text-destructive" : ""}`}
                        >
                          {fmt(r.accrual)}
                        </td>
                        <td
                          className={`p-2 font-mono ${r.cash < 0 ? "text-destructive" : ""}`}
                        >
                          {fmt(r.cash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("reports.result")} — {t(`reports.${submitted.kind}Option`)} (
              {submitted.from} → {submitted.to})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.isFetching ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : report.isError ? (
              <p className="text-sm text-destructive">
                {(report.error as Error).message}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("reports.grandTotal")}:{" "}
                  <strong>{fmt(grandTotal)}</strong>{" "}
                  — {grandCount} {t("reports.records")}
                </p>
                <ResponsiveContainer width="100%" height={220} className="mb-6">
                  <LineChart
                    data={rows}
                    margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => fmt(v)}
                      width={90}
                    />
                    <ChartTooltip
                      formatter={(value: unknown) => [
                        fmt(Number(value)),
                        t(`reports.${submitted.kind}Option`),
                      ]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start p-2">{t("reports.month")}</th>
                      <th className="text-start p-2">{t("reports.count")}</th>
                      <th className="text-start p-2">
                        {t("reports.totalIqd")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.period} className="border-t border-border">
                        <td className="p-2">{r.period}</td>
                        <td className="p-2">{r.count}</td>
                        <td className="p-2 font-mono">
                          {fmt(r.total)}
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

      {/* ── Analytics section (always shown) ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("reports.topProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsQ.isFetching ? (
              <Skeleton className="h-48 w-full" />
            ) : !topProductsQ.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(140, topProductsQ.data.length * 30)}
              >
                <BarChart
                  layout="vertical"
                  data={topProductsQ.data}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => fmt(v)}
                    width={80}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <ChartTooltip
                    formatter={(value: unknown) =>
                      [
                        fmt(Number(value)),
                        t("reports.revenue"),
                      ] as [string, string]
                    }
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="total_revenue"
                    fill="var(--color-primary)"
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("reports.topCustomers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomersQ.isFetching ? (
              <Skeleton className="h-48 w-full" />
            ) : !topCustomersQ.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(140, topCustomersQ.data.length * 30)}
              >
                <BarChart
                  layout="vertical"
                  data={topCustomersQ.data}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => fmt(v)}
                    width={80}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <ChartTooltip
                    formatter={(value: unknown) =>
                      [
                        fmt(Number(value)),
                        t("reports.revenue"),
                      ] as [string, string]
                    }
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("reports.expenseBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expBreakdownQ.isFetching ? (
              <Skeleton className="h-48 w-full" />
            ) : !expBreakdownQ.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expBreakdownQ.data}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={
                      ((props: any) =>
                        `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as any
                    }
                    labelLine={false}
                  >
                    {expBreakdownQ.data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => value}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    formatter={(value: unknown) => [
                      fmt(Number(value)),
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Dollar Rate History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("reports.dollarHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dollarHistoryQ.isFetching ? (
              <Skeleton className="h-48 w-full" />
            ) : !dollarHistoryQ.data?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("reports.noRecords")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={dollarHistoryQ.data.map((p) => ({
                    ...p,
                    date: new Date(p.recorded_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    ),
                  }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={["auto", "auto"]}
                    width={70}
                  />
                  <ChartTooltip
                    formatter={(value: unknown) => [
                      `${Number(value).toLocaleString()} IQD`,
                      "1 USD",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`@media print { .no-print { display: none !important } }`}</style>
    </div>
  );
}

// ─── Audit View ───────────────────────────────────────────────────────────────

function AuditRow({
  label,
  value,
  currency,
  dollarRate = 1,
  sub,
  positive,
  negative,
  bold,
}: {
  label: string;
  value: number;
  currency: string;
  dollarRate?: number;
  sub?: boolean;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  const cls = positive
    ? "text-green-700 dark:text-green-400"
    : negative
      ? "text-destructive"
      : "";
  return (
    <div
      className={`flex justify-between items-center py-1.5 ${sub ? "ps-4 text-sm text-muted-foreground" : ""} ${bold ? "font-semibold" : ""}`}
    >
      <span className={cls || (sub ? "" : "text-foreground")}>{label}</span>
      <span className={`font-mono text-sm ${cls}`}>
        {formatMoney(Math.abs(value), currency, dollarRate)}
      </span>
    </div>
  );
}

function AuditView({
  data: d,
  currency,
  dollarRate = 1,
  t,
  from,
  to,
}: {
  data: AuditResult;
  currency: string;
  dollarRate?: number;
  t: (k: string, opts?: Record<string, unknown>) => string;
  from: string;
  to: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        {t("reports.auditOption")} — {from} → {to}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700 dark:text-green-400">
              {t("reports.revenueSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <AuditRow
              label={`${t("reports.salesBilled")} (${d.sales_count})`}
              value={d.sales_billed}
              currency={currency}
              dollarRate={dollarRate}
            />
            <AuditRow
              label={t("reports.salesReceived")}
              value={d.sales_cash_collected}
              currency={currency}
              dollarRate={dollarRate}
              sub
              positive
            />
            <AuditRow
              label={t("reports.salesOutstanding")}
              value={d.sales_outstanding}
              currency={currency}
              dollarRate={dollarRate}
              sub
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              {t("reports.costsSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <AuditRow
              label={`${t("reports.purchasesBilled")} (${d.purchases_count})`}
              value={d.purchases_billed}
              currency={currency}
              dollarRate={dollarRate}
            />
            <AuditRow
              label={t("reports.purchasesPaid")}
              value={d.purchases_cash_paid}
              currency={currency}
              dollarRate={dollarRate}
              sub
              negative
            />
            <AuditRow
              label={t("reports.purchasesOwed")}
              value={d.purchases_outstanding}
              currency={currency}
              dollarRate={dollarRate}
              sub
            />
            <AuditRow
              label={`${t("reports.expensesSection")} (${d.expenses_count})`}
              value={d.expenses_total}
              currency={currency}
              negative
            />
            <AuditRow
              label={`${t("reports.payrollEst")} (${t("reports.employeeCount", { count: d.employee_count })})`}
              value={d.payroll_net}
              currency={currency}
              negative
            />
            <AuditRow
              label={t("reports.salaryEst")}
              value={d.salary_total}
              currency={currency}
              dollarRate={dollarRate}
              sub
            />
            {d.payroll_employees.map((e, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-1 ps-8 text-xs text-muted-foreground"
              >
                <span>
                  {e.name}{" "}
                  <span className="opacity-60">
                    ({t("reports.proratedDays", { days: e.days })})
                  </span>
                </span>
                <span className="font-mono">
                  {formatMoney(e.prorated, currency, dollarRate)}
                </span>
              </div>
            ))}
            <AuditRow
              label={t("reports.bonuses")}
              value={d.bonus_total}
              currency={currency}
              dollarRate={dollarRate}
              sub
            />
            <AuditRow
              label={t("reports.deductions")}
              value={d.deduction_total}
              currency={currency}
              dollarRate={dollarRate}
              sub
            />
            <AuditRow
              label={t("reports.payrollNet")}
              value={d.payroll_net}
              currency={currency}
              dollarRate={dollarRate}
              sub
              bold
            />
          </CardContent>
        </Card>
      </div>

      <Card
        className={`border-2 ${d.net_balance >= 0 ? "border-green-500" : "border-destructive"}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("reports.cashFlowSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <AuditRow
            label={t("reports.netCashIn")}
            value={d.cash_in}
            currency={currency}
            positive
            bold
          />
          <AuditRow
            label={t("reports.netCashOut")}
            value={d.cash_out}
            currency={currency}
            negative
            bold
          />
          <div
            className={`flex justify-between items-center py-3 font-bold text-lg ${d.net_balance >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"}`}
          >
            <span>{t("reports.netBalance")}</span>
            <span className="font-mono">
              {formatMoney(d.net_balance, currency, dollarRate)}
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("reports.salaryNote")}</p>
    </div>
  );
}

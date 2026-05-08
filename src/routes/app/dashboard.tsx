import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSupabaseServer } from "~/lib/supabase.server";
import { requireUser, warehouseFilter } from "~/lib/auth";
import { formatMoney } from "~/lib/currency";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface DashboardStats {
  total_sales: number;
  total_revenue: number;
  outstanding_loans: number;
  outstanding_payables: number;
  active_customers: number;
  average_sale_value: number;
  current_dollar: number;
}

interface MonthlyPoint {
  period: string;
  revenue: number;
}

interface RecentTx {
  id: string;
  type: "sale" | "purchase" | "expense";
  label: string;
  amount: number;
  date: string;
}

interface LowStockItem {
  qty: number;
  product_name: string;
  warehouse_name: string;
}

interface TopProduct {
  name: string;
  total_revenue: number;
  total_qty: number;
}

// ─── server fns ───────────────────────────────────────────────────────────────

const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardStats> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);

    const { data: dollar } = await sb
      .from("dollar")
      .select("price")
      .eq("id", 1)
      .single<{ price: number }>();
    const dollarRate = dollar?.price ?? 1500;

    const buildSalesQ = () => {
      let q = sb.from("sales").select("*", { count: "exact", head: true }).is("deleted_at", null);
      if (wf) q = (q as any).in("warehouse_id", wf);
      return q;
    };
    const buildRevenueQ = () => {
      let q = sb.from("sales").select("total_amount").is("deleted_at", null);
      if (wf) q = (q as any).in("warehouse_id", wf);
      return q;
    };
    const buildLoansQ = () => {
      let q = sb.from("sales").select("total_remaining").gt("total_remaining", 0).is("deleted_at", null);
      if (wf) q = (q as any).in("warehouse_id", wf);
      return q;
    };
    const buildPayablesQ = () => {
      let q = (sb.from("company_purchases") as any).select("total_remaining").gt("total_remaining", 0).is("deleted_at", null);
      if (wf) q = q.in("warehouse_id", wf);
      return q;
    };

    const [
      { count: totalSales },
      { data: revenue },
      { data: loans },
      { count: customers },
    ] = await Promise.all([
      buildSalesQ(),
      buildRevenueQ(),
      buildLoansQ(),
      sb
        .from("customers")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
    ]);
    const { data: payables } = await buildPayablesQ();

    const totalRevenue = ((revenue ?? []) as any[]).reduce(
      (sum, r) => sum + Number(r.total_amount),
      0,
    );
    const outstandingLoans = ((loans ?? []) as any[]).reduce(
      (sum, l) => sum + Number(l.total_remaining),
      0,
    );
    const outstandingPayables = ((payables ?? []) as any[]).reduce(
      (sum, r) => sum + Number(r.total_remaining),
      0,
    );
    const avgSaleValue =
      (totalSales ?? 0) > 0 ? totalRevenue / (totalSales ?? 1) : 0;

    return {
      total_sales: totalSales ?? 0,
      total_revenue: totalRevenue,
      outstanding_loans: outstandingLoans,
      outstanding_payables: outstandingPayables,
      active_customers: customers ?? 0,
      average_sale_value: avgSaleValue,
      current_dollar: dollarRate,
    };
  },
);

const getMonthlyRevenue = createServerFn({ method: "GET" }).handler(
  async (): Promise<MonthlyPoint[]> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400_000).toISOString();
    let q = sb
      .from("sales")
      .select("total_amount, sale_date")
      .gte("sale_date", sixMonthsAgo)
      .is("deleted_at", null);
    if (wf) q = (q as any).in("warehouse_id", wf);
    const { data } = await q;

    const byMonth = new Map<string, number>();
    for (const r of (data ?? []) as Array<{
      sale_date: string;
      total_amount: number;
    }>) {
      const dt = new Date(r.sale_date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.total_amount));
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, revenue]) => ({ period, revenue }));
  },
);

const getRecentTransactions = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecentTx[]> => {
    const sb = getSupabaseServer();
    const [salesRes, purchRes, expRes] = await Promise.all([
      (sb.from("sales") as any)
        .select("id, sale_number, total_amount, sale_date")
        .is("deleted_at", null)
        .order("sale_date", { ascending: false })
        .limit(10),
      (sb.from("company_purchases") as any)
        .select("id, name, total_amount, purchase_date")
        .is("deleted_at", null)
        .order("purchase_date", { ascending: false })
        .limit(10),
      (sb.from("expenses") as any)
        .select("id, title, amount, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const txs: RecentTx[] = [
      ...((salesRes.data ?? []) as any[]).map((r) => ({
        id: `sale-${r.id}`,
        type: "sale" as const,
        label: r.sale_number ?? `#${r.id}`,
        amount: Number(r.total_amount),
        date: r.sale_date,
      })),
      ...((purchRes.data ?? []) as any[]).map((r) => ({
        id: `purch-${r.id}`,
        type: "purchase" as const,
        label: r.name,
        amount: Number(r.total_amount),
        date: r.purchase_date,
      })),
      ...((expRes.data ?? []) as any[]).map((r) => ({
        id: `exp-${r.id}`,
        type: "expense" as const,
        label: r.title,
        amount: Number(r.amount),
        date: r.created_at,
      })),
    ];
    return txs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  },
);

const getLowStockItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<LowStockItem[]> => {
    const sb = getSupabaseServer();
    const { data } = await (sb.from("warehouse_products") as any)
      .select("qty, products(name), warehouses(name)")
      .lt("qty", 10)
      .order("qty", { ascending: true })
      .limit(15);

    return ((data ?? []) as any[]).map((r) => ({
      qty: Number(r.qty),
      product_name: r.products?.name ?? "Unknown",
      warehouse_name: r.warehouses?.name ?? "Unknown",
    }));
  },
);

const getTopProductsToday = createServerFn({ method: "GET" }).handler(
  async (): Promise<TopProduct[]> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let salesQ = (sb.from("sales") as any)
      .select("sale_items(quantity, unit_price, products(name))")
      .gte("sale_date", todayStart.toISOString())
      .lte("sale_date", todayEnd.toISOString())
      .is("deleted_at", null);
    if (wf) salesQ = salesQ.in("warehouse_id", wf);
    const { data: salesData } = await salesQ;

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
      .slice(0, 5);
  },
);

interface CashVsLoan {
  cash: number;
  loan: number;
}

const getCashVsLoan = createServerFn({ method: "GET" }).handler(
  async (): Promise<CashVsLoan> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);
    let q = (sb.from("sales") as any)
      .select("total_amount, sale_type")
      .is("deleted_at", null);
    if (wf) q = q.in("warehouse_id", wf);
    const { data } = await q;
    let cash = 0;
    let loan = 0;
    for (const r of (data ?? []) as any[]) {
      if (r.sale_type === "CASH") cash += Number(r.total_amount);
      else loan += Number(r.total_amount);
    }
    return { cash, loan };
  },
);

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

interface KpiConfig {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}

function KpiCard({ label, value, sub, icon: Icon, color }: KpiConfig) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={cn("rounded-lg p-2.5 shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight mt-1 truncate">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 60_000,
  });
  const { data: monthly } = useQuery({
    queryKey: ["dashboard-monthly"],
    queryFn: getMonthlyRevenue,
    refetchInterval: 60_000,
  });
  const { data: recentTx } = useQuery({
    queryKey: ["dashboard-recent-tx"],
    queryFn: getRecentTransactions,
    refetchInterval: 60_000,
  });
  const { data: lowStock } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: getLowStockItems,
    refetchInterval: 60_000,
  });
  const { data: topToday } = useQuery({
    queryKey: ["dashboard-top-today"],
    queryFn: getTopProductsToday,
    refetchInterval: 60_000,
  });
  const { data: cashVsLoan } = useQuery({
    queryKey: ["dashboard-cash-vs-loan"],
    queryFn: getCashVsLoan,
    refetchInterval: 60_000,
  });

  const { settings, dollarRate = 1 } = Route.useRouteContext();
  const currency = settings?.base_currency ?? "IQD";
  const fmt = (n: number) => formatMoney(n, currency, dollarRate);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.loading")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis: KpiConfig[] = [
    {
      label: t("dashboard.totalSales"),
      value: stats.total_sales.toLocaleString(),
      sub: t("dashboard.allTimeTransactions"),
      icon: ShoppingCart,
      color: "bg-primary/10 text-primary",
    },
    {
      label: t("dashboard.totalRevenue"),
      value: fmt(stats.total_revenue),
      sub: undefined,
      icon: TrendingUp,
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      label: t("dashboard.outstandingLoans"),
      value: fmt(stats.outstanding_loans),
      sub: t("dashboard.unpaidBalances"),
      icon: Wallet,
      color:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    {
      label: t("dashboard.outstandingPayables"),
      value: fmt(stats.outstanding_payables),
      sub: t("dashboard.owedToSuppliers"),
      icon: Wallet,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    {
      label: t("dashboard.activeCustomers"),
      value: stats.active_customers.toLocaleString(),
      sub: t("dashboard.registeredCustomers"),
      icon: Users,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      label: t("dashboard.avgSaleValue"),
      value: fmt(stats.average_sale_value),
      sub: t("dashboard.perTransaction"),
      icon: BarChart3,
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    {
      label: t("dashboard.usdExchangeRate"),
      value: `${(stats.current_dollar * 100).toLocaleString()} IQD`,
      sub: t("dashboard.per1Usd"),
      icon: DollarSign,
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
  ];

  const txTypeBadge: Record<string, string> = {
    sale: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    purchase:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    expense: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Monthly revenue chart */}
      {monthly && monthly.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.monthlyRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={monthly}
                margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0}
                    />
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
                  formatter={(value: unknown) =>
                    [
                      fmt(Number(value)),
                      t("dashboard.totalRevenue"),
                    ] as [string, string]
                  }
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  fill="url(#revGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent activity + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.recentTransactions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentTx?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center px-4">
                {t("dashboard.noRecentTx")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full",
                          txTypeBadge[tx.type],
                        )}
                      >
                        {t(`dashboard.tx_${tx.type}`)}
                      </span>
                      <span className="text-sm truncate">{tx.label}</span>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-mono font-medium">
                        {fmt(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CardTitle className="text-base">
              {t("dashboard.lowStock")}
            </CardTitle>
            {lowStock && lowStock.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {lowStock.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!lowStock?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center px-4">
                {t("dashboard.noLowStock")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {lowStock.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.warehouse_name}
                      </p>
                    </div>
                    <Badge
                      variant={item.qty === 0 ? "destructive" : "outline"}
                      className={cn(
                        "shrink-0 font-mono",
                        item.qty > 0 && item.qty < 5
                          ? "border-orange-400 text-orange-600"
                          : "",
                      )}
                    >
                      {item.qty}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 products today */}
      {topToday && topToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.topProductsToday")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(120, topToday.length * 34)}
            >
              <BarChart
                layout="vertical"
                data={topToday}
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
                  width={120}
                />
                <ChartTooltip
                  formatter={(value: unknown) => [
                    fmt(Number(value)),
                    t("dashboard.totalRevenue"),
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="total_revenue"
                  fill="var(--color-primary)"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Outstanding comparison + Cash vs Loan pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.outstandingComparison")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  {
                    name: t("dashboard.outstandingLoans"),
                    value: stats.outstanding_loans,
                  },
                  {
                    name: t("dashboard.outstandingPayables"),
                    value: stats.outstanding_payables,
                  },
                ]}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => fmt(v)}
                  width={90}
                />
                <ChartTooltip
                  formatter={(value: unknown) => [
                    fmt(Number(value)),
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  fill="#f97316"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {cashVsLoan && (cashVsLoan.cash > 0 || cashVsLoan.loan > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("dashboard.cashVsLoan")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t("sales.cash"), value: cashVsLoan.cash },
                      { name: t("sales.loan"), value: cashVsLoan.loan },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={
                      ((props: any) =>
                        `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as any
                    }
                    labelLine={false}
                  >
                    <Cell fill="var(--color-primary)" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <ChartTooltip
                    formatter={(value: unknown) => [
                      fmt(Number(value)),
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

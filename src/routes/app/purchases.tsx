import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { type ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Loader2, Plus, Printer, Trash2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSupabaseServer } from "~/lib/supabase.server";
import { can, requireUser, warehouseFilter } from "~/lib/auth";
import { qtyDisplay } from "~/lib/inventory";
import type { UserRole } from "~/lib/auth";
import type { SiteSettings } from "~/lib/site-settings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DataTable } from "~/components/data-table";
import {
  TextField,
  SelectField,
  TextAreaField,
} from "~/components/form-fields";
import { formatCurrency } from "~/lib/utils";
import { formatMoney } from "~/lib/currency";

// ─── types ───────────────────────────────────────────────────────────────────

interface Purchase {
  id: number;
  name: string;
  company_id: number | null;
  warehouse_id: number | null;
  total_amount: number;
  total_remaining: number;
  type: "CASH" | "LOAN";
  note: string | null;
  purchase_date: string;
  dollar: number;
  product_id: number | null;
  quantity: number | null;
  products: { name: string; grains_per_carton: number | null } | null;
}

interface PurchasePayment {
  id: number;
  amount: number;
  paid_at: string;
  note: string | null;
}

interface PurchaseDetail extends Purchase {
  company_name: string | null;
  company_phone: string | null;
  payments: PurchasePayment[];
  product_name: string | null;
  product_grains_per_carton: number | null;
}

// ─── print helpers ────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printHtml(html: string) {
  const w = window.open("", "_blank", "width=900");
  if (!w) {
    toast.error("Enable pop-ups in your browser to print");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  if (w.document.readyState === "complete") w.print();
  else w.onload = () => w.print();
}

function buildPurchaseInvoiceHtml(
  p: PurchaseDetail,
  settings: SiteSettings | null,
): string {
  const e = escapeHtml;
  const factory = e(settings?.factory_name ?? "Factory");
  const address = [settings?.address, settings?.city, settings?.country]
    .filter(Boolean)
    .map(e)
    .join(", ");
  const totalPaid = p.total_amount - p.total_remaining;
  const date = new Date(p.purchase_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paymentRows = p.payments
    .map(
      (pay) => `
    <tr>
      <td>${new Date(pay.paid_at).toLocaleDateString("en-US")}</td>
      <td style="text-align:right">${fmt(pay.amount)} IQD</td>
      <td>${e(pay.note ?? "")}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Purchase — ${p.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;padding:18mm 20mm}
.hd{text-align:center;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #111}
.hd h1{font-size:24px;font-weight:700}.hd .sub{font-size:11px;color:#555;margin-top:4px}
.title{font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:14px 0;text-align:center;color:#555}
.meta{display:flex;justify-content:space-between;margin-bottom:18px;gap:20px}
.meta-col p{margin:3px 0;font-size:12px}.lbl{color:#666;font-size:11px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
th{background:#f2f2f2;text-align:left;padding:7px 10px;border:1px solid #ddd;font-weight:600}
td{padding:6px 10px;border:1px solid #ddd}
.total-row td{font-weight:700;font-size:14px;background:#eee}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600}
.badge-loan{background:#fff3e0;color:#e65100}.badge-cash{background:#e8f5e9;color:#1b5e20}
.note-box{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:8px 12px;font-size:12px;margin-top:12px}
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666;margin:18px 0 6px}
.footer{margin-top:30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:10px}
@page{size:A4;margin:15mm}
@media print{body{overflow:visible!important;height:auto!important;padding:10mm 14mm}button{display:none!important}}
</style></head><body>
<div class="hd">
  <h1>${factory}</h1>
  <div class="sub">${[address, e(settings?.phone), e(settings?.email)].filter(Boolean).join(" | ")}</div>
</div>

<div class="title">Purchase Record</div>

<div class="meta">
  <div class="meta-col">
    <p><span class="lbl">Description</span></p>
    <p><strong>${e(p.name)}</strong></p>
    ${p.company_name ? `<p style="margin-top:8px"><span class="lbl">Supplier</span></p><p><strong>${e(p.company_name)}</strong></p>` : ""}
    ${p.company_phone ? `<p><span class="lbl">Phone</span> ${e(p.company_phone)}</p>` : ""}
  </div>
  <div class="meta-col" style="text-align:right">
    <p><span class="lbl">Date</span></p>
    <p><strong>${date}</strong></p>
    <p style="margin-top:8px"><span class="badge badge-${p.type === "LOAN" ? "loan" : "cash"}">${p.type}</span></p>
    <p style="margin-top:4px"><span class="lbl">USD rate:</span> ${fmt(p.dollar)}</p>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th style="text-align:right">Total amount</th></tr></thead>
  <tbody>
    <tr><td>${e(p.name)}</td><td style="text-align:right">${fmt(p.total_amount)} IQD</td></tr>
  </tbody>
  <tbody>
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmt(p.total_amount)} IQD</td></tr>
  </tbody>
</table>

${
  p.type === "LOAN"
    ? `
<div class="meta" style="margin-top:14px">
  <div><p class="lbl" style="margin-bottom:4px">Total paid</p><p style="font-size:15px;font-weight:700;color:#1b5e20">${fmt(totalPaid)} IQD</p></div>
  <div style="text-align:right"><p class="lbl" style="margin-bottom:4px">Remaining</p><p style="font-size:15px;font-weight:700;color:${p.total_remaining > 0 ? "#b71c1c" : "#1b5e20"}">${fmt(p.total_remaining)} IQD</p></div>
</div>

${
  p.payments.length > 0
    ? `
<div class="section-title">Payment history</div>
<table>
  <thead><tr><th>Date</th><th style="text-align:right">Amount</th><th>Note</th></tr></thead>
  <tbody>${paymentRows}</tbody>
</table>`
    : ""
}`
    : ""
}

${p.note ? `<div class="note-box"><strong>Note:</strong> ${e(p.note)}</div>` : ""}
<div class="footer">${factory}</div>
</body></html>`;
}

function buildPurchasePaymentReceiptHtml(
  payment: { amount: number; paid_at: string; note: string | null },
  purchase: Pick<
    PurchaseDetail,
    "name" | "total_remaining" | "company_name" | "company_phone" | "dollar"
  >,
  settings: SiteSettings | null,
): string {
  const e = escapeHtml;
  const factory = e(settings?.factory_name ?? "Factory");
  const address = [settings?.address, settings?.city, settings?.country]
    .filter(Boolean)
    .map(e)
    .join(", ");
  const balanceBefore = purchase.total_remaining + payment.amount;
  const date = new Date(payment.paid_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Receipt</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;padding:14mm 18mm;max-width:420px;margin:0 auto}
.hd{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:2px solid #111}
.hd h1{font-size:20px;font-weight:700}.hd .sub{font-size:11px;color:#555;margin-top:3px}
.title{font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:12px 0;text-align:center;color:#555}
.row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}
.row+.row{border-top:1px solid #eee}
.lbl{color:#666}.val{font-weight:600}
.big-row{display:flex;justify-content:space-between;padding:10px 0;margin:8px 0}
.amount{font-size:22px;font-weight:700;color:#1b5e20}
.balance-box{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:10px 14px;margin:14px 0}
.note-box{background:#fff3e0;border:1px solid #ffe0b2;border-radius:4px;padding:8px 12px;font-size:12px;margin-top:12px}
.footer{margin-top:24px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:10px}
@page{size:A4;margin:15mm}
@media print{body{overflow:visible!important;height:auto!important;padding:8mm 12mm}button{display:none!important}}
</style></head><body>
<div class="hd">
  <h1>${factory}</h1>
  <div class="sub">${[address, e(settings?.phone)].filter(Boolean).join(" | ")}</div>
</div>

<div class="title">Payment Receipt</div>

<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Purchase</span><span class="val">${e(purchase.name)}</span></div>
${purchase.company_name ? `<div class="row"><span class="lbl">Supplier</span><span class="val">${e(purchase.company_name)}</span></div>` : ""}
<div class="row"><span class="lbl">USD rate</span><span class="val">${fmt(purchase.dollar)}</span></div>

<div class="big-row">
  <span class="lbl" style="font-size:13px">Amount paid</span>
  <span class="amount">${fmt(payment.amount)} IQD</span>
</div>

<div class="balance-box">
  <div class="row"><span class="lbl">Balance before payment</span><span class="val">${fmt(balanceBefore)} IQD</span></div>
  <div class="row" style="border-top:1px solid #ddd"><span class="lbl">Balance after payment</span><span class="val" style="color:${purchase.total_remaining > 0 ? "#b71c1c" : "#1b5e20"}">${fmt(purchase.total_remaining)} IQD</span></div>
</div>

${payment.note ? `<div class="note-box"><strong>Note:</strong> ${e(payment.note)}</div>` : ""}
<div class="footer">${factory}</div>
</body></html>`;
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: "GET" }).handler(
  async (): Promise<Purchase[]> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);
    let q = (sb.from("company_purchases") as any)
      .select("*, products(name, grains_per_carton)")
      .is("deleted_at", null)
      .order("purchase_date", { ascending: false });
    if (wf) q = q.in("warehouse_id", wf);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data as Purchase[];
  },
);

const getPurchaseDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }): Promise<PurchaseDetail> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "purchases",
      p_action: "view",
    });
    if (!ok) throw new Error("forbidden");

    const [purchaseRes, paymentsRes] = await Promise.all([
      (sb.from("company_purchases") as any)
        .select("*, companies(name, phone), products(name, grains_per_carton)")
        .eq("id", data.id)
        .single(),
      (sb.from("purchase_payments") as any)
        .select("*")
        .eq("company_purchase_id", data.id)
        .order("paid_at"),
    ]);

    if (purchaseRes.error) throw new Error(purchaseRes.error.message);
    const p = purchaseRes.data as any;
    return {
      ...p,
      company_name: p.companies?.name ?? null,
      company_phone: p.companies?.phone ?? null,
      payments: (paymentsRes.data ?? []) as PurchasePayment[],
      product_name: p.products?.name ?? null,
      product_grains_per_carton: p.products?.grains_per_carton ?? null,
      products: p.products ?? null,
    };
  });

const listCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("companies")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as { id: number; name: string }[];
});

const getCurrentDollar = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("dollar")
    .select("price")
    .eq("id", 1)
    .single<{ price: number }>();
  return data?.price ?? 1500;
});

const listWarehouses = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getSupabaseServer();
  const me = await requireUser();
  const wf = warehouseFilter(me);
  let q = (sb.from("warehouses") as any)
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  if (wf) q = q.in("id", wf);
  const { data } = await q;
  return (data ?? []) as { id: number; name: string }[];
});

const listProductsByWarehouse = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ warehouse_id: z.number().nullable().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    if (data?.warehouse_id) {
      const { data: wp } = await (sb.from("warehouse_products") as any)
        .select("product_id, qty")
        .eq("warehouse_id", data.warehouse_id);
      const ids = ((wp ?? []) as any[]).map((r) => r.product_id);
      if (ids.length === 0) return [] as { id: number; name: string; grains_per_carton: number | null; qty: number }[];
      const { data: prods } = await sb
        .from("products")
        .select("id, name, grains_per_carton")
        .in("id", ids)
        .is("deleted_at", null)
        .order("name");
      const qtyMap: Record<number, number> = Object.fromEntries(
        ((wp ?? []) as any[]).map((r) => [r.product_id, r.qty]),
      );
      return ((prods ?? []) as any[]).map((p) => ({
        id: p.id as number,
        name: p.name as string,
        grains_per_carton: p.grains_per_carton as number | null,
        qty: qtyMap[p.id] ?? 0,
      }));
    }
    const { data: prods } = await sb
      .from("products")
      .select("id, name, grains_per_carton")
      .is("deleted_at", null)
      .order("name");
    return ((prods ?? []) as any[]).map((p) => ({
      id: p.id as number,
      name: p.name as string,
      grains_per_carton: p.grains_per_carton as number | null,
      qty: null as number | null,
    }));
  });

const PurchaseSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  company_id: z.number().nullable(),
  total_amount: z.coerce.number().positive(),
  type: z.enum(["CASH", "LOAN"]),
  note: z
    .string()
    .nullish()
    .transform((v) => v || null),
  purchase_date: z.string(),
  dollar: z.coerce.number().positive(),
  warehouse_id: z.number().nullable().optional(),
  product_id: z.number().nullable().optional(),
  quantity: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .transform((v) => v || null),
});

const upsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PurchaseSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "purchases",
      p_action: "write",
    });
    if (!ok) throw new Error("You do not have permission to manage purchases");
    const base = {
      name: data.name,
      company_id: data.company_id,
      total_amount: data.total_amount,
      type: data.type,
      note: data.note,
      purchase_date: new Date(data.purchase_date).toISOString(),
      dollar: data.dollar,
      warehouse_id: data.warehouse_id ?? null,
      product_id: data.product_id ?? null,
      quantity: data.quantity ?? null,
    };
    if (data.id) {
      const { error } = await (sb.from("company_purchases") as any)
        .update(base)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (sb.from("company_purchases") as any).insert({
        ...base,
        total_remaining: data.type === "LOAN" ? data.total_amount : 0,
      });
      if (error) throw new Error(error.message);
      if (data.warehouse_id && data.product_id && data.quantity) {
        const { error: adjErr } = await (sb.rpc as any)("adjust_warehouse_qty", {
          p_warehouse_id: data.warehouse_id,
          p_product_id: data.product_id,
          p_delta: data.quantity,
        });
        if (adjErr) throw new Error(adjErr.message);
      }
    }
  });

const PaySchema = z.object({
  purchase_id: z.number(),
  amount: z.coerce.number().positive(),
  note: z
    .string()
    .nullish()
    .transform((v) => v || null),
});

const recordPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PaySchema.parse(d))
  .handler(
    async ({
      data,
    }): Promise<{
      amount: number;
      paid_at: string;
      note: string | null;
      new_remaining: number;
    }> => {
      const sb = getSupabaseServer();
      const { data: ok } = await (sb.rpc as any)("has_permission", {
        p_resource: "purchases",
        p_action: "pay",
      });
      if (!ok) throw new Error("You do not have permission to record payments");
      const { data: p, error } = await (sb.from("company_purchases") as any)
        .select("total_remaining")
        .eq("id", data.purchase_id)
        .single();
      if (error || !p) throw new Error(error?.message ?? "not found");
      const remaining = Number(p.total_remaining) - data.amount;
      if (remaining < 0) throw new Error("Payment exceeds remaining balance");
      const paidAt = new Date().toISOString();
      const { error: payErr } = await (
        sb.from("purchase_payments") as any
      ).insert({
        company_purchase_id: data.purchase_id,
        amount: data.amount,
        paid_at: paidAt,
        note: data.note,
      });
      if (payErr) throw new Error(payErr.message);
      const { error: updErr } = await (sb.from("company_purchases") as any)
        .update({ total_remaining: remaining })
        .eq("id", data.purchase_id);
      if (updErr) throw new Error(updErr.message);
      return {
        amount: data.amount,
        paid_at: paidAt,
        note: data.note ?? null,
        new_remaining: remaining,
      };
    },
  );

const softDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    // Calls migration 0011 RPC. company_purchases has no inventory side-effects
    // today, so this is a thin wrapper with permission + idempotency checks.
    const { error } = await (sb.rpc as any)("soft_delete_purchase", {
      p_purchase_id: data.id,
    });
    if (error) throw new Error(error.message);
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/purchases")({
  validateSearch: (search: Record<string, unknown>) => ({
    company: search.company ? Number(search.company) : undefined,
  }),
  component: PurchasesPage,
});

// ─── page ─────────────────────────────────────────────────────────────────────

function PurchasesPage() {
  const { permissions = [], settings, profile, warehouseIds = [], dollarRate = 1 } =
    Route.useRouteContext() as {
      permissions: string[];
      settings: SiteSettings | null;
      profile: { role: UserRole } | undefined;
      warehouseIds: number[];
      dollarRate: number;
    };
  const currency = settings?.base_currency ?? "IQD";
  const fmt = (n: number) => formatMoney(n, currency, dollarRate);
  const qc = useQueryClient();
  const purchases = useQuery({ queryKey: ["purchases"], queryFn: list });
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const { t } = useTranslation();
  const { company: companyFilter } = Route.useSearch();
  const navigate = useNavigate();
  const companiesQ = useQuery({ queryKey: ["companies-mini"], queryFn: listCompanies });
  const activeCompany = companyFilter
    ? companiesQ.data?.find((c) => c.id === companyFilter)
    : null;

  const filtered = companyFilter
    ? (purchases.data ?? []).filter((p) => p.company_id === companyFilter)
    : (purchases.data ?? []);

  const canWrite = can(permissions, "purchases", "write");
  const canDelete = can(permissions, "purchases", "delete");
  const canPay = can(permissions, "purchases", "pay");

  const columns: ColumnDef<Purchase>[] = [
    { accessorKey: "name", header: t("common.description") },
    {
      accessorKey: "purchase_date",
      header: t("common.date"),
      size: 110,
      cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString(),
    },
    {
      accessorKey: "type",
      header: t("common.type"),
      size: 80,
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "LOAN" ? "outline" : "secondary"}>
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      id: "product_qty",
      header: t("purchases.product"),
      cell: ({ row }) => {
        const p = row.original;
        if (!p.products || !p.quantity) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {p.products.name}
            <span className="text-muted-foreground ms-1">
              ({qtyDisplay(p.quantity, p.products.grains_per_carton)})
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: t("common.total"),
      cell: ({ getValue }) => fmt(Number(getValue())),
    },
    {
      accessorKey: "total_remaining",
      header: t("purchases.remaining"),
      cell: ({ getValue }) => {
        const v = Number(getValue());
        return (
          <span
            className={
              v > 0
                ? "text-orange-600 dark:text-orange-400 font-medium"
                : "text-green-600 dark:text-green-400"
            }
          >
            {fmt(v)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 80,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            title={t("purchases.viewDetails")}
            onClick={() => setViewingId(row.original.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (
                  !confirm(
                    t("purchases.confirmDelete", { name: row.original.name }),
                  )
                )
                  return;
                try {
                  await softDelete({ data: { id: row.original.id } });
                  toast.success(t("purchases.purchaseRemoved"));
                  qc.invalidateQueries({ queryKey: ["purchases"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("purchases.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("purchases.subtitle", { count: purchases.data?.length ?? 0 })}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("purchases.addPurchase")}
          </Button>
        )}
      </div>

      {activeCompany && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("common.filteredBy")}:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-1 font-medium">
            {activeCompany.name}
            <button
              className="hover:text-destructive transition-colors"
              onClick={() => navigate({ to: "/app/purchases", search: { company: undefined } })}
              aria-label="Clear filter"
            >
              ×
            </button>
          </span>
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        searchKey="name"
        searchPlaceholder={t("purchases.searchPlaceholder")}
        emptyMessage={t("purchases.noPurchases")}
      />

      {creating && (
        <PurchaseDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["purchases"] });
            setCreating(false);
          }}
          userWarehouseIds={warehouseIds}
          userRole={profile?.role ?? "OWNER"}
        />
      )}

      {viewingId !== null && (
        <PurchaseDetailDialog
          purchaseId={viewingId}
          settings={settings}
          canPay={canPay}
          onClose={() => setViewingId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["purchases"] })}
        />
      )}
    </div>
  );
}

// ─── Purchase detail dialog ───────────────────────────────────────────────────

function PurchaseDetailDialog({
  purchaseId,
  settings,
  canPay,
  onClose,
  onUpdated,
}: {
  purchaseId: number;
  settings: SiteSettings | null;
  canPay: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const detail = useQuery({
    queryKey: ["purchase-detail", purchaseId],
    queryFn: () => getPurchaseDetail({ data: { id: purchaseId } }),
  });

  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number;
    paid_at: string;
    note: string | null;
  } | null>(null);

  const p = detail.data;

  const handlePaymentDone = (result: {
    amount: number;
    paid_at: string;
    note: string | null;
    new_remaining: number;
  }) => {
    setPaying(false);
    setReceipt({
      amount: result.amount,
      paid_at: result.paid_at,
      note: result.note,
    });
    onUpdated();
    detail.refetch();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {p ? p.name : t("common.loading")}
            {p && (
              <Badge variant={p.type === "LOAN" ? "outline" : "secondary"}>
                {p.type}
              </Badge>
            )}
            {p && p.type === "LOAN" && (
              <Badge
                variant={p.total_remaining === 0 ? "default" : "secondary"}
              >
                {p.total_remaining === 0
                  ? t("purchases.fullyPaid")
                  : t("purchases.outstanding")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {detail.isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {detail.isError && (
          <p className="text-sm text-destructive py-4">
            {t("purchases.loadFailed")}
          </p>
        )}

        {p && !paying && !receipt && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("common.date")}:{" "}
                </span>
                {new Date(p.purchase_date).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("purchases.usdRate")}:{" "}
                </span>
                {formatCurrency(p.dollar, "USD")}
              </div>
              {p.company_name && (
                <div>
                  <span className="text-muted-foreground">
                    {t("purchases.supplier")}:{" "}
                  </span>
                  <strong>{p.company_name}</strong>
                </div>
              )}
              {p.company_phone && (
                <div>
                  <span className="text-muted-foreground">
                    {t("common.phone")}:{" "}
                  </span>
                  {p.company_phone}
                </div>
              )}
              {p.product_name && p.quantity && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("purchases.product")}: </span>
                  <strong>{p.product_name}</strong>
                  <span className="text-muted-foreground ms-1">
                    ({qtyDisplay(p.quantity, p.product_grains_per_carton)})
                  </span>
                </div>
              )}
              {p.note && (
                <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs mt-1">
                  <span className="font-medium">{t("common.note")}: </span>
                  {p.note}
                </div>
              )}
            </div>

            <Separator />

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>{t("purchases.totalAmount")}</span>
                <span>{fmt(p.total_amount)}</span>
              </div>
              {p.type === "LOAN" && (
                <>
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span>{t("purchases.paidSoFar")}</span>
                    <span>
                      {fmt(p.total_amount - p.total_remaining)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between font-semibold ${p.total_remaining > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
                  >
                    <span>{t("purchases.remaining")}</span>
                    <span>{fmt(p.total_remaining)}</span>
                  </div>
                </>
              )}
            </div>

            {p.type === "LOAN" && p.payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("purchases.paymentHistory")}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-72 text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-start pb-1 font-medium">
                          {t("common.date")}
                        </th>
                        <th className="text-end pb-1 font-medium">
                          {t("common.amount")}
                        </th>
                        <th className="text-start pb-1 font-medium pl-3">
                          {t("common.note")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.payments.map((pay) => (
                        <tr key={pay.id} className="border-t border-border">
                          <td className="py-1.5">
                            {new Date(pay.paid_at).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 text-end font-medium text-green-700 dark:text-green-400">
                            {fmt(pay.amount)}
                          </td>
                          <td className="py-1.5 pl-3 text-muted-foreground">
                            {pay.note ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printHtml(buildPurchaseInvoiceHtml(p, settings))}
              >
                <Printer className="h-4 w-4" /> {t("purchases.printRecord")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {t("common.close")}
                </Button>
                {canPay && p.type === "LOAN" && p.total_remaining > 0 && (
                  <Button onClick={() => setPaying(true)}>
                    <Wallet className="h-4 w-4" />{" "}
                    {t("purchases.recordPayment")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {paying && p && (
          <PurchasePayForm
            purchase={p}
            onCancel={() => setPaying(false)}
            onDone={handlePaymentDone}
          />
        )}

        {receipt && p && (
          <PurchaseReceipt
            payment={receipt}
            purchase={p}
            settings={settings}
            onClose={onClose}
            onPrint={() =>
              printHtml(buildPurchasePaymentReceiptHtml(receipt, p, settings))
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline pay form ──────────────────────────────────────────────────────────

function PurchasePayForm({
  purchase,
  onCancel,
  onDone,
}: {
  purchase: PurchaseDetail;
  onCancel: () => void;
  onDone: (r: {
    amount: number;
    paid_at: string;
    note: string | null;
    new_remaining: number;
  }) => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { amount: 0, note: "" },
    onSubmit: async ({ value }) => {
      try {
        const result = await recordPayment({
          data: {
            purchase_id: purchase.id,
            amount: value.amount,
            note: value.note,
          },
        });
        toast.success(t("purchases.paymentAdded"));
        onDone(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 border border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {t("purchases.purchaseLabel")}:{" "}
          <strong className="text-foreground">{purchase.name}</strong>{" "}
          &nbsp;·&nbsp;
          {t("purchases.remaining")}:{" "}
          <strong className="text-orange-600 dark:text-orange-400">
            {fmt(purchase.total_remaining)}
          </strong>
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <TextField
          form={form}
          name="amount"
          label={`${t("purchases.paidAmount")} (IQD)`}
          type="number"
          required
        />
        <TextAreaField
          form={form}
          name="note"
          label={`${t("common.note")} (${t("common.optional")})`}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {t("purchases.recordPayment")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Payment receipt view ─────────────────────────────────────────────────────

function PurchaseReceipt({
  payment,
  purchase,
  settings,
  onClose,
  onPrint,
}: {
  payment: { amount: number; paid_at: string; note: string | null };
  purchase: Pick<
    PurchaseDetail,
    "name" | "total_remaining" | "company_name" | "company_phone" | "dollar"
  >;
  settings: SiteSettings | null;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { t } = useTranslation();
  const balanceBefore = purchase.total_remaining + payment.amount;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {t("purchases.paidAmount")}
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {fmt(payment.amount)}
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">
              {t("purchases.purchaseLabel")}
            </p>
            <p className="font-medium">{purchase.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("common.date")}</p>
            <p className="font-medium">
              {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          </div>
          {purchase.company_name && (
            <div>
              <p className="text-muted-foreground text-xs">
                {t("purchases.supplier")}
              </p>
              <p className="font-medium">{purchase.company_name}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">
              {t("purchases.balanceBefore")}
            </p>
            <p className="font-medium">
              {fmt(balanceBefore)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">
              {t("purchases.remainingBalance")}
            </p>
            <p
              className={`font-semibold text-base ${purchase.total_remaining > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
            >
              {fmt(purchase.total_remaining)}
              {purchase.total_remaining === 0 &&
                ` ${t("purchases.fullyPaidLabel")}`}
            </p>
          </div>
          {payment.note && (
            <div className="col-span-2 rounded bg-muted px-2 py-1.5 text-xs">
              <span className="font-medium">{t("common.note")}: </span>
              {payment.note}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-4 w-4" /> {t("purchases.printReceipt")}
        </Button>
        <Button onClick={onClose}>{t("common.done")}</Button>
      </div>
    </div>
  );
}

// ─── New purchase dialog ──────────────────────────────────────────────────────

function PurchaseDialog({
  onClose,
  onSaved,
  userWarehouseIds = [],
  userRole = "OWNER",
}: {
  onClose: () => void;
  onSaved: () => void;
  userWarehouseIds?: number[];
  userRole?: UserRole;
}) {
  const { t } = useTranslation();
  const defaultWarehouseId =
    userRole === "USER" && userWarehouseIds.length === 1
      ? userWarehouseIds[0]
      : null;
  const hideWarehouseSelector =
    userRole === "USER" && userWarehouseIds.length === 1;

  const companies = useQuery({
    queryKey: ["companies-mini"],
    queryFn: listCompanies,
  });
  const dollarQ = useQuery({
    queryKey: ["dollar-rate"],
    queryFn: getCurrentDollar,
  });
  const warehousesQ = useQuery({
    queryKey: ["warehouses-mini"],
    queryFn: listWarehouses,
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(defaultWarehouseId ?? null);

  const productsQ = useQuery({
    queryKey: ["products-by-warehouse", selectedWarehouseId],
    queryFn: () => listProductsByWarehouse({ data: { warehouse_id: selectedWarehouseId } }),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      company_id: null as number | null,
      total_amount: 0,
      type: "CASH" as "CASH" | "LOAN",
      note: "",
      purchase_date: new Date().toISOString().slice(0, 10),
      dollar: dollarQ.data ?? 1500,
      warehouse_id: defaultWarehouseId as number | null,
      product_id: null as number | null,
      quantity: "" as unknown as number | null,
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value });
        toast.success(t("purchases.purchaseCreated"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("purchases.newPurchase")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <TextField
            form={form}
            name="name"
            label={t("common.description")}
            required
          />
          <form.Field name="company_id">
            {(f) => (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  {t("purchases.supplierCompany")}
                </label>
                <Select
                  value={f.state.value ? String(f.state.value) : ""}
                  onValueChange={(v) => f.handleChange(v ? Number(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("purchases.noneOption")} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.data?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              form={form}
              name="total_amount"
              label={`${t("common.total")} (IQD)`}
              type="number"
              required
            />
            <SelectField
              form={form}
              name="type"
              label={t("common.type")}
              options={[
                { value: "CASH" as const, label: t("purchases.cash") },
                { value: "LOAN" as const, label: t("purchases.loan") },
              ]}
            />
            <TextField
              form={form}
              name="purchase_date"
              label={t("common.date")}
              type="date"
              required
            />
            <TextField
              form={form}
              name="dollar"
              label={t("purchases.usdRate")}
              type="number"
              required
            />
          </div>
          <TextAreaField form={form} name="note" label={t("common.note")} />
          {!hideWarehouseSelector && (warehousesQ.data?.length ?? 0) > 0 && (
            <form.Field name="warehouse_id">
              {(f) => (
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    {t("nav.warehouses")}
                  </label>
                  <Select
                    value={f.state.value ? String(f.state.value) : ""}
                    onValueChange={(v) => {
                      const wid = v ? Number(v) : null;
                      f.handleChange(wid);
                      setSelectedWarehouseId(wid);
                      form.setFieldValue("product_id", null);
                      form.setFieldValue("quantity", null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={`(${t("purchases.noneOption")})`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesQ.data?.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          )}

          {selectedWarehouseId && (productsQ.data?.length ?? 0) > 0 && (
            <>
              <form.Field name="product_id">
                {(f) => (
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">
                      {t("purchases.product")} ({t("common.optional")})
                    </label>
                    <Select
                      value={f.state.value ? String(f.state.value) : ""}
                      onValueChange={(v) => f.handleChange(v ? Number(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`(${t("purchases.noneOption")})`} />
                      </SelectTrigger>
                      <SelectContent>
                        {productsQ.data?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                            {p.qty != null && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                — {qtyDisplay(p.qty, p.grains_per_carton)}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              <form.Subscribe selector={(s) => s.values.product_id}>
                {(productId) =>
                  productId ? (
                    <form.Field name="quantity">
                      {(f) => {
                        const prod = productsQ.data?.find((p) => p.id === productId);
                        return (
                          <div className="grid gap-1.5">
                            <label className="text-sm font-medium">
                              {t("purchases.qty")}
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={f.state.value ?? ""}
                              onChange={(e) => f.handleChange(e.target.value ? Number(e.target.value) : null)}
                            />
                            {prod && f.state.value && (
                              <p className="text-xs text-muted-foreground">
                                {t("purchases.stockHint", {
                                  stock: qtyDisplay(prod.qty ?? 0, prod.grains_per_carton),
                                })}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    </form.Field>
                  ) : null
                }
              </form.Subscribe>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

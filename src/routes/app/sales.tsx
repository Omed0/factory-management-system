import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { type ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Loader2, Plus, Printer, Trash2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSupabaseServer } from "~/lib/supabase.server";
import { can, requireUser, warehouseFilter } from "~/lib/auth";
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
import { formatMoney, formatRecordMoney } from "~/lib/currency";
import { qtyDisplay } from "~/lib/inventory";
import { QtyInput } from "~/components/qty-input";

// ─── types ───────────────────────────────────────────────────────────────────

interface Sale {
  id: number;
  customer_id: number | null;
  sale_number: string;
  total_amount: number;
  total_remaining: number;
  sale_type: "CASH" | "LOAN";
  discount: number;
  monthly_paid: number;
  sale_date: string;
  is_finished: boolean;
  fast_sale: boolean;
  dollar: number;
  note: string | null;
}

interface SaleItem {
  id: number;
  product_id: number | null;
  name: string;
  price: number;
  quantity: number;
}

interface PaidLoan {
  id: number;
  amount: number;
  paid_at: string;
  note: string | null;
}

interface SaleDetail extends Sale {
  customer_name: string | null;
  customer_phone: string | null;
  items: SaleItem[];
  payments: PaidLoan[];
}

interface Item {
  product_id: number | null;
  name: string;
  price: number;
  quantity: number;
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
  w.document.body.innerHTML = html;
  w.focus();
  if (w.document.readyState === "complete") w.print();
  else w.onload = () => w.print();
}

function buildSaleInvoiceHtml(
  sale: SaleDetail,
  settings: SiteSettings | null,
): string {
  const e = escapeHtml;
  const factory = e(settings?.factory_name ?? "Factory");
  const address = [settings?.address, settings?.city, settings?.country]
    .filter(Boolean)
    .map(e)
    .join(", ");
  const taxId = settings?.tax_id ? `Tax ID: ${e(settings.tax_id)}` : "";
  const subtotal = sale.total_amount + sale.discount;
  const totalPaid = sale.total_amount - sale.total_remaining;
  const date = new Date(sale.sale_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemRows = sale.items
    .map(
      (it) => `
    <tr>
      <td>${e(it.name)}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">${fmt(it.price)} IQD</td>
      <td style="text-align:right">${fmt(it.price * it.quantity)} IQD</td>
    </tr>`,
    )
    .join("");

  const paymentRows = sale.payments
    .map(
      (p) => `
    <tr>
      <td>${new Date(p.paid_at).toLocaleDateString("en-US")}</td>
      <td style="text-align:right">${fmt(p.amount)} IQD</td>
      <td>${e(p.note ?? "")}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${sale.sale_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;padding:18mm 20mm}
.hd{text-align:center;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #111}
.hd h1{font-size:24px;font-weight:700;letter-spacing:-0.5px}
.hd .sub{font-size:11px;color:#555;margin-top:4px}
.title{font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:14px 0;text-align:center;color:#555}
.meta{display:flex;justify-content:space-between;margin-bottom:18px;gap:20px}
.meta-col p{margin:3px 0;font-size:12px}.meta-col .lbl{color:#666;font-size:11px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
th{background:#f2f2f2;text-align:left;padding:7px 10px;border:1px solid #ddd;font-weight:600}
td{padding:6px 10px;border:1px solid #ddd}
.totals td{background:#fafafa}.totals .lbl{color:#555;text-align:right}
.grand td{font-weight:700;font-size:14px;background:#eee}
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666;margin:18px 0 6px}
.note-box{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:8px 12px;font-size:12px;color:#444;margin-top:12px}
.footer{margin-top:30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:10px}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600}
.badge-loan{background:#fff3e0;color:#e65100}.badge-cash{background:#e8f5e9;color:#1b5e20}
@page{size:A4;margin:15mm}
@media print{body{overflow:visible!important;height:auto!important;padding:10mm 14mm}button{display:none!important}}
</style></head><body>
<div class="hd">
  <h1>${factory}</h1>
  <div class="sub">${[address, e(settings?.phone), e(settings?.email), taxId].filter(Boolean).join(" &nbsp;|&nbsp; ")}</div>
</div>

<div class="title">Sales Invoice</div>

<div class="meta">
  <div class="meta-col">
    <p><span class="lbl">Invoice #</span></p>
    <p><strong>${sale.sale_number}</strong></p>
    ${sale.customer_name ? `<p style="margin-top:8px"><span class="lbl">Customer</span></p><p><strong>${e(sale.customer_name)}</strong></p>` : ""}
    ${sale.customer_phone ? `<p><span class="lbl">Phone</span> ${e(sale.customer_phone)}</p>` : ""}
  </div>
  <div class="meta-col" style="text-align:right">
    <p><span class="lbl">Date</span></p>
    <p><strong>${date}</strong></p>
    <p style="margin-top:8px"><span class="badge badge-${sale.sale_type === "LOAN" ? "loan" : "cash"}">${sale.sale_type}</span></p>
    <p style="margin-top:4px"><span class="lbl">100 USD =</span> ${fmt(sale.dollar * 100)} IQD</p>
  </div>
</div>

<div class="section-title">Items</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit price</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${itemRows}</tbody>
  <tbody class="totals">
    ${sale.discount > 0
      ? `<tr><td class="lbl" colspan="3">Subtotal</td><td style="text-align:right">${fmt(subtotal)} IQD</td></tr>
    <tr><td class="lbl" colspan="3">Discount</td><td style="text-align:right; color:#b00">- ${fmt(sale.discount)} IQD</td></tr>`
      : ""
    }
    <tr class="grand"><td class="lbl" colspan="3">TOTAL</td><td style="text-align:right">${fmt(sale.total_amount)} IQD</td></tr>
  </tbody>
</table>

${sale.sale_type === "LOAN"
      ? `
<div class="meta" style="margin-top:14px">
  <div><p class="lbl" style="font-size:11px;margin-bottom:4px">Total paid</p><p style="font-size:15px;font-weight:700;color:#1b5e20">${fmt(totalPaid)} IQD</p></div>
  <div style="text-align:right"><p class="lbl" style="font-size:11px;margin-bottom:4px">Remaining</p><p style="font-size:15px;font-weight:700;color:${sale.total_remaining > 0 ? "#b71c1c" : "#1b5e20"}">${fmt(sale.total_remaining)} IQD</p></div>
</div>

${sale.payments.length > 0
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

${sale.note ? `<div class="note-box"><strong>Note:</strong> ${e(sale.note)}</div>` : ""}

<div class="footer">Thank you for your business &mdash; ${factory}</div>
</body></html>`;
}

function buildPaymentReceiptHtml(
  payment: { amount: number; paid_at: string; note: string | null },
  sale: Pick<
    SaleDetail,
    | "sale_number"
    | "total_remaining"
    | "customer_name"
    | "customer_phone"
    | "dollar"
  >,
  settings: SiteSettings | null,
): string {
  const e = escapeHtml;
  const factory = e(settings?.factory_name ?? "Factory");
  const address = [settings?.address, settings?.city, settings?.country]
    .filter(Boolean)
    .map(e)
    .join(", ");
  const balanceBefore = sale.total_remaining + payment.amount;
  const balanceAfter = sale.total_remaining;
  const date = new Date(payment.paid_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt — ${sale.sale_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;padding:14mm 18mm;max-width:420px;margin:0 auto}
.hd{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:2px solid #111}
.hd h1{font-size:20px;font-weight:700}
.hd .sub{font-size:11px;color:#555;margin-top:3px}
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
<div class="row"><span class="lbl">Invoice #</span><span class="val">${e(sale.sale_number)}</span></div>
${sale.customer_name ? `<div class="row"><span class="lbl">Customer</span><span class="val">${e(sale.customer_name)}</span></div>` : ""}
${sale.customer_phone ? `<div class="row"><span class="lbl">Phone</span><span class="val">${e(sale.customer_phone)}</span></div>` : ""}
<div class="row"><span class="lbl">100 USD =</span><span class="val">${fmt(sale.dollar * 100)} IQD</span></div>

<div class="big-row">
  <span class="lbl" style="font-size:13px">Amount paid</span>
  <span class="amount">${fmt(payment.amount)} IQD</span>
</div>

<div class="balance-box">
  <div class="row"><span class="lbl">Balance before payment</span><span class="val">${fmt(balanceBefore)} IQD</span></div>
  <div class="row" style="border-top:1px solid #ddd"><span class="lbl">Balance after payment</span><span class="val" style="color:${balanceAfter > 0 ? "#b71c1c" : "#1b5e20"}">${fmt(balanceAfter)} IQD</span></div>
</div>

${payment.note ? `<div class="note-box"><strong>Note:</strong> ${e(payment.note)}</div>` : ""}

<div class="footer">${factory}</div>
</body></html>`;
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: "GET" }).handler(
  async (): Promise<Sale[]> => {
    const sb = getSupabaseServer();
    const me = await requireUser();
    const wf = warehouseFilter(me);
    let q = sb
      .from("sales")
      .select("*")
      .is("deleted_at", null)
      .order("sale_date", { ascending: false });
    if (wf) q = (q as any).in("warehouse_id", wf);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data as Sale[];
  },
);

const getSaleDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }): Promise<SaleDetail> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "sales",
      p_action: "view",
    });
    if (!ok) throw new Error("forbidden");

    const [saleRes, itemsRes, loansRes] = await Promise.all([
      sb
        .from("sales" as any)
        .select("*, customers(name, phone)")
        .eq("id", data.id)
        .single(),
      sb
        .from("sale_items" as any)
        .select("*")
        .eq("sale_id", data.id)
        .order("id"),
      sb
        .from("paid_loans" as any)
        .select("*")
        .eq("sale_id", data.id)
        .order("paid_at"),
    ]);

    if (saleRes.error) throw new Error(saleRes.error.message);
    const s = saleRes.data as any;

    const me = await requireUser();
    const wf = warehouseFilter(me);
    if (wf && s.warehouse_id != null && !wf.includes(s.warehouse_id))
      throw new Error("forbidden: warehouse access");

    return {
      ...s,
      customer_name: s.customers?.name ?? null,
      customer_phone: s.customers?.phone ?? null,
      items: (itemsRes.data ?? []) as unknown as SaleItem[],
      payments: (loansRes.data ?? []) as unknown as PaidLoan[],
    };
  });

const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("customers")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as { id: number; name: string }[];
});

const ListProductsInput = z.object({
  warehouse_id: z.number().nullable().optional(),
});
const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => ListProductsInput.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    if (data?.warehouse_id) {
      const { data: wp } = await (sb.from("warehouse_products") as any)
        .select("product_id, qty")
        .eq("warehouse_id", data.warehouse_id);
      const ids = ((wp ?? []) as any[]).map((r) => r.product_id);
      if (ids.length === 0)
        return [] as {
          id: number;
          name: string;
          price: number;
          grains_per_carton: number | null;
          unit_type: "METER" | "PIECE";
          qty: number | null;
        }[];
      const { data: prods } = await sb
        .from("products")
        .select("id, name, price, grains_per_carton, unit_type")
        .in("id", ids)
        .is("deleted_at", null)
        .order("name");
      const qtyMap: Record<number, number> = Object.fromEntries(
        ((wp ?? []) as any[]).map((r) => [r.product_id, r.qty]),
      );
      return ((prods ?? []) as any[]).map((p) => ({
        id: p.id as number,
        name: p.name as string,
        price: p.price as number,
        grains_per_carton: p.grains_per_carton as number | null,
        unit_type: p.unit_type as "METER" | "PIECE",
        qty: qtyMap[p.id] ?? 0,
      }));
    }
    const { data: prods } = await sb
      .from("products")
      .select("id, name, price, grains_per_carton, unit_type")
      .is("deleted_at", null)
      .order("name");
    return ((prods ?? []) as any[]).map((p) => ({
      id: p.id as number,
      name: p.name as string,
      price: p.price as number,
      grains_per_carton: p.grains_per_carton as number | null,
      unit_type: p.unit_type as "METER" | "PIECE",
      qty: null as number | null,
    }));
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

const SaleSchema = z.object({
  customer_id: z.number().nullable(),
  sale_number: z.string().min(1),
  sale_type: z.enum(["CASH", "LOAN"]),
  discount: z.coerce.number().nonnegative().default(0),
  dollar: z.coerce.number().positive(),
  note: z
    .string()
    .nullish()
    .transform((v) => v || null),
  warehouse_id: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.number().nullable(),
        name: z.string().min(1),
        price: z.coerce.number().nonnegative(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

const createSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaleSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: id, error } = await (sb.rpc as any)("create_sale", {
      p_customer_id: data.customer_id,
      p_warehouse_id: data.warehouse_id ?? null,
      p_sale_number: data.sale_number,
      p_sale_type: data.sale_type,
      p_discount: data.discount,
      p_dollar: data.dollar,
      p_note: data.note,
      p_items: data.items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });
    if (error) throw new Error(error.message);
    return { ok: true, id: id as number };
  });

const PaySchema = z.object({
  sale_id: z.number(),
  amount: z.coerce.number().positive(),
  note: z
    .string()
    .nullish()
    .transform((v) => v || null),
});

const collectPayment = createServerFn({ method: "POST" })
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
        p_resource: "sales",
        p_action: "collect",
      });
      if (!ok)
        throw new Error("You do not have permission to collect payments");
      const { data: sale, error } = await (sb.from("sales") as any)
        .select("total_remaining")
        .eq("id", data.sale_id)
        .single();
      if (error || !sale) throw new Error(error?.message ?? "sale not found");
      const remaining = Number(sale.total_remaining) - data.amount;
      if (remaining < 0) throw new Error("Payment exceeds remaining balance");
      const paidAt = new Date().toISOString();
      const { error: payErr } = await (sb.from("paid_loans") as any).insert({
        sale_id: data.sale_id,
        amount: data.amount,
        paid_at: paidAt,
        note: data.note,
      });
      if (payErr) throw new Error(payErr.message);
      const { error: updErr } = await (sb.from("sales") as any)
        .update({
          total_remaining: remaining,
          is_finished: remaining === 0,
        })
        .eq("id", data.sale_id);
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
    // Calls migration 0011 RPC which: locks the row, reverses inventory
    // (adjust_warehouse_qty +qty per sale_item if warehouse_id set), then
    // sets deleted_at. Permission and idempotency are checked inside the RPC.
    const { error } = await (sb.rpc as any)("soft_delete_sale", {
      p_sale_id: data.id,
    });
    if (error) throw new Error(error.message);
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/sales")({ component: SalesPage });

// ─── page ─────────────────────────────────────────────────────────────────────

function SalesPage() {
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
  const fmtRow = (n: number, recordDollar: number | null | undefined) =>
    formatRecordMoney(n, currency, recordDollar, dollarRate);
  const qc = useQueryClient();
  const sales = useQuery({ queryKey: ["sales"], queryFn: list });
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const { t } = useTranslation();

  const canWrite = can(permissions, "sales", "write");
  const canDelete = can(permissions, "sales", "delete");

  const columns: ColumnDef<Sale>[] = [
    { accessorKey: "sale_number", header: "#", size: 100 },
    {
      accessorKey: "sale_date",
      header: t("common.date"),
      size: 110,
      cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString(),
    },
    {
      accessorKey: "sale_type",
      header: t("common.type"),
      size: 80,
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "LOAN" ? "outline" : "secondary"}>
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      accessorKey: "total_amount",
      header: t("common.total"),
      cell: ({ row, getValue }) =>
        fmtRow(Number(getValue()), row.original.dollar),
    },
    {
      accessorKey: "total_remaining",
      header: t("sales.remaining"),
      cell: ({ row, getValue }) => {
        const v = Number(getValue());
        return (
          <span
            className={
              v > 0
                ? "text-orange-600 dark:text-orange-400 font-medium"
                : "text-green-600 dark:text-green-400"
            }
          >
            {fmtRow(v, row.original.dollar)}
          </span>
        );
      },
    },
    {
      accessorKey: "is_finished",
      header: t("common.status"),
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "default" : "secondary"}>
          {getValue() ? t("sales.paid") : t("sales.pending")}
        </Badge>
      ),
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
            title={t("sales.viewDetails")}
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
                    t("sales.confirmDelete", {
                      number: row.original.sale_number,
                    }),
                  )
                )
                  return;
                try {
                  await softDelete({ data: { id: row.original.id } });
                  toast.success(t("sales.saleRemoved"));
                  qc.invalidateQueries({ queryKey: ["sales"] });
                  qc.invalidateQueries({ queryKey: ["sale-detail"] });
                  qc.invalidateQueries({ queryKey: ["product-stock"] });
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
            {t("sales.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("sales.subtitle", { count: sales.data?.length ?? 0 })}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("sales.addSale")}
          </Button>
        )}
      </div>

      <DataTable
        data={sales.data ?? []}
        columns={columns}
        searchKey="sale_number"
        searchPlaceholder={t("sales.searchPlaceholder")}
        emptyMessage={t("sales.noSales")}
      />

      {creating && (
        <SaleDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["sales"] });
            setCreating(false);
          }}
          userWarehouseIds={warehouseIds}
          userRole={profile?.role ?? "OWNER"}
        />
      )}

      {viewingId !== null && (
        <SaleDetailDialog
          saleId={viewingId}
          settings={settings}
          canCollect={can(permissions, "sales", "collect")}
          onClose={() => setViewingId(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ["sales"] });
            qc.invalidateQueries({ queryKey: ["sale-detail"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Sale detail dialog ───────────────────────────────────────────────────────

function SaleDetailDialog({
  saleId,
  settings,
  canCollect,
  onClose,
  onUpdated,
}: {
  saleId: number;
  settings: SiteSettings | null;
  canCollect: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const detail = useQuery({
    queryKey: ["sale-detail", saleId],
    queryFn: () => getSaleDetail({ data: { id: saleId } }),
  });

  const [collecting, setCollecting] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number;
    paid_at: string;
    note: string | null;
  } | null>(null);

  const sale = detail.data;

  const handlePaymentDone = (result: {
    amount: number;
    paid_at: string;
    note: string | null;
    new_remaining: number;
  }) => {
    setCollecting(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {sale
              ? `${t("sales.saleLabel")} ${sale.sale_number}`
              : t("common.loading")}
            {sale && (
              <Badge
                variant={sale.sale_type === "LOAN" ? "outline" : "secondary"}
              >
                {sale.sale_type}
              </Badge>
            )}
            {sale && (
              <Badge variant={sale.is_finished ? "default" : "secondary"}>
                {sale.is_finished ? t("sales.paid") : t("sales.pending")}
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
            {t("sales.loadFailed")}
          </p>
        )}

        {sale && !collecting && !receipt && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("common.date")}:{" "}
                </span>
                {new Date(sale.sale_date).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("common.usdRateLine", { rate: (sale.dollar * 100).toLocaleString() })}
                </span>
              </div>
              {sale.customer_name && (
                <div>
                  <span className="text-muted-foreground">
                    {t("sales.customer")}:{" "}
                  </span>
                  <strong>{sale.customer_name}</strong>
                </div>
              )}
              {sale.customer_phone && (
                <div>
                  <span className="text-muted-foreground">
                    {t("common.phone")}:{" "}
                  </span>
                  {sale.customer_phone}
                </div>
              )}
              {sale.note && (
                <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs mt-1">
                  <span className="font-medium">{t("common.note")}: </span>
                  {sale.note}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("sales.items")}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-90 text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-start pb-1 font-medium">
                        {t("common.description")}
                      </th>
                      <th className="text-center pb-1 font-medium w-14">
                        {t("sales.quantity")}
                      </th>
                      <th className="text-end pb-1 font-medium">
                        {t("sales.unitPrice")}
                      </th>
                      <th className="text-end pb-1 font-medium">
                        {t("common.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((it) => (
                      <tr key={it.id} className="border-t border-border">
                        <td className="py-1.5">{it.name}</td>
                        <td className="py-1.5 text-center">{it.quantity}</td>
                        <td className="py-1.5 text-end">
                          {fmt(it.price)}
                        </td>
                        <td className="py-1.5 text-end">
                          {fmt(it.price * it.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
              {sale.discount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("sales.subtotal")}
                    </span>
                    <span>
                      {fmt(sale.total_amount + sale.discount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("sales.discount")}
                    </span>
                    <span className="text-destructive">
                      − {fmt(sale.discount)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
                <span>{t("common.total")}</span>
                <span>{fmt(sale.total_amount)}</span>
              </div>
              {sale.sale_type === "LOAN" && (
                <>
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span>{t("sales.paidSoFar")}</span>
                    <span>
                      {fmt(sale.total_amount - sale.total_remaining)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between font-semibold ${sale.total_remaining > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
                  >
                    <span>{t("sales.remaining")}</span>
                    <span>{fmt(sale.total_remaining)}</span>
                  </div>
                </>
              )}
            </div>

            {sale.sale_type === "LOAN" && sale.payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("sales.paymentHistory")}
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
                      {sale.payments.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="py-1.5">
                            {new Date(p.paid_at).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 text-end font-medium text-green-700 dark:text-green-400">
                            {fmt(p.amount)}
                          </td>
                          <td className="py-1.5 pl-3 text-muted-foreground">
                            {p.note ?? "—"}
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
                onClick={() => printHtml(buildSaleInvoiceHtml(sale, settings))}
              >
                <Printer className="h-4 w-4" /> {t("sales.printInvoice")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {t("common.close")}
                </Button>
                {canCollect &&
                  sale.sale_type === "LOAN" &&
                  sale.total_remaining > 0 && (
                    <Button onClick={() => setCollecting(true)}>
                      <Wallet className="h-4 w-4" /> {t("sales.collectPayment")}
                    </Button>
                  )}
              </div>
            </div>
          </div>
        )}

        {collecting && sale && (
          <CollectForm
            sale={sale}
            onCancel={() => setCollecting(false)}
            onDone={handlePaymentDone}
          />
        )}

        {receipt && sale && (
          <PaymentReceipt
            payment={receipt}
            sale={sale}
            settings={settings}
            onClose={onClose}
            onPrint={() =>
              printHtml(buildPaymentReceiptHtml(receipt, sale, settings))
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline collect-payment form ──────────────────────────────────────────────

function CollectForm({
  sale,
  onCancel,
  onDone,
}: {
  sale: SaleDetail;
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
        const result = await collectPayment({
          data: { sale_id: sale.id, amount: value.amount, note: value.note },
        });
        toast.success(t("sales.paymentCollected"));
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
          {t("sales.saleLabel")}:{" "}
          <strong className="text-foreground">{sale.sale_number}</strong>{" "}
          &nbsp;·&nbsp;
          {t("sales.remaining")}:{" "}
          <strong className="text-orange-600 dark:text-orange-400">
            {fmt(sale.total_remaining)}
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
          label={`${t("sales.paidAmount")} (IQD)`}
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
            {t("sales.collectPayment")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Payment receipt view ─────────────────────────────────────────────────────

function PaymentReceipt({
  payment,
  sale,
  settings,
  onClose,
  onPrint,
}: {
  payment: { amount: number; paid_at: string; note: string | null };
  sale: Pick<
    SaleDetail,
    | "sale_number"
    | "total_remaining"
    | "customer_name"
    | "customer_phone"
    | "dollar"
  >;
  settings: SiteSettings | null;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { t } = useTranslation();
  const balanceBefore = sale.total_remaining + payment.amount;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {t("sales.paidAmount")}
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {fmt(payment.amount)}
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">
              {t("sales.invoice")}
            </p>
            <p className="font-medium">{sale.sale_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("common.date")}</p>
            <p className="font-medium">
              {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          </div>
          {sale.customer_name && (
            <div>
              <p className="text-muted-foreground text-xs">
                {t("sales.customer")}
              </p>
              <p className="font-medium">{sale.customer_name}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">
              {t("sales.balanceBefore")}
            </p>
            <p className="font-medium">
              {fmt(balanceBefore)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">
              {t("sales.remainingBalance")}
            </p>
            <p
              className={`font-semibold text-base ${sale.total_remaining > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
            >
              {fmt(sale.total_remaining)}
              {sale.total_remaining === 0 && ` ${t("sales.fullyPaidLabel")}`}
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
          <Printer className="h-4 w-4" /> {t("sales.printReceipt")}
        </Button>
        <Button onClick={onClose}>{t("common.done")}</Button>
      </div>
    </div>
  );
}

// ─── New sale dialog ──────────────────────────────────────────────────────────

function SaleDialog({
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

  const customers = useQuery({
    queryKey: ["customers-mini"],
    queryFn: listCustomers,
  });
  const dollarQ = useQuery({
    queryKey: ["dollar-rate"],
    queryFn: getCurrentDollar,
  });
  const warehousesQ = useQuery({
    queryKey: ["warehouses-mini"],
    queryFn: listWarehouses,
  });
  const [items, setItems] = useState<Item[]>([
    { product_id: null, name: "", price: 0, quantity: 1 },
  ]);
  const [discountMode, setDiscountMode] = useState<"IQD" | "PCT">("IQD");
  const [pctValue, setPctValue] = useState(0);

  const form = useForm({
    defaultValues: {
      customer_id: null as number | null,
      sale_number: `S-${Date.now()}`,
      sale_type: "CASH" as "CASH" | "LOAN",
      discount: 0,
      // Form holds per-100-USD value; we divide by 100 before submit so DB
      // keeps storing per-1-USD. Default = current rate × 100.
      dollar: (dollarQ.data ?? 1500) * 100,
      note: "",
      warehouse_id: defaultWarehouseId as number | null,
    },
    onSubmit: async ({ value }) => {
      if (items.some((i) => !i.name || i.quantity < 1)) {
        toast.error(t("sales.invalidItems"));
        return;
      }
      try {
        await createSale({
          data: { ...value, dollar: value.dollar / 100, items },
        });
        toast.success(t("sales.saleCreated"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });

  const selectedWarehouseId = useStore(
    form.store,
    (s) => s.values.warehouse_id,
  );
  const products = useQuery({
    queryKey: ["products-mini", selectedWarehouseId],
    queryFn: () =>
      listProducts({
        data: { warehouse_id: selectedWarehouseId ?? undefined },
      }),
  });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal - form.state.values.discount;
  const discountError =
    subtotal > 0 && form.state.values.discount > subtotal
      ? t("sales.discountExceedsTotal")
      : null;
  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-max max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("sales.newSale")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <form.Field name="customer_id">
              {(f) => (
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    {t("sales.customer")}
                  </label>
                  <Select
                    value={f.state.value ? String(f.state.value) : ""}
                    onValueChange={(v) => f.handleChange(v ? Number(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("sales.walkIn")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <TextField
              form={form}
              name="sale_number"
              label={t("sales.saleNumber")}
              required
            />
            <SelectField
              form={form}
              name="sale_type"
              label={t("common.type")}
              options={[
                { value: "CASH" as const, label: t("sales.cash") },
                { value: "LOAN" as const, label: t("sales.loan") },
              ]}
            />
          </div>
          {!hideWarehouseSelector && (warehousesQ.data?.length ?? 0) > 0 && (
            <form.Field name="warehouse_id">
              {(f) => (
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    {t("nav.warehouses")}
                  </label>
                  <Select
                    value={f.state.value ? String(f.state.value) : ""}
                    onValueChange={(v) => f.handleChange(v ? Number(v) : null)}
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

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t("sales.items")}</p>
            <div className="overflow-x-auto">
              <div className="min-w-160 space-y-1.5">
                <div className="grid grid-cols-[1fr_120px_200px_120px_36px] gap-2 text-xs text-muted-foreground px-1">
                  <span>{t("sales.product")}</span>
                  <span>{t("common.name")}</span>
                  <span>{t("sales.quantity")}</span>
                  <span>{t("sales.unitPrice")} (IQD)</span>
                  <span />
                </div>
                {items.map((it, i) => {
                  const prod = products.data?.find((p) => p.id === it.product_id);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_120px_200px_120px_36px] gap-2 items-center"
                    >
                      <Select
                        value={it.product_id ? String(it.product_id) : ""}
                        onValueChange={(v) => {
                          const p = products.data?.find(
                            (p) => String(p.id) === v,
                          );
                          if (p)
                            updateItem(i, {
                              product_id: p.id,
                              name: p.name,
                              price: p.price,
                              quantity: 0,
                            });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("sales.pickProduct")} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.data?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                              {p.qty != null && (
                                <span className="text-muted-foreground ms-1 text-xs">
                                  — {qtyDisplay(p.qty, p.grains_per_carton, p.unit_type, t)}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={it.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        placeholder={t("common.name")}
                      />
                      <QtyInput
                        compact
                        grainsPerCarton={prod?.grains_per_carton}
                        unitType={prod?.unit_type}
                        value={it.quantity}
                        onChange={(grains) =>
                          updateItem(i, { quantity: grains })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        value={it.price}
                        onChange={(e) =>
                          updateItem(i, { price: Number(e.target.value) })
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setItems((xs) => xs.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              {/* min-w-140 */}
            </div>
            {/* overflow-x-auto */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((xs) => [
                  ...xs,
                  { product_id: null, name: "", price: 0, quantity: 1 },
                ])
              }
            >
              <Plus className="h-3 w-3" /> {t("sales.addLine")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t("sales.discount")}
                </label>
                <div className="flex overflow-hidden rounded border border-input text-xs">
                  <button
                    type="button"
                    className={`px-2 py-0.5 transition-colors ${discountMode === "IQD" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => {
                      setDiscountMode("IQD");
                      setPctValue(0);
                      form.setFieldValue("discount", 0);
                    }}
                  >
                    IQD
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 transition-colors ${discountMode === "PCT" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setDiscountMode("PCT")}
                  >
                    %
                  </button>
                </div>
              </div>
              {discountMode === "PCT" ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={pctValue}
                  onChange={(e) => {
                    const pct = Math.min(
                      100,
                      Math.max(0, Number(e.target.value)),
                    );
                    setPctValue(pct);
                    form.setFieldValue(
                      "discount",
                      Math.round((pct / 100) * subtotal),
                    );
                  }}
                  placeholder="0"
                />
              ) : (
                <form.Field name="discount">
                  {(f) => (
                    <Input
                      type="number"
                      min={0}
                      value={f.state.value}
                      onChange={(e) => f.handleChange(Number(e.target.value))}
                    />
                  )}
                </form.Field>
              )}
              {discountError && (
                <p className="text-xs text-destructive">{discountError}</p>
              )}
            </div>
            <TextField
              form={form}
              name="dollar"
              label={`${t("sales.usdRate")} (${t("common.per100Usd")})`}
              type="number"
              required
            />
          </div>

          {form.state.values.discount > 0 && subtotal > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {t("sales.subtotal")}:
              </span>
              <span className="font-medium">{fmt(subtotal)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-destructive">
                − {fmt(form.state.values.discount)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">{fmt(Math.max(0, total))}</span>
            </div>
          )}

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">{t("common.total")}</label>
            <Input
              value={fmt(Math.max(0, total))}
              disabled
              className="bg-muted font-mono text-base font-semibold"
            />
          </div>

          <TextAreaField form={form} name="note" label={t("common.note")} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={form.state.isSubmitting || !!discountError}
            >
              {form.state.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("sales.createSale")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

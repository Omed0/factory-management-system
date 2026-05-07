import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowUpFromLine, Trash2 } from "lucide-react";

import { getSupabaseServer } from "~/lib/supabase.server";
import { can } from "~/lib/auth";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";

// ─── entity registry ─────────────────────────────────────────────────────────

type EntityKey =
  | "sales"
  | "purchases"
  | "customers"
  | "products"
  | "employees"
  | "expenses"
  | "companies"
  | "warehouses"
  | "profiles";

interface EntityConfig {
  table: string;
  selectCols: string; // identifier columns to display
  primary: "sales" | "purchases" | string; // identifier accessor key
  secondary?: string; // optional second column (e.g. amount)
  isUuid?: boolean;
}

const ENTITIES: Record<EntityKey, EntityConfig> = {
  sales: {
    table: "sales",
    selectCols: "id, sale_number, total_amount, deleted_at",
    primary: "sale_number",
    secondary: "total_amount",
  },
  purchases: {
    table: "company_purchases",
    selectCols: "id, name, total_amount, deleted_at",
    primary: "name",
    secondary: "total_amount",
  },
  customers: {
    table: "customers",
    selectCols: "id, name, phone, deleted_at",
    primary: "name",
    secondary: "phone",
  },
  products: {
    table: "products",
    selectCols: "id, name, price, deleted_at",
    primary: "name",
    secondary: "price",
  },
  employees: {
    table: "employees",
    selectCols: "id, name, phone, deleted_at",
    primary: "name",
    secondary: "phone",
  },
  expenses: {
    table: "expenses",
    selectCols: "id, title, amount, deleted_at",
    primary: "title",
    secondary: "amount",
  },
  companies: {
    table: "companies",
    selectCols: "id, name, phone, deleted_at",
    primary: "name",
    secondary: "phone",
  },
  warehouses: {
    table: "warehouses",
    selectCols: "id, name, location, deleted_at",
    primary: "name",
    secondary: "location",
  },
  profiles: {
    table: "profiles",
    selectCols: "id, name, role, deleted_at",
    primary: "name",
    secondary: "role",
    isUuid: true,
  },
};

const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

// ─── server fns ──────────────────────────────────────────────────────────────

interface TrashRow {
  id: number | string;
  identifier: string;
  secondary: string | number | null;
  deleted_at: string;
}

const ListSchema = z.object({
  entity: z.enum(ENTITY_KEYS as [EntityKey, ...EntityKey[]]),
});

const listTrashed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data }): Promise<TrashRow[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "trash",
      p_action: "manage",
    });
    if (!ok) throw new Error("You do not have permission to view trash");

    const cfg = ENTITIES[data.entity];
    const { data: rows, error } = await (sb.from(cfg.table) as any)
      .select(cfg.selectCols)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      identifier: String(r[cfg.primary] ?? "—"),
      secondary: cfg.secondary ? (r[cfg.secondary] ?? null) : null,
      deleted_at: r.deleted_at,
    }));
  });

const ActionSchema = z.object({
  entity: z.enum(ENTITY_KEYS as [EntityKey, ...EntityKey[]]),
  id: z.union([z.number(), z.string()]),
});

const restoreItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ActionSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "trash",
      p_action: "manage",
    });
    if (!ok) throw new Error("You do not have permission to manage trash");
    const cfg = ENTITIES[data.entity];
    const fn = cfg.isUuid ? "restore_record_uuid" : "restore_record";
    const { error } = await (sb.rpc as any)(fn, {
      p_entity: data.entity,
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
  });

const hardDeleteItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ActionSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await (sb.rpc as any)("has_permission", {
      p_resource: "trash",
      p_action: "manage",
    });
    if (!ok) throw new Error("You do not have permission to manage trash");
    const cfg = ENTITIES[data.entity];
    const fn = cfg.isUuid ? "hard_delete_record_uuid" : "hard_delete_record";
    const { error } = await (sb.rpc as any)(fn, {
      p_entity: data.entity,
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/settings/trash" as any)({
  component: TrashPage,
});

function TrashPage() {
  const ctx = Route.useRouteContext() as { permissions?: string[] };
  const permissions = ctx.permissions ?? [];
  const { t } = useTranslation();
  const [active, setActive] = useState<EntityKey>("sales");

  if (!can(permissions, "trash", "manage")) {
    return (
      <p className="text-sm text-muted-foreground">{t("trash.noPermission")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("trash.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("trash.subtitle")}</p>
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-border pb-2">
        {ENTITY_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              active === k
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {t(`trash.entity.${k}`)}
          </button>
        ))}
      </div>

      <TrashTab entity={active} />
    </div>
  );
}

function TrashTab({ entity }: { entity: EntityKey }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const items = useQuery({
    queryKey: ["trash", entity],
    queryFn: () => listTrashed({ data: { entity } }),
  });

  const onRestore = async (id: number | string, name: string) => {
    if (!confirm(t("trash.confirmRestore", { name }))) return;
    try {
      await restoreItem({ data: { entity, id } });
      toast.success(t("trash.restored"));
      qc.invalidateQueries({ queryKey: ["trash", entity] });
      // Sales restore may have re-deducted inventory and floored at 0 — warn the user.
      if (entity === "sales") {
        toast.message(t("trash.salesRestoreNote"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const onHardDelete = async (id: number | string, name: string) => {
    if (!confirm(t("trash.confirmHardDelete", { name }))) return;
    if (!confirm(t("trash.confirmHardDeleteAgain"))) return;
    try {
      await hardDeleteItem({ data: { entity, id } });
      toast.success(t("trash.hardDeleted"));
      qc.invalidateQueries({ queryKey: ["trash", entity] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {t(`trash.entity.${entity}`)}
          {items.data && <Badge variant="secondary">{items.data.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.isError ? (
          <p className="text-sm text-destructive">
            {(items.error as Error).message}
          </p>
        ) : (items.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("trash.empty")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase">
              <tr className="border-b border-border">
                <th className="text-start py-2 font-medium">
                  {t("trash.col.identifier")}
                </th>
                <th className="text-start py-2 font-medium">
                  {t("trash.col.detail")}
                </th>
                <th className="text-start py-2 font-medium">
                  {t("trash.col.deletedAt")}
                </th>
                <th className="text-end py-2 font-medium">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(items.data ?? []).map((row) => (
                <tr key={String(row.id)} className="border-b border-border/50">
                  <td className="py-2 font-medium">{row.identifier}</td>
                  <td className="py-2 text-muted-foreground">
                    {row.secondary !== null && row.secondary !== ""
                      ? String(row.secondary)
                      : "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(row.deleted_at).toLocaleString()}
                  </td>
                  <td className="py-2 text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRestore(row.id, row.identifier)}
                      >
                        <ArrowUpFromLine className="h-3.5 w-3.5" />{" "}
                        {t("trash.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onHardDelete(row.id, row.identifier)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />{" "}
                        {t("trash.hardDelete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

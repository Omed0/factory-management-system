import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { type ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users, Package, Boxes } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSupabaseServer } from "~/lib/supabase.server";
import { can, requireUser, warehouseFilter } from "~/lib/auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { DataTable } from "~/components/data-table";
import { TextField } from "~/components/form-fields";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { formatMoney } from "~/lib/currency";
import { qtyDisplay } from "~/lib/inventory";
import { QtyInput } from "~/components/qty-input";

// ─── types ───────────────────────────────────────────────────────────────────

interface Warehouse {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  user_count: number;
  product_count: number;
}

interface WarehouseUser {
  id: number;
  warehouse_id: number;
  profile_id: string;
  profile_name: string;
}

interface InventoryRow {
  id: number;
  warehouse_id: number;
  product_id: number;
  qty: number;
  product_name: string;
  grains_per_carton: number | null;
  unit_type: "METER" | "PIECE";
  product_price: number;
}

interface ProfileOption {
  id: string;
  name: string;
}

// ─── server fns ──────────────────────────────────────────────────────────────

const listWarehouses = createServerFn({ method: "GET" }).handler(
  async (): Promise<Warehouse[]> => {
    const sb = getSupabaseServer();
    const { data: ok } = await sb.rpc("has_permission", {
      p_resource: "warehouses",
      p_action: "view",
    });
    if (!ok) throw new Error("Forbidden");
    const me = await requireUser();
    const wf = warehouseFilter(me);
    let q = sb
      .from("warehouses")
      .select(
        "id, name, description, location, warehouse_users(count), warehouse_products(count)",
      )
      .is("deleted_at", null)
      .order("name");
    if (wf) q = (q as any).in("id", wf);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      location: w.location,
      user_count: (w.warehouse_users as { count: number }[])[0]?.count ?? 0,
      product_count:
        (w.warehouse_products as { count: number }[])[0]?.count ?? 0,
    }));
  },
);

const WarehouseSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2),
  description: z
    .string()
    .nullish()
    .transform((v) => v || null),
  location: z
    .string()
    .nullish()
    .transform((v) => v || null),
});

const upsertWarehouse = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WarehouseSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await sb.rpc("has_permission", {
      p_resource: "warehouses",
      p_action: "write",
    });
    if (!ok) throw new Error("Forbidden");
    const payload = {
      name: data.name,
      description: data.description,
      location: data.location,
    };
    if (data.id) {
      const { error } = await sb
        .from("warehouses")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("warehouses").insert(payload);
      if (error) throw new Error(error.message);
    }
  });

const softDeleteWarehouse = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await sb.rpc("has_permission", {
      p_resource: "warehouses",
      p_action: "delete",
    });
    if (!ok) throw new Error("Forbidden");
    const { error } = await sb
      .from("warehouses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const listWarehouseUsers = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ warehouse_id: z.number() }).parse(d),
  )
  .handler(async ({ data }): Promise<WarehouseUser[]> => {
    const sb = getSupabaseServer();
    const { data: rows, error } = await sb
      .from("warehouse_users")
      .select("id, warehouse_id, profile_id, profiles(name)")
      .eq("warehouse_id", data.warehouse_id);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      warehouse_id: r.warehouse_id,
      profile_id: r.profile_id,
      profile_name: r.profiles?.name ?? "—",
    }));
  });

const listAllProfiles = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProfileOption[]> => {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("profiles")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileOption[];
  },
);

const addWarehouseUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ warehouse_id: z.number(), profile_id: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await sb.rpc("has_permission", {
      p_resource: "warehouses",
      p_action: "write",
    });
    if (!ok) throw new Error("Forbidden");
    const { error } = await sb
      .from("warehouse_users")
      .insert({ warehouse_id: data.warehouse_id, profile_id: data.profile_id });
    if (error && !error.message.includes("unique"))
      throw new Error(error.message);
  });

const removeWarehouseUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { data: ok } = await sb.rpc("has_permission", {
      p_resource: "warehouses",
      p_action: "write",
    });
    if (!ok) throw new Error("Forbidden");
    const { error } = await sb
      .from("warehouse_users")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const listWarehouseInventory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ warehouse_id: z.number() }).parse(d),
  )
  .handler(async ({ data }): Promise<InventoryRow[]> => {
    const sb = getSupabaseServer();
    const { data: rows, error } = await sb
      .from("warehouse_products")
      .select(
        "id, warehouse_id, product_id, qty, products(name, grains_per_carton, price, unit_type)",
      )
      .eq("warehouse_id", data.warehouse_id)
      .order("id");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      warehouse_id: r.warehouse_id,
      product_id: r.product_id,
      qty: r.qty,
      product_name: r.products?.name ?? "—",
      grains_per_carton: r.products?.grains_per_carton ?? null,
      unit_type: r.products?.unit_type ?? "PIECE",
      product_price: r.products?.price ?? 0,
    }));
  });

const adjustInventory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        warehouse_id: z.number(),
        product_id: z.number(),
        delta: z.number().int(),
        reason: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = getSupabaseServer();
    const { error } = await (sb.rpc as any)("adjust_warehouse_qty_audited", {
      p_warehouse_id: data.warehouse_id,
      p_product_id: data.product_id,
      p_delta: data.delta,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
  });

interface AdjustmentLogRow {
  id: number;
  warehouse_id: number;
  product_id: number;
  delta: number;
  reason: string;
  adjusted_at: string;
  adjusted_by: string | null;
  product_name: string | null;
  adjuster_name: string | null;
}

const listAdjustments = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ warehouse_id: z.number() }).parse(d),
  )
  .handler(async ({ data }): Promise<AdjustmentLogRow[]> => {
    const sb = getSupabaseServer();
    const { data: rows } = await (sb.from("warehouse_adjustments") as any)
      .select(
        "id, warehouse_id, product_id, delta, reason, adjusted_at, adjusted_by, products(name), profiles(name)",
      )
      .eq("warehouse_id", data.warehouse_id)
      .order("adjusted_at", { ascending: false })
      .limit(20);
    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      warehouse_id: r.warehouse_id,
      product_id: r.product_id,
      delta: r.delta,
      reason: r.reason,
      adjusted_at: r.adjusted_at,
      adjusted_by: r.adjusted_by,
      product_name: r.products?.name ?? null,
      adjuster_name: r.profiles?.name ?? null,
    }));
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/warehouses")({
  component: WarehousesPage,
});

// ─── page ─────────────────────────────────────────────────────────────────────

function WarehousesPage() {
  const { permissions, profile } = Route.useRouteContext() as {
    permissions: string[];
    profile?: { role: "OWNER" | "ADMIN" | "USER" };
  };
  const { t } = useTranslation();
  const qc = useQueryClient();

  const canView = can(permissions, "warehouses", "view");
  const canWrite = can(permissions, "warehouses", "write");
  const canDelete = can(permissions, "warehouses", "delete");
  const role = profile?.role ?? "USER";
  const canAdjust = role === "OWNER" || role === "ADMIN";

  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: listWarehouses,
    enabled: canView,
  });
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Warehouse | null>(null);

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">{t("warehouses.noPermission")}</p>
      </div>
    );
  }

  const columns: ColumnDef<Warehouse>[] = [
    { accessorKey: "name", header: t("warehouses.name") },
    {
      accessorKey: "location",
      header: t("warehouses.location"),
      cell: ({ getValue }) => getValue<string | null>() ?? "—",
    },
    {
      accessorKey: "user_count",
      header: t("warehouses.users"),
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          <Users className="h-3 w-3 me-1" />
          {getValue<number>()}
        </Badge>
      ),
    },
    {
      accessorKey: "product_count",
      header: t("warehouses.products"),
      cell: ({ getValue }) => (
        <Badge variant="outline">
          <Package className="h-3 w-3 me-1" />
          {getValue<number>()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 140,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetail(row.original)}
          >
            <Boxes className="h-3 w-3" /> {t("warehouses.manage")}
          </Button>
          {canWrite && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (
                  !confirm(
                    t("warehouses.confirmDelete", { name: row.original.name }),
                  )
                )
                  return;
                try {
                  await softDeleteWarehouse({ data: { id: row.original.id } });
                  toast.success(t("warehouses.deleted"));
                  qc.invalidateQueries({ queryKey: ["warehouses"] });
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
            {t("warehouses.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("warehouses.subtitle", { count: warehouses.data?.length ?? 0 })}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("warehouses.addWarehouse")}
          </Button>
        )}
      </div>

      <DataTable
        data={warehouses.data ?? []}
        columns={columns}
        searchKey="name"
        emptyMessage={t("warehouses.noWarehouses")}
      />

      {(creating || editing) && (
        <WarehouseDialog
          warehouse={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["warehouses"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {detail && (
        <WarehouseDetailDialog
          warehouse={detail}
          canWrite={canWrite}
          canAdjust={canAdjust}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

// ─── WarehouseDialog (create/edit) ────────────────────────────────────────────

function WarehouseDialog({
  warehouse,
  onClose,
  onSaved,
}: {
  warehouse: Warehouse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      id: warehouse?.id,
      name: warehouse?.name ?? "",
      description: warehouse?.description ?? "",
      location: warehouse?.location ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await upsertWarehouse({ data: value });
        toast.success(
          warehouse ? t("warehouses.updated") : t("warehouses.created"),
        );
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {warehouse
              ? t("warehouses.editWarehouse")
              : t("warehouses.newWarehouse")}
          </DialogTitle>
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
            label={t("warehouses.name")}
            required
          />
          <TextField
            form={form}
            name="description"
            label={t("warehouses.description")}
          />
          <TextField
            form={form}
            name="location"
            label={t("warehouses.location")}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── WarehouseDetailDialog (users + inventory tabs) ───────────────────────────

function WarehouseDetailDialog({
  warehouse,
  canWrite,
  canAdjust,
  onClose,
}: {
  warehouse: Warehouse;
  canWrite: boolean;
  canAdjust: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { settings, dollarRate = 1 } = Route.useRouteContext();
  const currency = settings?.base_currency ?? "IQD";
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["wh-users", warehouse.id],
    queryFn: () => listWarehouseUsers({ data: { warehouse_id: warehouse.id } }),
  });
  const inventory = useQuery({
    queryKey: ["wh-inventory", warehouse.id],
    queryFn: () =>
      listWarehouseInventory({ data: { warehouse_id: warehouse.id } }),
  });
  const profiles = useQuery({
    queryKey: ["all-profiles"],
    queryFn: listAllProfiles,
  });

  const [selectedProfile, setSelectedProfile] = useState("");
  const [adjusting, setAdjusting] = useState<{
    row: InventoryRow;
    delta: string;
    reason: string;
  } | null>(null);

  const assignedIds = new Set((users.data ?? []).map((u) => u.profile_id));
  const availableProfiles = (profiles.data ?? []).filter(
    (p) => !assignedIds.has(p.id),
  );

  const totalValue = (inventory.data ?? []).reduce(
    (sum, r) => sum + r.qty * r.product_price,
    0,
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{warehouse.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="inventory">
          <TabsList>
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 me-1.5" />
              {t("warehouses.inventory")}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 me-1.5" />
              {t("warehouses.assignedUsers")}
            </TabsTrigger>
            {canAdjust && (
              <TabsTrigger value="audit">
                {t("warehouses.adjustmentLog")}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Inventory tab */}
          <TabsContent value="inventory" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              {t("warehouses.totalValue")}:{" "}
              <strong>{formatMoney(totalValue, currency, dollarRate)}</strong> —{" "}
              {(inventory.data ?? []).length} {t("warehouses.productLines")}
            </p>
            {(inventory.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("warehouses.noInventory")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-start p-2">{t("products.name")}</th>
                    <th className="text-start p-2">{t("warehouses.qty")}</th>
                    {canWrite && <th className="p-2" />}
                  </tr>
                </thead>
                <tbody>
                  {(inventory.data ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="p-2">{row.product_name}</td>
                      <td className="p-2 font-mono">
                        {qtyDisplay(row.qty, row.grains_per_carton, row.unit_type, t)}
                      </td>
                      {canWrite && (
                        <td className="p-2 text-end">
                          {canAdjust ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAdjusting({ row, delta: "0", reason: "" })
                              }
                            >
                              {t("warehouses.adjust")}
                            </Button>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Inline adjustment row */}
            {adjusting && canAdjust && (
              <div className="rounded-lg border p-3 bg-muted/40 space-y-3">
                <div className="text-sm font-medium">
                  {adjusting.row.product_name}
                </div>
                <QtyInput
                  allowNegative
                  grainsPerCarton={adjusting.row.grains_per_carton}
                  unitType={adjusting.row.unit_type}
                  value={Number(adjusting.delta) || 0}
                  onChange={(grains) =>
                    setAdjusting({ ...adjusting, delta: String(grains) })
                  }
                />
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    {t("warehouses.reason")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={adjusting.reason}
                    onChange={(e) =>
                      setAdjusting({ ...adjusting, reason: e.target.value })
                    }
                    placeholder={t("warehouses.reasonPlaceholder")}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAdjusting(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      !adjusting.reason.trim() ||
                      Number(adjusting.delta) === 0 ||
                      isNaN(Number(adjusting.delta))
                    }
                    onClick={async () => {
                      const delta = Number(adjusting.delta);
                      if (isNaN(delta) || delta === 0) {
                        setAdjusting(null);
                        return;
                      }
                      const reason = adjusting.reason.trim();
                      if (!reason) {
                        toast.error(t("warehouses.reasonRequired"));
                        return;
                      }
                      const currentQty = adjusting.row.qty;
                      if (delta < 0 && currentQty + delta < 0) {
                        const ok = window.confirm(
                          t("warehouses.confirmFloorZero", {
                            current: currentQty,
                            delta,
                          }),
                        );
                        if (!ok) return;
                      }
                      try {
                        await adjustInventory({
                          data: {
                            warehouse_id: warehouse.id,
                            product_id: adjusting.row.product_id,
                            delta,
                            reason,
                          },
                        });
                        qc.invalidateQueries({
                          queryKey: ["wh-inventory", warehouse.id],
                        });
                        qc.invalidateQueries({ queryKey: ["warehouses"] });
                        qc.invalidateQueries({
                          queryKey: ["wh-adjustments", warehouse.id],
                        });
                        toast.success(t("warehouses.adjusted"));
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                      setAdjusting(null);
                    }}
                  >
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users" className="space-y-3 mt-4">
            {canWrite && (
              <div className="flex gap-2">
                <Select
                  value={selectedProfile}
                  onValueChange={setSelectedProfile}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("warehouses.selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedProfile}
                  onClick={async () => {
                    if (!selectedProfile) return;
                    try {
                      await addWarehouseUser({
                        data: {
                          warehouse_id: warehouse.id,
                          profile_id: selectedProfile,
                        },
                      });
                      setSelectedProfile("");
                      qc.invalidateQueries({
                        queryKey: ["wh-users", warehouse.id],
                      });
                      qc.invalidateQueries({ queryKey: ["warehouses"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" /> {t("common.add")}
                </Button>
              </div>
            )}

            {(users.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("warehouses.noUsers")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {(users.data ?? []).map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-2">{u.profile_name}</td>
                      {canWrite && (
                        <td className="p-2 text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await removeWarehouseUser({
                                  data: { id: u.id },
                                });
                                qc.invalidateQueries({
                                  queryKey: ["wh-users", warehouse.id],
                                });
                                qc.invalidateQueries({
                                  queryKey: ["warehouses"],
                                });
                              } catch (e) {
                                toast.error(
                                  e instanceof Error ? e.message : "Failed",
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          {canAdjust && (
            <TabsContent value="audit" className="space-y-3 mt-4">
              <AdjustmentLogPanel warehouseId={warehouse.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentLogPanel({ warehouseId }: { warehouseId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["wh-adjustments", warehouseId],
    queryFn: () => listAdjustments({ data: { warehouse_id: warehouseId } }),
  });
  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("common.loading")}
      </p>
    );
  if (!data || data.length === 0)
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("warehouses.noAdjustments")}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="text-start p-2">{t("common.date")}</th>
            <th className="text-start p-2">{t("products.name")}</th>
            <th className="text-end p-2">{t("warehouses.qty")}</th>
            <th className="text-start p-2">{t("warehouses.reason")}</th>
            <th className="text-start p-2">{t("common.name")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id} className="border-t border-border">
              <td className="p-2 text-muted-foreground text-xs">
                {new Date(a.adjusted_at).toLocaleString()}
              </td>
              <td className="p-2">{a.product_name ?? "—"}</td>
              <td
                className={
                  a.delta > 0
                    ? "p-2 text-end text-green-600 dark:text-green-400"
                    : "p-2 text-end text-orange-600 dark:text-orange-400"
                }
              >
                {a.delta > 0 ? "+" : ""}
                {a.delta}
              </td>
              <td className="p-2 text-xs">{a.reason}</td>
              <td className="p-2 text-xs text-muted-foreground">
                {a.adjuster_name ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

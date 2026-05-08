import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getSupabaseServer } from "~/lib/supabase.server";

export type UserRole = "OWNER" | "ADMIN" | "USER";

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  warehouse_ids: number[];
}

/**
 * Returns the warehouse IDs to filter by for a USER-role account,
 * or null for OWNER/ADMIN (no restriction).
 */
export function warehouseFilter(me: AuthedUser): number[] | null {
  if (me.role !== "USER") return null;
  return me.warehouse_ids.length > 0 ? me.warehouse_ids : null;
}

/**
 * Hardcoded baseline of every resource:action pair the app ships with.
 * Used as a fallback when permission_catalog rows are missing (e.g. a migration
 * hasn't been applied to a self-hosted DB). RLS is the real boundary — this is
 * UX only — so a permissive fallback for OWNER/ADMIN is safe.
 */
export const ESSENTIAL_PERMISSIONS = [
  "sales:view",
  "sales:write",
  "sales:delete",
  "sales:collect",
  "customers:view",
  "customers:write",
  "customers:delete",
  "products:view",
  "products:write",
  "products:delete",
  "employees:view",
  "employees:write",
  "employees:delete",
  "employees:actions",
  "companies:view",
  "companies:write",
  "companies:delete",
  "purchases:view",
  "purchases:write",
  "purchases:delete",
  "purchases:pay",
  "expenses:view",
  "expenses:write",
  "expenses:delete",
  "dollar:view",
  "dollar:write",
  "reports:view",
  "warehouses:view",
  "warehouses:write",
  "warehouses:delete",
  "inventory:view",
  "inventory:write",
  "backups:view",
  "backups:run",
  "backups:config",
  "settings:branding",
  "trash:manage",
] as const;

/**
 * Permissions an OWNER always gets, regardless of catalog state.
 */
export function ownerPermissions(catalogPerms: string[]): string[] {
  return Array.from(new Set([...catalogPerms, ...ESSENTIAL_PERMISSIONS]));
}

/**
 * Permissions an ADMIN always gets. Excludes OWNER-only entries.
 */
const ADMIN_EXCLUDED = new Set(["backups:config"]);
export function adminPermissions(catalogPerms: string[]): string[] {
  return Array.from(
    new Set([...catalogPerms, ...ESSENTIAL_PERMISSIONS]),
  ).filter((p) => !ADMIN_EXCLUDED.has(p));
}

/**
 * Resolve the current Supabase Auth session into a profile-aware user.
 * Throws redirect to /login when there is no session.
 */
export const requireUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthedUser> => {
    const sb = getSupabaseServer();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (error || !user) throw redirect({ to: "/login" });

    const { data: profile, error: pErr } = await sb
      .from("profiles")
      .select("id, name, role")
      .eq("id", user.id)
      .is("deleted_at", null)
      .maybeSingle<{ id: string; name: string; role: UserRole }>();
    if (pErr || !profile) throw redirect({ to: "/login" });

    const { data: wuRows } = await (sb.from("warehouse_users") as any)
      .select("warehouse_id")
      .eq("profile_id", profile.id);
    const warehouse_ids = ((wuRows ?? []) as any[]).map((r) =>
      Number(r.warehouse_id),
    );

    return {
      id: profile.id,
      email: user.email ?? "",
      name: profile.name,
      role: profile.role,
      warehouse_ids,
    };
  },
);

/**
 * Resolve the current user's full permission set as `${resource}:${action}` keys.
 * OWNER and ADMIN are short-circuited via has_permission RPC; USERs get their
 * explicit grants. Used by the UI to gate menu items and buttons (RLS is the
 * actual security boundary — this is just for UX).
 */
export const loadPermissions = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const sb = getSupabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return [];

    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: UserRole }>();
    if (!profile) return [];

    const { data: catalog } = await sb
      .from("permission_catalog")
      .select("resource, action");
    const catalogPerms = (catalog ?? []).map(
      (c) => `${c.resource}:${c.action}`,
    );

    if (profile.role === "OWNER") return ownerPermissions(catalogPerms);
    if (profile.role === "ADMIN") return adminPermissions(catalogPerms);
    // USER: explicit grants only
    const { data: grants } = await sb
      .from("user_permissions")
      .select("resource, action")
      .eq("profile_id", user.id);
    return (grants ?? []).map((g) => `${g.resource}:${g.action}`);
  },
);

export function can(
  perms: string[],
  resource: string,
  action: string,
): boolean {
  return perms.includes(`${resource}:${action}`);
}

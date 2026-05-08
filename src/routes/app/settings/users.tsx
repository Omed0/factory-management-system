import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Trash2, UserCog, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSupabaseAdmin, getSupabaseServer } from "~/lib/supabase.server";
import { requireUser } from "~/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { PermissionGrid } from "~/components/permission-grid";

interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  role: "OWNER" | "ADMIN" | "USER";
  email: string | null;
}

// ─── server fns ──────────────────────────────────────────────────────────────

const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, USER: 2 };

const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser(); // any signed-in user can view the list (UI gate is on route)
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("profiles")
    .select("id,name,phone,role")
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);

  // Fetch all auth users to get emails
  const admin = getSupabaseAdmin();
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email;
  }

  const profiles = (data ?? []).map((p) => ({
    ...(p as { id: string; name: string; phone: string | null; role: "OWNER" | "ADMIN" | "USER" }),
    email: emailMap[p.id] ?? null,
  })) as ProfileRow[];

  return profiles.sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3),
  );
});

const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser();
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("permission_catalog").select("*");
  if (error) throw new Error(error.message);
  return data as { resource: string; action: string; label: string }[];
});

const listGrants = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ profile_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUser();
    const sb = getSupabaseServer();
    const { data: rows, error } = await sb
      .from("user_permissions")
      .select("resource, action")
      .eq("profile_id", data.profile_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().nullish().transform((v) => v || null),
  role: z.enum(["ADMIN", "USER"]),
});
const createUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateUserSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("forbidden");

    const admin = getSupabaseAdmin();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user)
      throw new Error(error?.message ?? "create failed");

    const profileUpdate = {
      name: data.name,
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.role === "ADMIN" ? { role: "ADMIN" as const } : {}),
    };

    const { error: upErr } = await admin
      .from("profiles")
      .update(profileUpdate as any)
      .eq("id", created.user.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, id: created.user.id };
  });

// Update an existing user's profile. ADMIN cannot edit OWNER accounts.
const UpdateUserSchema = z.object({
  profile_id: z.string().uuid(),
  name: z.string().min(2),
  phone: z.string().nullish().transform((v) => v || null),
  password: z.string().min(8).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});
const updateUserProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateUserSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("forbidden");

    // Load target profile to check role
    const sb = getSupabaseServer();
    const { data: target } = await sb
      .from("profiles")
      .select("role")
      .eq("id", data.profile_id)
      .single<{ role: string }>();
    if (!target) throw new Error("user not found");
    // ADMIN cannot edit OWNER accounts
    if (me.role === "ADMIN" && target.role === "OWNER")
      throw new Error("ADMIN cannot edit OWNER account");
    // Only OWNER can change email
    if (data.email && me.role !== "OWNER")
      throw new Error("Only OWNER can change user email");

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ name: data.name, phone: data.phone ?? null })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);

    if (data.password) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(
        data.profile_id,
        { password: data.password },
      );
      if (pwErr) throw new Error(pwErr.message);
    }

    if (data.email) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(
        data.profile_id,
        { email: data.email },
      );
      if (emailErr) throw new Error(emailErr.message);
    }

    return { ok: true };
  });

const ChangeRoleSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(["ADMIN", "USER"]),
});
const changeRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChangeRoleSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("forbidden");
    if (data.role === "ADMIN" && me.role !== "OWNER")
      throw new Error("only OWNER may grant ADMIN role");
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SoftDeleteSchema = z.object({ profile_id: z.string().uuid() });
const softDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SoftDeleteSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("forbidden");
    if (me.id === data.profile_id) throw new Error("cannot delete yourself");
    // ADMIN cannot delete OWNER
    const sb = getSupabaseServer();
    const { data: target } = await sb
      .from("profiles")
      .select("role")
      .eq("id", data.profile_id)
      .single<{ role: string }>();
    if (me.role === "ADMIN" && target?.role === "OWNER")
      throw new Error("ADMIN cannot remove OWNER account");
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SaveGrantsSchema = z.object({
  profile_id: z.string().uuid(),
  grants: z.array(z.object({ resource: z.string(), action: z.string() })),
});
const savePermissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveGrantsSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("forbidden");
    const sb = getSupabaseServer();
    await sb
      .from("user_permissions")
      .delete()
      .eq("profile_id", data.profile_id);
    if (data.grants.length) {
      const { error } = await sb.from("user_permissions").insert(
        data.grants.map((g) => ({
          profile_id: data.profile_id,
          resource: g.resource,
          action: g.action,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const UpdateProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().nullish().transform((v) => v || null),
  password: z.string().min(8).optional().or(z.literal("")),
});
const updateOwnProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateProfileSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ name: data.name, phone: data.phone ?? null })
      .eq("id", me.id);
    if (error) throw new Error(error.message);
    if (data.password) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(me.id, {
        password: data.password,
      });
      if (pwErr) throw new Error(pwErr.message);
    }
    return { ok: true };
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/settings/users")({
  beforeLoad: async () => {
    const user = await requireUser();
    if (!["OWNER", "ADMIN"].includes(user.role))
      throw redirect({ to: "/app/dashboard" });
    return { me: user };
  },
  component: UsersTab,
});

function UsersTab() {
  const { me } = Route.useRouteContext();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const myProfile = users.data?.find((u) => u.id === me.id);

  return (
    <div className="space-y-6">
      {/* My Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{t("users.myProfile")}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingProfile(true)}
          >
            <UserCog className="h-4 w-4" /> {t("users.editProfile")}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>{t("users.name")}:</strong> {me.name}
          </p>
          <p>
            <strong>{t("users.role")}:</strong> {me.role}
          </p>
          {myProfile?.phone && (
            <p>
              <strong>{t("users.phone")}:</strong> {myProfile.phone}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("users.teamMembers")}</h2>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> {t("users.addUser")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 text-start">{t("users.name")}</th>
              <th className="p-3 text-start">{t("users.phone")}</th>
              <th className="p-3 text-start">{t("users.role")}</th>
              <th className="p-3 text-end">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => {
              const canEditThis =
                me.role === "OWNER" ||
                (me.role === "ADMIN" && u.role !== "OWNER");
              return (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {u.phone ?? "—"}
                  </td>
                  <td className="p-3">
                    {u.role === "OWNER" ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Shield className="h-3 w-3" /> {u.role}
                      </span>
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={async (v) => {
                          try {
                            await changeRole({
                              data: {
                                profile_id: u.id,
                                role: v as "ADMIN" | "USER",
                              },
                            });
                            qc.invalidateQueries({ queryKey: ["users"] });
                            toast.success(t("users.roleUpdated"));
                          } catch (e) {
                            toast.error(
                              e instanceof Error ? e.message : "Failed",
                            );
                          }
                        }}
                        disabled={u.id === me.id || !canEditThis}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {me.role === "OWNER" && (
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          )}
                          <SelectItem value="USER">USER</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-3 text-end">
                    <div className="inline-flex gap-2">
                      {u.role === "USER" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(u)}
                        >
                          {t("users.permissions")}
                        </Button>
                      )}
                      {canEditThis && u.id !== me.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {u.role !== "OWNER" && u.id !== me.id && canEditThis && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm(t("users.confirmRemove", { name: u.name })))
                              return;
                            try {
                              await softDeleteUser({
                                data: { profile_id: u.id },
                              });
                              qc.invalidateQueries({ queryKey: ["users"] });
                              toast.success(t("users.userRemoved"));
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed",
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserDialog
          canCreateAdmin={me.role === "OWNER"}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}
      {editing && (
        <PermissionsDialog user={editing} onClose={() => setEditing(null)} />
      )}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          callerRole={me.role}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            qc.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}
      {editingProfile && (
        <EditProfileDialog
          currentName={me.name}
          currentPhone={myProfile?.phone ?? null}
          onClose={() => setEditingProfile(false)}
          onSaved={() => {
            setEditingProfile(false);
            qc.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}
    </div>
  );
}

function CreateUserDialog({
  canCreateAdmin,
  onClose,
  onSaved,
}: {
  canCreateAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "USER" as "USER" | "ADMIN",
    },
    onSubmit: async ({ value }) => {
      try {
        await createUser({ data: value });
        toast.success(t("users.userCreated"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.addUser")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.name")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="phone">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.phone")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="email">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.email")}</Label>
                <Input
                  type="email"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.password")}</Label>
                <Input
                  type="password"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  required
                  minLength={8}
                  placeholder="8+"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="role">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.role")}</Label>
                <Select
                  value={f.state.value}
                  onValueChange={(v) => f.handleChange(v as "USER" | "ADMIN")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    {canCreateAdmin && (
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <div className="flex justify-end gap-2">
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

function EditUserDialog({
  user,
  callerRole,
  onClose,
  onSaved,
}: {
  user: ProfileRow;
  callerRole: "OWNER" | "ADMIN" | "USER";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      profile_id: user.id,
      name: user.name,
      phone: user.phone ?? "",
      password: "",
      email: user.email ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await updateUserProfile({
          data: {
            ...value,
            password: value.password || undefined,
            email: value.email || undefined,
          },
        });
        toast.success(t("users.userUpdated"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("users.editUser")} — {user.name}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.name")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="phone">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.phone")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          {callerRole === "OWNER" && (
            <form.Field name="email">
              {(f) => (
                <div className="grid gap-1.5">
                  <Label>{t("users.email")}</Label>
                  <Input
                    type="email"
                    value={f.state.value}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={t("users.emailOptional")}
                  />
                </div>
              )}
            </form.Field>
          )}
          <form.Field name="password">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.newPassword")}</Label>
                <Input
                  type="password"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  minLength={8}
                  placeholder={t("users.passwordOptional")}
                />
              </div>
            )}
          </form.Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  currentName,
  currentPhone,
  onClose,
  onSaved,
}: {
  currentName: string;
  currentPhone: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      name: currentName,
      phone: currentPhone ?? "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await updateOwnProfile({
          data: {
            name: value.name,
            phone: value.phone || undefined,
            password: value.password || undefined,
          },
        });
        toast.success(t("users.profileUpdated"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.editProfile")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.name")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="phone">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.phone")}</Label>
                <Input
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  placeholder={t("users.phonePlaceholder")}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>{t("users.newPassword")}</Label>
                <Input
                  type="password"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  minLength={8}
                  placeholder={t("users.passwordOptional")}
                />
              </div>
            )}
          </form.Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({
  user,
  onClose,
}: {
  user: ProfileRow;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const router = useRouter();
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: listCatalog });
  const grants = useQuery({
    queryKey: ["grants", user.id],
    queryFn: () => listGrants({ data: { profile_id: user.id } }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("users.permissions")} — {user.name}
          </DialogTitle>
        </DialogHeader>
        {catalog.data && grants.data ? (
          <PermissionGrid
            catalog={catalog.data}
            initialGrants={grants.data}
            onSave={async (g) => {
              await savePermissions({
                data: { profile_id: user.id, grants: g },
              });
              await qc.invalidateQueries({ queryKey: ["grants", user.id] });
              await router.invalidate();
              toast.success(t("users.permissionsUpdated"));
              onClose();
            }}
          />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </DialogContent>
    </Dialog>
  );
}

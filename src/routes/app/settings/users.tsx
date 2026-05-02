import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield, Trash2, UserCog } from 'lucide-react';

import { getSupabaseAdmin, getSupabaseServer } from '~/lib/supabase.server';
import { requireUser } from '~/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { PermissionGrid } from '~/components/permission-grid';

interface ProfileRow { id: string; name: string; role: 'OWNER' | 'ADMIN' | 'USER'; }

// ─── server fns ──────────────────────────────────────────────────────────────

const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, USER: 2 }

const listUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('profiles').select('id,name,role')
    .is('deleted_at', null).order('name');
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileRow[]).sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3)
  );
});

const listCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('permission_catalog').select('*');
  if (error) throw new Error(error.message);
  return data as { resource: string; action: string; label: string }[];
});

const listGrants = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: rows, error } = await sb
      .from('user_permissions').select('resource, action').eq('profile_id', data.profile_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const CreateUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().min(2),
  role:     z.enum(['ADMIN', 'USER']),
});
const createUser = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => CreateUserSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(me.role)) throw new Error('forbidden');

    const admin = getSupabaseAdmin();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message ?? 'create failed');

    // The handle_new_user trigger writes a profile with role=USER for non-first users.
    // Promote to ADMIN if requested.
    if (data.role === 'ADMIN') {
      const { error: roleErr } = await admin.from('profiles').update({ role: 'ADMIN' }).eq('id', created.user.id);
      if (roleErr) throw new Error(roleErr.message);
    }
    return { ok: true, id: created.user.id };
  });

const ChangeRoleSchema = z.object({ profile_id: z.string().uuid(), role: z.enum(['ADMIN', 'USER']) });
const changeRole = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => ChangeRoleSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(me.role)) throw new Error('forbidden');
    if (data.role === 'ADMIN' && me.role !== 'OWNER') throw new Error('only OWNER may grant ADMIN role');
    const sb = getSupabaseServer()
    const { error } = await sb.from('profiles').update({ role: data.role }).eq('id', data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SoftDeleteSchema = z.object({ profile_id: z.string().uuid() });
const softDeleteUser = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SoftDeleteSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(me.role)) throw new Error('forbidden');
    if (me.id === data.profile_id) throw new Error('cannot delete yourself');
    const sb = getSupabaseServer()
    const { error } = await sb.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SaveGrantsSchema = z.object({
  profile_id: z.string().uuid(),
  grants: z.array(z.object({ resource: z.string(), action: z.string() })),
});
const savePermissions = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SaveGrantsSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(me.role)) throw new Error('forbidden');
    const sb = getSupabaseServer()
    await sb.from('user_permissions').delete().eq('profile_id', data.profile_id);
    if (data.grants.length) {
      const { error } = await sb.from('user_permissions').insert(
        data.grants.map((g) => ({ profile_id: data.profile_id, resource: g.resource, action: g.action })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const UpdateProfileSchema = z.object({
  name:     z.string().min(2),
  password: z.string().min(8).optional().or(z.literal('')),
});
const updateOwnProfile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => UpdateProfileSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const sb = getSupabaseServer()
    const { error } = await sb.from('profiles').update({ name: data.name }).eq('id', me.id);
    if (error) throw new Error(error.message);
    if (data.password) {
      const admin = getSupabaseAdmin();
      const { error: pwErr } = await admin.auth.admin.updateUserById(me.id, { password: data.password });
      if (pwErr) throw new Error(pwErr.message);
    }
    return { ok: true };
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/settings/users')({
  beforeLoad: async () => {
    const user = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(user.role)) throw redirect({ to: '/app/dashboard' });
    return { me: user };
  },
  component: UsersTab,
});

function UsersTab() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <div className="space-y-6">
      {/* My Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">My Profile</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
            <UserCog className="h-4 w-4" /> Edit profile
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p><strong>Name:</strong> {me.name}</p>
          <p><strong>Role:</strong> {me.role}</p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team members</h2>
        <Button onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" /> Add user</Button>
      </div>

      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-start"><th className="p-3 text-start">Name</th><th className="p-3 text-start">Role</th><th className="p-3 text-end">Actions</th></tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3">{u.name}</td>
                <td className="p-3">
                  {u.role === 'OWNER' ? (
                    <span className="inline-flex items-center gap-1 text-xs"><Shield className="h-3 w-3" /> {u.role}</span>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={async (v) => {
                        try {
                          await changeRole({ data: { profile_id: u.id, role: v as 'ADMIN' | 'USER' } });
                          qc.invalidateQueries({ queryKey: ['users'] });
                          toast.success('Role updated');
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      disabled={u.id === me.id}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {me.role === 'OWNER' && <SelectItem value="ADMIN">ADMIN</SelectItem>}
                        <SelectItem value="USER">USER</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="p-3 text-end">
                  <div className="inline-flex gap-2">
                    {u.role === 'USER' && (
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Permissions</Button>
                    )}
                    {u.role !== 'OWNER' && u.id !== me.id && (
                      <Button size="sm" variant="destructive" onClick={async () => {
                        if (!confirm(`Remove ${u.name}?`)) return;
                        await softDeleteUser({ data: { profile_id: u.id } });
                        qc.invalidateQueries({ queryKey: ['users'] });
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
      {editing && <PermissionsDialog user={editing} onClose={() => setEditing(null)} />}
      {editingProfile && (
        <EditProfileDialog
          currentName={me.name}
          onClose={() => setEditingProfile(false)}
          onSaved={() => { setEditingProfile(false); qc.invalidateQueries({ queryKey: ['users'] }); }}
        />
      )}
    </div>
  );
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: { email: '', password: '', name: '', role: 'USER' as 'USER' | 'ADMIN' },
    onSubmit: async ({ value }) => {
      try {
        await createUser({ data: value });
        toast.success('User created');
        qc.invalidateQueries({ queryKey: ['users'] });
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="name">{(f) => <div className="grid gap-1.5"><Label>Name</Label><Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} required /></div>}</form.Field>
          <form.Field name="email">{(f) => <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} required /></div>}</form.Field>
          <form.Field name="password">{(f) => <div className="grid gap-1.5"><Label>Password (8+)</Label><Input type="password" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} required minLength={8} /></div>}</form.Field>
          <form.Field name="role">{(f) => (
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select value={f.state.value} onValueChange={(v) => f.handleChange(v as 'USER' | 'ADMIN')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER (set permissions next)</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}</form.Field>
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({ currentName, onClose, onSaved }: { currentName: string; onClose: () => void; onSaved: () => void }) {
  const form = useForm({
    defaultValues: { name: currentName, password: '' },
    onSubmit: async ({ value }) => {
      try {
        await updateOwnProfile({ data: { name: value.name, password: value.password || undefined } });
        toast.success('Profile updated');
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit my profile</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="name">{(f) => (
            <div className="grid gap-1.5"><Label>Name</Label>
              <Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} required minLength={2} />
            </div>
          )}</form.Field>
          <form.Field name="password">{(f) => (
            <div className="grid gap-1.5"><Label>New password (leave blank to keep current)</Label>
              <Input type="password" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} minLength={8} placeholder="8+ characters" />
            </div>
          )}</form.Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ user, onClose }: { user: ProfileRow; onClose: () => void }) {
  const qc = useQueryClient()
  const router = useRouter()
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: listCatalog });
  const grants  = useQuery({ queryKey: ['grants', user.id], queryFn: () => listGrants({ data: { profile_id: user.id } }) });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Permissions — {user.name}</DialogTitle></DialogHeader>
        {(catalog.data && grants.data) ? (
          <PermissionGrid
            catalog={catalog.data}
            initialGrants={grants.data}
            onSave={async (g) => {
              await savePermissions({ data: { profile_id: user.id, grants: g } });
              // Refresh the grants cache so the dialog shows updated state next open
              await qc.invalidateQueries({ queryKey: ['grants', user.id] });
              // Force the /app route to re-run bootstrap() so the nav/permissions refresh
              await router.invalidate()
              toast.success('Permissions updated');
              onClose();
            }}
          />
        ) : <Loader2 className="h-4 w-4 animate-spin" />}
      </DialogContent>
    </Dialog>
  );
}

import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';
import { getSupabaseServer } from '~/lib/supabase.server';

export type UserRole = 'OWNER' | 'ADMIN' | 'USER';

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Resolve the current Supabase Auth session into a profile-aware user.
 * Throws redirect to /login when there is no session.
 */
export const requireUser = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthedUser> => {
  const sb = getSupabaseServer()
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw redirect({ to: '/login' });

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle<{ id: string; name: string; role: UserRole }>();
  if (pErr || !profile) throw redirect({ to: '/login' });

  return { id: profile.id, email: user.email ?? '', name: profile.name, role: profile.role };
});

/**
 * Resolve the current user's full permission set as `${resource}:${action}` keys.
 * OWNER and ADMIN are short-circuited via has_permission RPC; USERs get their
 * explicit grants. Used by the UI to gate menu items and buttons (RLS is the
 * actual security boundary — this is just for UX).
 */
export const loadPermissions = createServerFn({ method: 'GET' }).handler(async (): Promise<string[]> => {
  const sb = getSupabaseServer()
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: UserRole }>();
  if (!profile) return [];

  const { data: catalog } = await sb.from('permission_catalog').select('resource, action');
  if (!catalog) return [];

  if (profile.role === 'OWNER') return catalog.map((c) => `${c.resource}:${c.action}`);
  if (profile.role === 'ADMIN') {
    return catalog
      .filter((c) => !(c.resource === 'backups' && c.action === 'config'))
      .map((c) => `${c.resource}:${c.action}`);
  }
  // USER: explicit grants only
  const { data: grants } = await sb.from('user_permissions').select('resource, action').eq('profile_id', user.id);
  return (grants ?? []).map((g) => `${g.resource}:${g.action}`);
});

export function can(perms: string[], resource: string, action: string): boolean {
  return perms.includes(`${resource}:${action}`);
}

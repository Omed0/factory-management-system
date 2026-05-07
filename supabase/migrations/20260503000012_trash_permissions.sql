-- Trash management permission. OWNER + ADMIN both get this via the auth.ts
-- ESSENTIAL_PERMISSIONS fallback in case this migration hasn't been applied yet.
-- USERs require an explicit grant in user_permissions.

insert into public.permission_catalog (resource, action, label) values
  ('trash', 'manage', 'View, restore, and permanently delete trashed records')
on conflict (resource, action) do nothing;

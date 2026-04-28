-- Security & performance hardening — fixes all Supabase advisor warnings.
--
-- Changes:
--   1. Set search_path = '' on all functions that were missing it (search_path mutable).
--   2. Move pg_trgm and btree_gist extensions from public → extensions schema.
--   3. Fix auth_rls_initplan: wrap auth.uid() in (select ...) in RLS policies.
--   4. Eliminate multiple permissive policies: split FOR ALL write policies
--      into explicit FOR INSERT / FOR UPDATE / FOR DELETE so they don't
--      overlap with dedicated FOR SELECT policies on the same table.
--   5. Fix storage bug: replace non-existent is_authenticated_staff() with
--      is_authenticated_user() in the employees bucket policy.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix mutable search_path on functions
-- ─────────────────────────────────────────────────────────────────────────────

alter function public.audit_dollar_change()      set search_path = '';
alter function public.set_updated_at()           set search_path = '';
alter function public.is_owner()                 set search_path = '';
alter function public.is_admin_or_owner()        set search_path = '';
alter function public.is_authenticated_user()    set search_path = '';
alter function public.guard_site_settings_admin() set search_path = '';
alter function public.guard_profile_role_change() set search_path = '';
alter function public.guard_single_owner()       set search_path = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Move extensions from public → extensions schema
--    Idempotent: only acts when the extension is currently in public.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on e.extnamespace = n.oid
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;

  if exists (
    select 1 from pg_extension e
    join pg_namespace n on e.extnamespace = n.oid
    where e.extname = 'btree_gist' and n.nspname = 'public'
  ) then
    alter extension btree_gist set schema extensions;
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix auth_rls_initplan: auth.uid() → (select auth.uid())
--    Re-evaluated per-row calls are replaced with a single init-plan evaluation.
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles_self_read
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin_or_owner());

-- profiles_self_update
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select role from public.profiles where id = (select auth.uid()))
  );

-- user_permissions_read
drop policy if exists user_permissions_read on public.user_permissions;
create policy user_permissions_read on public.user_permissions
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin_or_owner());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Eliminate multiple permissive policies
--    Each FOR ALL write policy is replaced by explicit INSERT / UPDATE / DELETE
--    so it no longer overlaps the dedicated FOR SELECT policy on the same table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── site_settings ──────────────────────────────────────────────────────────
drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_insert on public.site_settings
  for insert to authenticated
  with check (public.is_admin_or_owner());
create policy site_settings_update on public.site_settings
  for update to authenticated
  using  (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());
create policy site_settings_delete on public.site_settings
  for delete to authenticated
  using  (public.is_admin_or_owner());

-- ── profiles ───────────────────────────────────────────────────────────────
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin_or_owner());
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using  (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using  (public.is_admin_or_owner());

-- ── sale_items ─────────────────────────────────────────────────────────────
drop policy if exists sale_items_write on public.sale_items;
create policy sale_items_insert on public.sale_items
  for insert to authenticated
  with check (public.has_permission('sales', 'write'));
create policy sale_items_update on public.sale_items
  for update to authenticated
  using  (public.has_permission('sales', 'write'))
  with check (public.has_permission('sales', 'write'));
create policy sale_items_delete on public.sale_items
  for delete to authenticated
  using  (public.has_permission('sales', 'write'));

-- ── paid_loans ─────────────────────────────────────────────────────────────
drop policy if exists paid_loans_write on public.paid_loans;
create policy paid_loans_insert on public.paid_loans
  for insert to authenticated
  with check (public.has_permission('sales', 'collect'));
create policy paid_loans_update on public.paid_loans
  for update to authenticated
  using  (public.has_permission('sales', 'collect'))
  with check (public.has_permission('sales', 'collect'));
create policy paid_loans_delete on public.paid_loans
  for delete to authenticated
  using  (public.has_permission('sales', 'collect'));

-- ── purchase_payments ──────────────────────────────────────────────────────
drop policy if exists purchase_payments_write on public.purchase_payments;
create policy purchase_payments_insert on public.purchase_payments
  for insert to authenticated
  with check (public.has_permission('purchases', 'pay'));
create policy purchase_payments_update on public.purchase_payments
  for update to authenticated
  using  (public.has_permission('purchases', 'pay'))
  with check (public.has_permission('purchases', 'pay'));
create policy purchase_payments_delete on public.purchase_payments
  for delete to authenticated
  using  (public.has_permission('purchases', 'pay'));

-- ── employee_actions ───────────────────────────────────────────────────────
drop policy if exists employee_actions_write on public.employee_actions;
create policy employee_actions_insert on public.employee_actions
  for insert to authenticated
  with check (public.has_permission('employees', 'actions'));
create policy employee_actions_update on public.employee_actions
  for update to authenticated
  using  (public.has_permission('employees', 'actions'))
  with check (public.has_permission('employees', 'actions'));
create policy employee_actions_delete on public.employee_actions
  for delete to authenticated
  using  (public.has_permission('employees', 'actions'));

-- ── user_permissions ───────────────────────────────────────────────────────
drop policy if exists user_permissions_admin_write on public.user_permissions;
create policy user_permissions_admin_insert on public.user_permissions
  for insert to authenticated
  with check (public.is_admin_or_owner());
create policy user_permissions_admin_update on public.user_permissions
  for update to authenticated
  using  (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());
create policy user_permissions_admin_delete on public.user_permissions
  for delete to authenticated
  using  (public.is_admin_or_owner());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Fix storage policy: is_authenticated_staff() → is_authenticated_user()
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "employees read" on storage.objects;
create policy "employees read" on storage.objects
  for select to authenticated
  using (bucket_id = 'employees' and public.is_authenticated_user());

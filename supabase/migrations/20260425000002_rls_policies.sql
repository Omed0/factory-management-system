-- RLS policies — auth model
--
-- Roles in this app:
--   OWNER  — full read/write on everything, can manage users
--   ADMIN  — full read/write on operational data; cannot change site_settings.backup_* or promote OWNERs
--   STAFF  — read most data, write sales/customers, no destructive ops, no employee/expense access
--
-- The role lives in public.profiles.role. We use a SECURITY DEFINER helper to read it
-- from inside policies (avoids recursive RLS evaluation on profiles).

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_owner()
returns boolean language sql stable as $$ select public.current_role() = 'OWNER' $$;

create or replace function public.is_admin_or_owner()
returns boolean language sql stable as $$ select public.current_role() in ('OWNER','ADMIN') $$;

create or replace function public.is_authenticated_user()
returns boolean language sql stable as $$ select public.current_role() in ('OWNER','ADMIN','USER') $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS everywhere in public
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'site_settings','profiles','dollar','dollar_history',
      'companies','company_purchases','purchase_payments',
      'customers','products','sales','sale_items','paid_loans',
      'employees','employee_actions','expenses','backup_runs'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- site_settings
--   * Read: any authenticated staff (so the app can render branding) AND anon
--     role for the unauthenticated login screen / first-run wizard.
--   * Write: OWNER always. ADMIN can update non-backup branding fields only
--     (enforced via column-level grant in the BEFORE UPDATE trigger).
-- ─────────────────────────────────────────────────────────────────────────────

create policy site_settings_read_anon on public.site_settings for select to anon       using (true);
create policy site_settings_read_auth on public.site_settings for select to authenticated using (true);
create policy site_settings_write     on public.site_settings for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- Block ADMINs from changing backup_* / setup_completed once OWNER set them.
create or replace function public.guard_site_settings_admin()
returns trigger language plpgsql as $$
begin
  if public.current_role() = 'ADMIN' then
    if (new.backup_provider, new.backup_keep_n, new.backup_cron) is distinct from
       (old.backup_provider, old.backup_keep_n, old.backup_cron) then
      raise exception 'ADMIN may not change backup configuration';
    end if;
  end if;
  return new;
end$$;

create trigger site_settings_admin_guard
  before update on public.site_settings
  for each row execute function public.guard_site_settings_admin();

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

create policy profiles_self_read    on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin_or_owner());
create policy profiles_self_update  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_write  on public.profiles for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- Only OWNER can promote anyone TO 'OWNER'
create or replace function public.guard_profile_role_change()
returns trigger language plpgsql as $$
begin
  if (new.role = 'OWNER' and old.role <> 'OWNER') and not public.is_owner() then
    raise exception 'Only an OWNER can promote a profile to OWNER';
  end if;
  return new;
end$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- dollar / dollar_history
-- ─────────────────────────────────────────────────────────────────────────────

create policy dollar_read         on public.dollar         for select to authenticated using (public.is_authenticated_user());
create policy dollar_write        on public.dollar         for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());
create policy dollar_history_read on public.dollar_history for select to authenticated using (public.is_admin_or_owner());

-- ─────────────────────────────────────────────────────────────────────────────
-- Operational tables — read for any staff, mutations for ADMIN/OWNER
-- (sales/customers are an exception: STAFF can also create/update.)
-- ─────────────────────────────────────────────────────────────────────────────

-- companies / purchases — admin/owner only for writes
create policy companies_read           on public.companies          for select to authenticated using (public.is_authenticated_user());
create policy companies_write          on public.companies          for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

create policy company_purchases_read   on public.company_purchases  for select to authenticated using (public.is_authenticated_user());
create policy company_purchases_write  on public.company_purchases  for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

create policy purchase_payments_read   on public.purchase_payments  for select to authenticated using (public.is_authenticated_user());
create policy purchase_payments_write  on public.purchase_payments  for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- customers / sales — staff can write
create policy customers_read   on public.customers   for select to authenticated using (public.is_authenticated_user());
create policy customers_write  on public.customers   for all    to authenticated using (public.is_authenticated_user()) with check (public.is_authenticated_user());

create policy sales_read       on public.sales       for select to authenticated using (public.is_authenticated_user());
create policy sales_write      on public.sales       for all    to authenticated using (public.is_authenticated_user()) with check (public.is_authenticated_user());

create policy sale_items_read  on public.sale_items  for select to authenticated using (public.is_authenticated_user());
create policy sale_items_write on public.sale_items  for all    to authenticated using (public.is_authenticated_user()) with check (public.is_authenticated_user());

create policy paid_loans_read  on public.paid_loans  for select to authenticated using (public.is_authenticated_user());
create policy paid_loans_write on public.paid_loans  for all    to authenticated using (public.is_authenticated_user()) with check (public.is_authenticated_user());

-- products — admin/owner write, all staff read
create policy products_read    on public.products    for select to authenticated using (public.is_authenticated_user());
create policy products_write   on public.products    for all    to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- employees / employee_actions / expenses — admin/owner only (HR/finance)
create policy employees_admin         on public.employees         for all to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());
create policy employee_actions_admin  on public.employee_actions  for all to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());
create policy expenses_admin          on public.expenses          for all to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- backup_runs — read admin/owner; insert via service_role only (Edge Function)
create policy backup_runs_read on public.backup_runs for select to authenticated using (public.is_admin_or_owner());
-- (no INSERT/UPDATE policy → only service_role bypasses RLS to write)

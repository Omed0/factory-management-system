-- Granular permissions + singleton-OWNER constraint.
--
-- Auth model:
--   OWNER  — exactly one, ever. Unconditional access. Cannot be demoted; if
--            removed, ownership must be transferred first (see transfer_ownership()).
--   ADMIN  — manages users and grants/revokes permissions to USERs. Has full
--            data access EXCEPT changing OWNER, backup config, or transferring
--            ownership.
--   USER   — only what an ADMIN/OWNER has granted them via user_permissions.
--
-- Permissions are (resource, action) tuples granted to a profile.

-- ─────────────────────────────────────────────────────────────────────────────
-- Singleton OWNER guard
-- ─────────────────────────────────────────────────────────────────────────────

create unique index profiles_single_owner_unq
  on public.profiles ((1))
  where role = 'OWNER' and deleted_at is null;

-- Friendlier error than the unique-violation message.
create or replace function public.guard_single_owner()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'OWNER' and (tg_op = 'INSERT' or old.role <> 'OWNER') then
    if exists (
      select 1 from public.profiles
      where role = 'OWNER' and deleted_at is null and id <> new.id
    ) then
      raise exception 'an OWNER already exists; transfer ownership before promoting another profile';
    end if;
  end if;
  return new;
end$$;

create trigger profiles_single_owner
  before insert or update on public.profiles
  for each row execute function public.guard_single_owner();

-- ─────────────────────────────────────────────────────────────────────────────
-- Allowed (resource, action) catalog
-- Resources match logical app sections; keep this table the source of truth so
-- the UI can render a permission grid by reading it.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.permission_catalog (
  resource text not null,
  action   text not null,
  label    text not null,
  primary key (resource, action)
);

insert into public.permission_catalog (resource, action, label) values
  ('customers',         'view',   'View customers'),
  ('customers',         'write',  'Create / edit customers'),
  ('customers',         'delete', 'Delete customers'),
  ('products',          'view',   'View products'),
  ('products',          'write',  'Create / edit products'),
  ('products',          'delete', 'Delete products'),
  ('sales',             'view',   'View sales'),
  ('sales',             'write',  'Create / edit sales'),
  ('sales',             'delete', 'Delete sales'),
  ('sales',             'collect','Collect loan payments'),
  ('employees',         'view',   'View employees'),
  ('employees',         'write',  'Create / edit employees'),
  ('employees',         'delete', 'Delete employees'),
  ('employees',         'actions','Record bonuses / punishments / absences'),
  ('expenses',          'view',   'View expenses'),
  ('expenses',          'write',  'Create / edit expenses'),
  ('expenses',          'delete', 'Delete expenses'),
  ('companies',         'view',   'View supplier companies'),
  ('companies',         'write',  'Create / edit companies'),
  ('companies',         'delete', 'Delete companies'),
  ('purchases',         'view',   'View company purchases'),
  ('purchases',         'write',  'Create / edit purchases'),
  ('purchases',         'delete', 'Delete purchases'),
  ('purchases',         'pay',    'Record purchase payments'),
  ('dollar',            'view',   'View exchange rate'),
  ('dollar',            'write',  'Update exchange rate'),
  ('reports',           'view',   'View reports'),
  ('settings',          'branding','Edit factory branding & place info'),
  ('backups',           'view',   'View backup history'),
  ('backups',           'run',    'Trigger manual backup'),
  ('backups',           'config', 'Change backup provider / cron / retention')
on conflict do nothing;

alter table public.permission_catalog enable row level security;
create policy permission_catalog_read on public.permission_catalog for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_permissions — grants
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  resource   text not null,
  action     text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, resource, action),
  foreign key (resource, action) references public.permission_catalog(resource, action) on delete cascade
);

create index user_permissions_profile_idx on public.user_permissions(profile_id);

alter table public.user_permissions enable row level security;
alter table public.user_permissions force row level security;

create policy user_permissions_read on public.user_permissions
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin_or_owner());

create policy user_permissions_admin_write on public.user_permissions
  for all to authenticated
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());

-- ─────────────────────────────────────────────────────────────────────────────
-- has_permission(resource, action)
-- OWNER → always true.
-- ADMIN → true for every resource EXCEPT 'backups:config' (OWNER only).
-- USER  → only if (auth.uid(), resource, action) row exists.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.has_permission(p_resource text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare r public.user_role := public.current_role();
begin
  if r is null then return false; end if;
  if r = 'OWNER' then return true; end if;
  if r = 'ADMIN' then
    -- Lock OWNER-only privileged settings away from ADMIN.
    if p_resource = 'backups' and p_action = 'config' then return false; end if;
    return true;
  end if;
  -- USER: explicit grant required.
  return exists (
    select 1 from public.user_permissions
    where profile_id = auth.uid()
      and resource = p_resource
      and action = p_action
  );
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Re-wire RLS write policies to use has_permission for USER-overrideable cases.
-- (Read policies still use is_authenticated_user — every signed-in person can
-- see operational data they're working alongside.)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists customers_write   on public.customers;
drop policy if exists sales_write       on public.sales;
drop policy if exists sale_items_write  on public.sale_items;
drop policy if exists paid_loans_write  on public.paid_loans;
drop policy if exists products_write    on public.products;
drop policy if exists companies_write   on public.companies;
drop policy if exists company_purchases_write on public.company_purchases;
drop policy if exists purchase_payments_write on public.purchase_payments;
drop policy if exists employees_admin           on public.employees;
drop policy if exists employee_actions_admin    on public.employee_actions;
drop policy if exists expenses_admin            on public.expenses;
drop policy if exists dollar_write              on public.dollar;

-- customers
create policy customers_insert on public.customers for insert to authenticated
  with check (public.has_permission('customers','write'));
create policy customers_update on public.customers for update to authenticated
  using (public.has_permission('customers','write'))
  with check (public.has_permission('customers','write'));
create policy customers_delete on public.customers for delete to authenticated
  using (public.has_permission('customers','delete'));

-- products
create policy products_insert on public.products for insert to authenticated
  with check (public.has_permission('products','write'));
create policy products_update on public.products for update to authenticated
  using (public.has_permission('products','write'))
  with check (public.has_permission('products','write'));
create policy products_delete on public.products for delete to authenticated
  using (public.has_permission('products','delete'));

-- sales / sale_items / paid_loans
create policy sales_insert on public.sales for insert to authenticated
  with check (public.has_permission('sales','write'));
create policy sales_update on public.sales for update to authenticated
  using (public.has_permission('sales','write'))
  with check (public.has_permission('sales','write'));
create policy sales_delete on public.sales for delete to authenticated
  using (public.has_permission('sales','delete'));

create policy sale_items_write on public.sale_items for all to authenticated
  using (public.has_permission('sales','write'))
  with check (public.has_permission('sales','write'));

create policy paid_loans_write on public.paid_loans for all to authenticated
  using (public.has_permission('sales','collect'))
  with check (public.has_permission('sales','collect'));

-- employees / employee_actions
create policy employees_insert on public.employees for insert to authenticated
  with check (public.has_permission('employees','write'));
create policy employees_update on public.employees for update to authenticated
  using (public.has_permission('employees','write'))
  with check (public.has_permission('employees','write'));
create policy employees_delete on public.employees for delete to authenticated
  using (public.has_permission('employees','delete'));
create policy employees_select on public.employees for select to authenticated
  using (public.has_permission('employees','view'));

create policy employee_actions_select on public.employee_actions for select to authenticated
  using (public.has_permission('employees','view'));
create policy employee_actions_write on public.employee_actions for all to authenticated
  using (public.has_permission('employees','actions'))
  with check (public.has_permission('employees','actions'));

-- expenses
create policy expenses_select on public.expenses for select to authenticated
  using (public.has_permission('expenses','view'));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.has_permission('expenses','write'));
create policy expenses_update on public.expenses for update to authenticated
  using (public.has_permission('expenses','write'))
  with check (public.has_permission('expenses','write'));
create policy expenses_delete on public.expenses for delete to authenticated
  using (public.has_permission('expenses','delete'));

-- companies / company_purchases / purchase_payments
create policy companies_insert on public.companies for insert to authenticated
  with check (public.has_permission('companies','write'));
create policy companies_update on public.companies for update to authenticated
  using (public.has_permission('companies','write'))
  with check (public.has_permission('companies','write'));
create policy companies_delete on public.companies for delete to authenticated
  using (public.has_permission('companies','delete'));

create policy company_purchases_insert on public.company_purchases for insert to authenticated
  with check (public.has_permission('purchases','write'));
create policy company_purchases_update on public.company_purchases for update to authenticated
  using (public.has_permission('purchases','write'))
  with check (public.has_permission('purchases','write'));
create policy company_purchases_delete on public.company_purchases for delete to authenticated
  using (public.has_permission('purchases','delete'));

create policy purchase_payments_write on public.purchase_payments for all to authenticated
  using (public.has_permission('purchases','pay'))
  with check (public.has_permission('purchases','pay'));

-- dollar
create policy dollar_update on public.dollar for update to authenticated
  using (public.has_permission('dollar','write'))
  with check (public.has_permission('dollar','write'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Replace the broad 'is_authenticated_user' read policies with permission-gated
-- reads, so USER role respects per-section view grants.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists customers_read on public.customers;
drop policy if exists products_read  on public.products;
drop policy if exists sales_read     on public.sales;
drop policy if exists sale_items_read on public.sale_items;
drop policy if exists paid_loans_read on public.paid_loans;
drop policy if exists companies_read  on public.companies;
drop policy if exists company_purchases_read on public.company_purchases;
drop policy if exists purchase_payments_read on public.purchase_payments;
drop policy if exists dollar_read on public.dollar;

create policy customers_read         on public.customers         for select to authenticated using (public.has_permission('customers','view'));
create policy products_read          on public.products          for select to authenticated using (public.has_permission('products','view'));
create policy sales_read             on public.sales             for select to authenticated using (public.has_permission('sales','view'));
create policy sale_items_read        on public.sale_items        for select to authenticated using (public.has_permission('sales','view'));
create policy paid_loans_read        on public.paid_loans        for select to authenticated using (public.has_permission('sales','view'));
create policy companies_read         on public.companies         for select to authenticated using (public.has_permission('companies','view'));
create policy company_purchases_read on public.company_purchases for select to authenticated using (public.has_permission('purchases','view'));
create policy purchase_payments_read on public.purchase_payments for select to authenticated using (public.has_permission('purchases','view'));
create policy dollar_read            on public.dollar            for select to authenticated using (public.has_permission('dollar','view'));

-- backup_runs read: was admin/owner-only — now permission-gated
drop policy if exists backup_runs_read on public.backup_runs;
create policy backup_runs_read on public.backup_runs for select to authenticated using (public.has_permission('backups','view'));

-- ─────────────────────────────────────────────────────────────────────────────
-- transfer_ownership(new_owner_id) — only callable by current OWNER.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.transfer_ownership(new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'only the current OWNER may transfer ownership';
  end if;
  if new_owner = auth.uid() then
    raise exception 'new owner must differ from current owner';
  end if;
  if not exists (select 1 from public.profiles where id = new_owner and deleted_at is null) then
    raise exception 'target profile not found';
  end if;

  -- Demote self to ADMIN, then promote target — singleton trigger requires this order.
  update public.profiles set role = 'ADMIN' where id = auth.uid();
  update public.profiles set role = 'OWNER' where id = new_owner;
end$$;

revoke all on function public.transfer_ownership(uuid) from public;
grant execute on function public.transfer_ownership(uuid) to authenticated;

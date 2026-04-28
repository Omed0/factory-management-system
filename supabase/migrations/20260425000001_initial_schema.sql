-- Factory Management System — initial schema
-- Postgres 15+ / Supabase
-- Notes:
--   * `dollar` columns capture the IQD-USD rate at transaction time (intentional snapshot).
--   * Soft-delete uses `deleted_at`; partial unique indexes scope uniqueness to active rows.
--   * `auth.users` is the Supabase Auth source-of-truth; `public.profiles` is a 1:1 mirror for app data.

set check_function_bodies = off;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists btree_gist;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

create type public.company_purchase_type as enum ('CASH', 'LOAN');
create type public.sale_type             as enum ('CASH', 'LOAN');
create type public.employee_action_type  as enum ('PUNISHMENT', 'BONUS', 'ABSENT', 'OVERTIME');
create type public.unit_type             as enum ('METER', 'PIECE');
create type public.user_role             as enum ('OWNER', 'ADMIN', 'USER');

-- ─────────────────────────────────────────────────────────────────────────────
-- Site settings (singleton) — drives dynamic branding and first-run setup wizard.
-- The app reads this row on every request; an `id = 1` row is created lazily
-- the first time the app boots, and the first-run wizard fills it in.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.site_settings (
  id              integer primary key default 1 check (id = 1),

  -- Identity / branding
  factory_name    text        not null default 'My Factory',
  legal_name      text,
  tagline         text,
  logo_url        text,        -- Supabase Storage path (bucket: branding)
  favicon_url     text,
  primary_color   text        not null default '#0ea5e9',
  accent_color    text        not null default '#22c55e',

  -- Place
  address         text,
  city            text,
  country         text        not null default 'Iraq',
  phone           text,
  email           text,
  tax_id          text,

  -- Locale / currency
  language        text        not null default 'ckb',  -- Kurdish Sorani; ISO 639-3
  direction       text        not null default 'rtl' check (direction in ('ltr', 'rtl')),
  base_currency   text        not null default 'IQD',
  display_currency text       not null default 'IQD',
  default_dollar_rate numeric(12, 2) not null default 1500.00,

  -- Operational
  setup_completed boolean     not null default false,
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),

  -- Backup config
  backup_provider  text       not null default 'r2' check (backup_provider in ('r2', 'supabase', 'local', 'vps')),
  backup_keep_n    integer    not null default 2 check (backup_keep_n >= 1),
  backup_cron      text       not null default '0 3 * * *',  -- 03:00 UTC daily
  backup_last_run_at timestamptz,
  backup_last_status text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles — app-side user data, 1:1 with auth.users
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null,
  phone       text,
  image_url   text,
  role        public.user_role not null default 'USER',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_active_idx on public.profiles (id) where deleted_at is null;

-- Mirror new auth.users → public.profiles (name pulled from raw_user_meta_data.name)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    -- First user becomes OWNER; everyone after that is USER until an admin promotes them.
    case when (select count(*) from public.profiles where deleted_at is null) = 0
         then 'OWNER'::public.user_role
         else 'USER'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Dollar (singleton current exchange rate; mutable, audited via trigger)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.dollar (
  id         integer primary key default 1 check (id = 1),
  price      numeric(12, 2) not null default 1500.00,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.dollar (id) values (1) on conflict do nothing;

create table public.dollar_history (
  id         bigserial primary key,
  price      numeric(12, 2) not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.audit_dollar_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.price is distinct from old.price) or tg_op = 'INSERT' then
    insert into public.dollar_history (price, changed_by)
    values (new.price, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger dollar_audit
  before insert or update on public.dollar
  for each row execute function public.audit_dollar_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- Companies (suppliers)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.companies (
  id         bigserial primary key,
  name       text        not null,
  phone      text        not null,
  address    text        not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_active_idx on public.companies (id) where deleted_at is null;
create index companies_name_trgm  on public.companies using gin (name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Company purchases (and installments)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.company_purchases (
  id              bigserial primary key,
  name            text        not null,
  company_id      bigint      references public.companies(id) on delete set null,
  total_amount    numeric(14, 2) not null,
  total_remaining numeric(14, 2) not null default 0,
  type            public.company_purchase_type not null default 'CASH',
  note            text,
  purchase_date   timestamptz not null,
  dollar          numeric(12, 2) not null,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index company_purchases_company_idx on public.company_purchases (company_id);
create index company_purchases_active_idx  on public.company_purchases (id) where deleted_at is null;

create table public.purchase_payments (
  id                  bigserial primary key,
  company_purchase_id bigint      references public.company_purchases(id) on delete cascade,
  amount              numeric(14, 2) not null,
  paid_at             timestamptz not null,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index purchase_payments_purchase_idx on public.purchase_payments (company_purchase_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Customers
-- ─────────────────────────────────────────────────────────────────────────────

create table public.customers (
  id                    bigserial primary key,
  name                  text not null,
  phone                 text not null,
  address               text not null,
  is_salaried_employee  boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index customers_active_idx on public.customers (id) where deleted_at is null;
create index customers_name_trgm  on public.customers using gin (name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────────────────────────────────

create table public.products (
  id         bigserial primary key,
  name       text not null,
  price      numeric(14, 2) not null,
  dollar     numeric(12, 2) not null,
  image_url  text,
  unit_type  public.unit_type not null default 'PIECE',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_idx on public.products (id) where deleted_at is null;
create index products_name_trgm  on public.products using gin (name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sales (and items, paid_loans)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.sales (
  id              bigserial primary key,
  customer_id     bigint      references public.customers(id) on delete set null,
  sale_number     text        not null,
  total_amount    numeric(14, 2) not null default 0,
  total_remaining numeric(14, 2) not null default 0,
  sale_type       public.sale_type not null default 'CASH',
  discount        numeric(14, 2) not null default 0,
  monthly_paid    numeric(14, 2) not null default 0,
  sale_date       timestamptz not null default now(),
  is_finished     boolean     not null default false,
  fast_sale       boolean     not null default false,
  dollar          numeric(12, 2) not null,
  note            text,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Active-row uniqueness on sale_number (allows re-using a number after soft-delete).
create unique index sales_active_number_unq on public.sales (sale_number) where deleted_at is null;
create index sales_customer_idx on public.sales (customer_id);
create index sales_active_idx   on public.sales (id) where deleted_at is null;

create table public.sale_items (
  id         bigserial primary key,
  sale_id    bigint      references public.sales(id) on delete cascade,
  product_id bigint      references public.products(id) on delete set null,
  price      numeric(14, 2) not null,
  name       text        not null,
  quantity   integer     not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sale_items_sale_idx    on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);

create table public.paid_loans (
  id        bigserial primary key,
  sale_id   bigint      references public.sales(id) on delete cascade,
  amount    numeric(14, 2) not null,
  paid_at   timestamptz not null,
  note      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paid_loans_sale_idx on public.paid_loans (sale_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Employees + employee actions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.employees (
  id            bigserial primary key,
  name          text not null,
  phone         text,
  address       text,
  image_url     text,
  month_salary  numeric(14, 2) not null,
  dollar        numeric(12, 2) not null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index employees_active_idx on public.employees (id) where deleted_at is null;

create table public.employee_actions (
  id          bigserial primary key,
  employee_id bigint      references public.employees(id) on delete set null,
  type        public.employee_action_type not null,
  amount      numeric(14, 2) not null,
  dollar      numeric(12, 2) not null,
  note        text,
  action_date timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index employee_actions_employee_idx on public.employee_actions (employee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Expenses
-- ─────────────────────────────────────────────────────────────────────────────

create table public.expenses (
  id         bigserial primary key,
  title      text not null,
  note       text,
  amount     numeric(14, 2) not null,
  dollar     numeric(12, 2) not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_active_idx on public.expenses (id) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backup runs (history of scheduled/manual backups)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.backup_runs (
  id          bigserial primary key,
  kind        text not null check (kind in ('scheduled', 'manual')),
  destination text not null check (destination in ('r2', 'supabase', 'local', 'vps')),
  storage_key text,                       -- bucket key / file path
  size_bytes  bigint,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running', 'success', 'failed')),
  error       text,
  triggered_by uuid references public.profiles(id) on delete set null
);

create index backup_runs_started_idx on public.backup_runs (started_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Generic updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'site_settings','profiles','companies','company_purchases','purchase_payments',
      'customers','products','sales','sale_items','paid_loans',
      'employees','employee_actions','expenses'
    ])
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end$$;

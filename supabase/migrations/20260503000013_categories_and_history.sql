-- Schema additions to support new reports/dashboard charts:
--   1. expenses.category — free-text categorization for expense breakdown chart.
--   2. dollar_history    — auto-tracked rate changes for the exchange-rate line chart.

-- ─────────────────────────────────────────────────────────────────────────────
-- Expense categories
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.expenses add column if not exists category text;

create index if not exists expenses_category_idx
  on public.expenses (category)
  where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Dollar rate history
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.dollar_history (
  id          bigserial primary key,
  price       numeric(12, 2) not null,
  recorded_at timestamptz    not null default now()
);

create index if not exists dollar_history_recorded_idx
  on public.dollar_history (recorded_at desc);

create or replace function public.record_dollar_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dollar_history (price) values (new.price);
  return new;
end;
$$;

drop trigger if exists dollar_history_track on public.dollar;
create trigger dollar_history_track
  after insert or update of price on public.dollar
  for each row execute function public.record_dollar_change();

-- Backfill: snapshot the current rate so the history table isn't empty on
-- pre-existing systems. Idempotent because we only insert if there's no row yet.
insert into public.dollar_history (price, recorded_at)
select price, now() from public.dollar where id = 1
  and not exists (select 1 from public.dollar_history limit 1);

alter table public.dollar_history enable row level security;

drop policy if exists "dollar_history view" on public.dollar_history;
create policy "dollar_history view" on public.dollar_history
  for select to authenticated using (true);

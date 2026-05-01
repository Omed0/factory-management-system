-- Storage buckets + pg_cron scheduled backup
-- Requires the Supabase storage schema (provisioned by the storage-api container)
-- and pg_cron extension (provisioned by the supabase/postgres image).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─────────────────────────────────────────────────────────────────────────────
-- Buckets
--   branding   — public; logo / favicon
--   products   — public; product images
--   employees  — private; employee photos
--   backups    — private; nightly pg_dump archives (only used when provider = 'supabase')
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('branding',  'branding',  true),
  ('products',  'products',  true),
  ('employees', 'employees', false),
  ('backups',   'backups',   false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Public buckets: anyone can read; only ADMIN/OWNER can write.
create policy "branding read"  on storage.objects for select to anon, authenticated
  using (bucket_id = 'branding');
create policy "branding write" on storage.objects for all    to authenticated
  using (bucket_id = 'branding' and public.is_admin_or_owner())
  with check (bucket_id = 'branding' and public.is_admin_or_owner());

create policy "products read"  on storage.objects for select to anon, authenticated
  using (bucket_id = 'products');
create policy "products write" on storage.objects for all    to authenticated
  using (bucket_id = 'products' and public.is_admin_or_owner())
  with check (bucket_id = 'products' and public.is_admin_or_owner());

-- Private bucket: any signed-in staff can read employee photos; only ADMIN/OWNER can write.
create policy "employees read"  on storage.objects for select to authenticated
  using (bucket_id = 'employees' and public.is_authenticated_user());
create policy "employees write" on storage.objects for all    to authenticated
  using (bucket_id = 'employees' and public.is_admin_or_owner())
  with check (bucket_id = 'employees' and public.is_admin_or_owner());

-- Backups: only OWNER may read; writes are service_role-only (Edge Function).
create policy "backups read" on storage.objects for select to authenticated
  using (bucket_id = 'backups' and public.is_owner());

-- ─────────────────────────────────────────────────────────────────────────────
-- Scheduled backup — pg_cron triggers the `backup` Edge Function nightly.
-- The function reads site_settings.backup_cron / .backup_provider / .backup_keep_n
-- and is responsible for: pg_dump → upload → register in backup_runs → rotate.
--
-- The cron schedule below is a static fallback (03:00 UTC daily). When the user
-- changes site_settings.backup_cron via the UI, a trigger updates this job.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: invoke the backup edge function (uses pg_net so the cron job stays async).
create or replace function public.invoke_backup_fn()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := current_setting('app.settings.edge_functions_url', true) || '/backup';
  service_key text := current_setting('app.settings.service_role_key', true);
begin
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := jsonb_build_object('kind', 'scheduled')
  );
end$$;

-- Schedule (replaceable). When site_settings.backup_cron changes we re-schedule.
select cron.schedule(
  'fms-nightly-backup',
  '0 3 * * *',
  $$select public.invoke_backup_fn()$$
);

create or replace function public.reschedule_backup_cron()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.backup_cron is distinct from old.backup_cron then
    perform cron.unschedule('fms-nightly-backup');
    perform cron.schedule('fms-nightly-backup', new.backup_cron,
      $$select public.invoke_backup_fn()$$);
  end if;
  return new;
end$fn$;

create trigger site_settings_reschedule_backup
  after update on public.site_settings
  for each row execute function public.reschedule_backup_cron();

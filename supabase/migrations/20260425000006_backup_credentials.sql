-- Store R2 credentials in site_settings so OWNER can configure from the UI.
-- The backup server fn and edge fn prefer these over env vars when set.

alter table public.site_settings
  add column if not exists r2_endpoint          text,
  add column if not exists r2_bucket            text not null default 'fms-backups',
  add column if not exists r2_access_key_id     text,
  add column if not exists r2_secret_access_key text;

-- Extend the ADMIN guard to block changes to the new credential columns.
create or replace function public.guard_site_settings_admin()
returns trigger language plpgsql as $$
begin
  if public.current_role() = 'ADMIN' then
    if (
      new.backup_provider, new.backup_keep_n, new.backup_cron,
      new.r2_endpoint, new.r2_bucket, new.r2_access_key_id, new.r2_secret_access_key
    ) is distinct from (
      old.backup_provider, old.backup_keep_n, old.backup_cron,
      old.r2_endpoint, old.r2_bucket, old.r2_access_key_id, old.r2_secret_access_key
    ) then
      raise exception 'ADMIN may not change backup configuration';
    end if;
  end if;
  return new;
end$$;

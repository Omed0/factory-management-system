-- Resets all identity sequences in the public schema after a bulk restore.
-- Called via admin.rpc('reset_public_sequences') from the restore server fn.
-- SECURITY DEFINER so it can access sequences regardless of caller role.

create or replace function public.reset_public_sequences()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    begin
      execute format(
        $sql$
          select setval(
            pg_get_serial_sequence(%L, 'id'),
            greatest(coalesce((select max(id) from %I), 0), 0) + 1,
            false
          )
        $sql$,
        'public.' || t, t
      );
    exception when others then
      -- table has no id column or no serial sequence — skip silently
      null;
    end;
  end loop;
end;
$$;

-- Only service_role (admin client) may call this.
revoke all on function public.reset_public_sequences() from public, anon, authenticated;
grant execute on function public.reset_public_sequences() to service_role;

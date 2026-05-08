-- Fix storage INSERT policies for products and branding buckets.
-- Root cause: is_authenticated_user() queries the profiles table. If the profile row
-- doesn't exist yet (timing race on first-run) or the browser session isn't fully
-- hydrated, the function returns false → INSERT blocked → RLS violation on upload.
-- The `to authenticated` clause already guarantees a valid JWT, so checking
-- auth.uid() IS NOT NULL is sufficient for INSERT. UPDATE/DELETE still verify the
-- profile exists via is_authenticated_user() to prevent action by soft-deleted users.

-- Products bucket
drop policy if exists "products write" on storage.objects;

create policy "products insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and auth.uid() is not null);

create policy "products update" on storage.objects
  for update to authenticated
  using  (bucket_id = 'products' and public.is_authenticated_user())
  with check (bucket_id = 'products' and public.is_authenticated_user());

create policy "products delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_authenticated_user());

-- Branding bucket
drop policy if exists "branding write" on storage.objects;

create policy "branding insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and auth.uid() is not null);

create policy "branding update" on storage.objects
  for update to authenticated
  using  (bucket_id = 'branding' and public.is_authenticated_user())
  with check (bucket_id = 'branding' and public.is_authenticated_user());

create policy "branding delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and public.is_authenticated_user());

-- Fix 1: Change backup_provider default from 'r2' to 'supabase' so fresh installs
--         don't fail with "R2 credentials not configured" on first manual backup.
ALTER TABLE public.site_settings
  ALTER COLUMN backup_provider SET DEFAULT 'supabase';

-- Update the existing singleton row only when no R2 credentials have been entered,
-- meaning the user never intentionally chose R2.
UPDATE public.site_settings
SET backup_provider = 'supabase'
WHERE id = 1
  AND backup_provider = 'r2'
  AND r2_endpoint IS NULL
  AND r2_access_key_id IS NULL;

-- Fix 2: Allow any authenticated user to write to the employees storage bucket.
--        Previously blocked by is_admin_or_owner(), which prevented USER-role staff
--        from uploading employee photos even when they had employees:write permission.
--        Data-level security is enforced by server functions via has_permission().
DROP POLICY IF EXISTS "employees write" ON storage.objects;
CREATE POLICY "employees write" ON storage.objects
  FOR ALL TO authenticated
  USING    (bucket_id = 'employees' AND public.is_authenticated_user())
  WITH CHECK (bucket_id = 'employees' AND public.is_authenticated_user());

-- Fix employees storage INSERT policy (same as migration 0014 for products/branding)
-- The ALL policy uses is_authenticated_user() which can cause RLS recursion on INSERT.

DROP POLICY IF EXISTS "employees write" ON storage.objects;

CREATE POLICY "employees insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employees' AND auth.uid() IS NOT NULL);

CREATE POLICY "employees update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employees' AND is_authenticated_user())
  WITH CHECK (bucket_id = 'employees' AND is_authenticated_user());

CREATE POLICY "employees delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employees' AND is_authenticated_user());

-- Add warehouse and inventory permissions to the permission catalog.
-- OWNER and ADMIN automatically get all permissions via has_permission().
-- USER-role staff need explicit grants for these resources.

INSERT INTO public.permission_catalog (resource, action, label) VALUES
  ('warehouses', 'view',   'View warehouses'),
  ('warehouses', 'write',  'Create / edit warehouses'),
  ('warehouses', 'delete', 'Delete warehouses'),
  ('inventory',  'view',   'View inventory levels'),
  ('inventory',  'write',  'Adjust inventory manually')
ON CONFLICT DO NOTHING;

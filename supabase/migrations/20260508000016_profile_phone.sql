-- Add phone field to profiles so users can store a contact number.
alter table public.profiles add column if not exists phone text;

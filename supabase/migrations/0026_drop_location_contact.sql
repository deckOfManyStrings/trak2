-- Remove location contact fields.

alter table public.locations
  drop column if exists contact_name,
  drop column if exists contact_phone;

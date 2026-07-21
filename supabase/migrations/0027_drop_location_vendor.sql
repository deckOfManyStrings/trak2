-- Remove vendor fields from locations (regional center stays).

alter table public.locations
  drop column if exists vendor_name,
  drop column if exists vendor_number,
  drop column if exists vendor_address;

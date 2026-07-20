-- Contact, vendor, and regional center fields on locations for
-- marketing / vendor records. Dropdown values are intentionally small
-- starter sets and can be expanded later.

alter table public.locations
  add column contact_name text,
  add column contact_phone text,
  add column service_type text
    check (
      service_type is null
      or service_type in (
        'day_program',
        'adult_care_home',
        'ils',
        'sls'
      )
    ),
  add column vendor_name text,
  add column vendor_number text,
  add column regional_center text
    check (
      regional_center is null
      or regional_center in (
        'vmrc',
        'acrc',
        'sarc'
      )
    ),
  add column vendor_address text,
  add column business_address text;

comment on column public.locations.contact_name is
  'Primary contact name for the location (e.g. person who purchased the app).';
comment on column public.locations.contact_phone is
  'Primary contact phone for the location.';
comment on column public.locations.service_type is
  'Type of service site: day_program, adult_care_home, ils, or sls.';
comment on column public.locations.address is
  'Street address of the day program, care home, or service site.';
comment on column public.locations.vendor_name is
  'Vendor / provider name on file with the regional center.';
comment on column public.locations.vendor_number is
  'Vendor number on file with the regional center.';
comment on column public.locations.regional_center is
  'California regional center code (starter set: vmrc, acrc, sarc).';
comment on column public.locations.vendor_address is
  'Vendor mailing / billing address.';
comment on column public.locations.business_address is
  'Business address for the organization.';

-- Adds emergency contact fields on clients.

alter table public.clients
  add column emergency_contact_name text,
  add column emergency_contact_relationship text
    check (
      emergency_contact_relationship is null
      or emergency_contact_relationship in (
        'parent',
        'home_provider',
        'sibling',
        'relative',
        'self'
      )
    ),
  add column emergency_contact_phone text,
  add column emergency_contact_address text,
  add column emergency_contact_email text;

comment on column public.clients.emergency_contact_name is
  'Name of the client''s emergency contact.';
comment on column public.clients.emergency_contact_relationship is
  'Relationship of the emergency contact to the client (parent, home_provider, sibling, relative, or self).';
comment on column public.clients.emergency_contact_phone is
  'Phone number for the client''s emergency contact.';
comment on column public.clients.emergency_contact_address is
  'Address for the client''s emergency contact.';
comment on column public.clients.emergency_contact_email is
  'Email address for the client''s emergency contact.';

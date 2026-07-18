-- Adds service coordinator contact fields on clients.

alter table public.clients
  add column service_coordinator_name text,
  add column service_coordinator_phone text,
  add column service_coordinator_email text;

comment on column public.clients.service_coordinator_name is
  'Name of the client''s service coordinator.';
comment on column public.clients.service_coordinator_phone is
  'Phone number for the client''s service coordinator.';
comment on column public.clients.service_coordinator_email is
  'Email address for the client''s service coordinator.';

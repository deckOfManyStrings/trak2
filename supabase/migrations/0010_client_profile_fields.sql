-- Adds the client demographic fields and location program description
-- needed for the Annual Assessment Report feature.

alter table public.clients
  add column date_of_birth date,
  add column date_of_admission date;

alter table public.locations
  add column program_description text;

comment on column public.clients.date_of_birth is
  'Client date of birth, shown on the Annual Assessment Report header.';
comment on column public.clients.date_of_admission is
  'Date the client was admitted to the program, shown on the Annual Assessment Report header.';
comment on column public.locations.program_description is
  'Admin-authored description of the program/care center, reused in the "Program Overview" section of every Annual Assessment Report generated for clients at this location.';

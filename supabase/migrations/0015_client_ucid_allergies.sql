-- Adds UCID and allergies fields on clients.

alter table public.clients
  add column ucid text,
  add column allergies text;

comment on column public.clients.ucid is
  'Unique Client Identifier (UCID) for the client.';
comment on column public.clients.allergies is
  'Free-text notes about the client''s allergies.';

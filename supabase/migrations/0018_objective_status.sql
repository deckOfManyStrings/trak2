-- Soft-retire checklist objectives so daily marks are kept when a skill
-- is no longer tracked. Hard delete remains available for mistakes.

create type public.objective_status as enum ('active', 'retired');

alter table public.objectives
  add column status public.objective_status not null default 'active';

create index objectives_client_id_status_idx
  on public.objectives (client_id, status);

comment on column public.objectives.status is
  'active = shown on the daily checklist; retired = hidden from entry but marks retained.';

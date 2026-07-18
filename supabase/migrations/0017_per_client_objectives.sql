-- Makes checklist objectives per-client instead of shared across an
-- admin account. Existing account-wide objectives are cloned onto each
-- of that admin's clients (preserving checklist_entries and annual
-- report objective FKs), then the shared rows are removed. New clients
-- get the 3 default objectives via a trigger.

-- 1. Add client_id (nullable during backfill). Drop the account-wide
-- unique(owner_id, position) first so we can clone the same positions
-- onto multiple clients under one owner.
alter table public.objectives
  add column client_id uuid references public.clients (id) on delete cascade;

alter table public.objectives
  drop constraint if exists objectives_owner_id_position_key;

-- 2. Build a remap of old shared objective -> per-client clone.
create table public._objective_clone_map (
  old_id uuid not null,
  client_id uuid not null,
  new_id uuid not null default gen_random_uuid(),
  primary key (old_id, client_id)
);

insert into public._objective_clone_map (old_id, client_id)
select o.id, c.id
from public.objectives o
join public.clients c on c.owner_id = o.owner_id
where o.client_id is null;

insert into public.objectives (id, owner_id, client_id, title, position, created_at)
select m.new_id, o.owner_id, m.client_id, o.title, o.position, o.created_at
from public._objective_clone_map m
join public.objectives o on o.id = m.old_id;

-- Remap daily marks to the clone for that same client.
update public.checklist_entries ce
set objective_id = m.new_id
from public._objective_clone_map m
where ce.objective_id = m.old_id
  and ce.client_id = m.client_id;

-- Remap annual-report objective FKs (titles are already snapshotted).
update public.annual_report_objectives aro
set objective_id = m.new_id
from public.annual_reports ar
join public._objective_clone_map m
  on m.client_id = ar.client_id
where aro.annual_report_id = ar.id
  and m.old_id = aro.objective_id;

-- Drop shared (pre-clone) rows. Cascade is safe: entries/report FKs
-- already point at the clones.
delete from public.objectives where client_id is null;

drop table public._objective_clone_map;

-- 3. Lock in per-client shape.
alter table public.objectives
  alter column client_id set not null;

alter table public.objectives
  add constraint objectives_client_id_position_key unique (client_id, position);

create index objectives_client_id_idx on public.objectives (client_id);

comment on table public.objectives is
  'Checklist objectives for one client. Each client has their own list; wording and membership are independent per client.';

comment on column public.objectives.client_id is
  'The client this objective belongs to. Cascade-deleted with the client.';

-- 4. Stop seeding account-wide objectives on admin signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
  new_owner_id uuid;
begin
  new_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'admin');
  new_owner_id := nullif(new.raw_user_meta_data ->> 'invited_by', '')::uuid;

  insert into public.profiles (id, role, owner_id, email, full_name, status)
  values (
    new.id,
    new_role,
    new_owner_id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    (case when new_role = 'staff' then 'invited' else 'active' end)::public.account_status
  );

  return new;
end;
$$;

-- 5. Seed the 3 defaults whenever a client is created.
create or replace function public.seed_client_objectives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.objectives (owner_id, client_id, title, position)
  values
    (new.owner_id, new.id, 'Ask for help', 1),
    (new.owner_id, new.id, 'Follow outing directions', 2),
    (new.owner_id, new.id, 'State preference', 3);
  return new;
end;
$$;

create trigger clients_seed_objectives
after insert on public.clients
for each row execute function public.seed_client_objectives();

-- 6. Tighten staff RLS to the objective's client location; allow staff
-- to manage (add/delete) objectives for clients at their locations.
drop policy if exists "objectives_staff_select" on public.objectives;

create policy "objectives_staff_select"
on public.objectives for select
using (
  exists (
    select 1 from public.clients c
    where c.id = objectives.client_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "objectives_staff_insert"
on public.objectives for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = objectives.client_id
      and c.owner_id = objectives.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "objectives_staff_update"
on public.objectives for update
using (
  exists (
    select 1 from public.clients c
    where c.id = objectives.client_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = objectives.client_id
      and c.owner_id = objectives.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "objectives_staff_delete"
on public.objectives for delete
using (
  exists (
    select 1 from public.clients c
    where c.id = objectives.client_id
      and public.is_staff_at_location(c.location_id)
  )
);

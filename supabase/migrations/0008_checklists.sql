-- Daily client checklist, replacing the per-client monthly Excel sheet.
--
-- Every admin account has a small, shared set of objectives (e.g. "Ask for
-- help") that apply to all of their clients. Each day, staff record a
-- checklist_value for each (client, objective) pair. Who recorded it is
-- captured automatically (staff_id + a text snapshot of their name so the
-- history survives that staff member later being removed) rather than
-- typed in by hand.

create type public.checklist_value as enum ('Y', 'N', 'H', 'NP', 'N/A');

-- One row per objective per admin account. Company-wide (shared across all
-- of that admin's clients), but kept in the database rather than
-- hardcoded so the wording can be changed later.
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  unique (owner_id, position)
);

create index objectives_owner_id_idx on public.objectives (owner_id);

comment on table public.objectives is
  'The shared checklist objectives for one admin account, applied to every one of their clients.';

-- One row per client + objective + day. `owner_id` duplicates
-- clients.owner_id (same denormalization the clients table itself does for
-- locations) purely to keep the admin RLS policy a simple column compare.
create table public.checklist_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  objective_id uuid not null references public.objectives (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  value public.checklist_value not null,
  staff_id uuid references public.profiles (id) on delete set null,
  recorded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, objective_id, entry_date)
);

create index checklist_entries_owner_id_idx on public.checklist_entries (owner_id);
create index checklist_entries_client_id_idx on public.checklist_entries (client_id);
create index checklist_entries_entry_date_idx on public.checklist_entries (entry_date);

comment on table public.checklist_entries is
  'Daily Y/N/H/NP/N-A marks per client and objective. staff_id + recorded_by_name capture who recorded each mark.';

create trigger checklist_entries_set_updated_at
before update on public.checklist_entries
for each row execute function public.set_updated_at();

-- Extends handle_new_user() (see 0001/0003) to also seed the 3 default
-- objectives whenever a new admin account is created. Existing admins
-- (anyone who signed up before this migration) are self-healed by the
-- application the first time they open the checklist feature, the same
-- way getSessionProfile() self-heals a missing profile row.
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

  if new_role = 'admin' then
    insert into public.objectives (owner_id, title, position)
    values
      (new.id, 'Ask for help', 1),
      (new.id, 'Follow outing directions', 2),
      (new.id, 'State preference', 3);
  end if;

  return new;
end;
$$;

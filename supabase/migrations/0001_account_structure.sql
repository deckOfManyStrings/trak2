-- Account structure for the adult day care app.
-- See: Adult Day Care Account Structure plan.
--
-- Single-owner model: every admin who signs up owns an isolated set of
-- locations, staff, and clients. Staff are invited by an admin and are
-- linked back to that admin via profiles.owner_id. Clients have no login
-- of their own; they are plain records scoped to a location.

create type public.user_role as enum ('admin', 'staff');
create type public.account_status as enum ('invited', 'active', 'inactive');

-- One row per auth.users row. Admins have owner_id = null (they are the
-- root of their own account). Staff have owner_id = the inviting admin's id.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'admin',
  owner_id uuid references public.profiles (id) on delete cascade,
  email text not null,
  full_name text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint profiles_owner_matches_role check (
    (role = 'admin' and owner_id is null) or
    (role = 'staff' and owner_id is not null)
  )
);

create index profiles_owner_id_idx on public.profiles (owner_id);

comment on table public.profiles is
  'Extends auth.users with a role and, for staff, a link back to the owning admin.';

-- Day care sites. Always owned by exactly one admin.
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create index locations_owner_id_idx on public.locations (owner_id);

-- Many-to-many staff <-> location join table. The app's UI defaults to
-- keeping exactly one row per staff member (drag-and-drop reassignment
-- replaces the row) but the schema does not enforce that, so a staff
-- member could be linked to more than one location in the future.
create table public.staff_locations (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (staff_id, location_id)
);

create index staff_locations_staff_id_idx on public.staff_locations (staff_id);
create index staff_locations_location_id_idx on public.staff_locations (location_id);

-- Day care attendees. Always belong to exactly one location. Only admins
-- can create them; staff assigned to that location can view/update them.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete restrict,
  full_name text not null,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_owner_id_idx on public.clients (owner_id);
create index clients_location_id_idx on public.clients (location_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- Creates the matching profile row whenever a new auth user is created,
-- whether that's a self-serve signup (becomes an admin) or a staff member
-- accepting an invite (auth.admin.inviteUserByEmail with role/invited_by
-- metadata, becomes staff owned by the inviting admin).
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
    case when new_role = 'staff' then 'invited' else 'active' end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Resolves the "account scope" id for the currently authenticated user:
-- an admin's own id, or the id of the admin who owns the calling staff
-- member. Security definer so it can read profiles regardless of RLS
-- (used inside RLS policies themselves, so it must not recurse through them).
create or replace function public.account_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(owner_id, id) from public.profiles where id = auth.uid();
$$;

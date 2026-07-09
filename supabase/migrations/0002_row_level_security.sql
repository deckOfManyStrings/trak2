-- Row Level Security for the account structure introduced in
-- 0001_account_structure.sql.
--
-- Admin access is scoped by owner_id = public.account_owner_id().
-- Staff access is scoped through their staff_locations rows: they can only
-- see locations/clients tied to a location they're assigned to.

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.staff_locations enable row level security;
alter table public.clients enable row level security;

-- profiles: no insert/delete policies are defined on purpose. Rows are
-- created only by the handle_new_user trigger (security definer) and
-- removed by deleting the underlying auth.users row via the admin API,
-- both of which bypass RLS.

create policy "profiles_select_self"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_select_own_staff"
on public.profiles for select
using (owner_id = auth.uid());

create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_update_own_staff"
on public.profiles for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- locations

create policy "locations_admin_all"
on public.locations for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "locations_staff_select"
on public.locations for select
using (
  exists (
    select 1 from public.staff_locations sl
    where sl.location_id = locations.id
      and sl.staff_id = auth.uid()
  )
);

-- staff_locations

create policy "staff_locations_admin_all"
on public.staff_locations for all
using (
  exists (
    select 1 from public.locations l
    where l.id = staff_locations.location_id
      and l.owner_id = public.account_owner_id()
  )
)
with check (
  exists (
    select 1 from public.locations l
    where l.id = staff_locations.location_id
      and l.owner_id = public.account_owner_id()
  )
);

create policy "staff_locations_self_select"
on public.staff_locations for select
using (staff_id = auth.uid());

-- clients

create policy "clients_admin_all"
on public.clients for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "clients_staff_select"
on public.clients for select
using (
  exists (
    select 1 from public.staff_locations sl
    where sl.location_id = clients.location_id
      and sl.staff_id = auth.uid()
  )
);

create policy "clients_staff_update"
on public.clients for update
using (
  exists (
    select 1 from public.staff_locations sl
    where sl.location_id = clients.location_id
      and sl.staff_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.staff_locations sl
    where sl.location_id = clients.location_id
      and sl.staff_id = auth.uid()
  )
);

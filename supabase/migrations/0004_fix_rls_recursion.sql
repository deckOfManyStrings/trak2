-- Fixes "infinite recursion detected in policy for relation locations"
-- (Postgres error 42P17).
--
-- The cause: locations_staff_select queries staff_locations, and
-- staff_locations_admin_all queries locations right back. Postgres has to
-- evaluate every policy on a table for any select against it, so this pair
-- forms a cycle regardless of the actual data.
--
-- The fix is the standard Supabase pattern: move the cross-table checks
-- into SECURITY DEFINER functions. Security definer functions run as the
-- function owner and are not subject to the RLS of tables they query
-- (since those tables don't have FORCE ROW LEVEL SECURITY set), which
-- breaks the cycle.

create or replace function public.is_staff_at_location(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_locations
    where location_id = target_location_id
      and staff_id = auth.uid()
  );
$$;

create or replace function public.is_admin_of_location(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.locations
    where id = target_location_id
      and owner_id = public.account_owner_id()
  );
$$;

drop policy if exists "locations_staff_select" on public.locations;
create policy "locations_staff_select"
on public.locations for select
using (public.is_staff_at_location(id));

drop policy if exists "staff_locations_admin_all" on public.staff_locations;
create policy "staff_locations_admin_all"
on public.staff_locations for all
using (public.is_admin_of_location(location_id))
with check (public.is_admin_of_location(location_id));

drop policy if exists "clients_staff_select" on public.clients;
create policy "clients_staff_select"
on public.clients for select
using (public.is_staff_at_location(location_id));

drop policy if exists "clients_staff_update" on public.clients;
create policy "clients_staff_update"
on public.clients for update
using (public.is_staff_at_location(location_id))
with check (public.is_staff_at_location(location_id));

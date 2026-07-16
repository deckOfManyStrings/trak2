-- Fixes an account-wide over-permissive RLS gap: every "*_admin_all" policy
-- (on locations, staff_locations, clients, objectives, checklist_entries,
-- annual_reports, annual_report_objectives) only checked
-- owner_id = public.account_owner_id(). That condition is true for a staff
-- member's own account_owner_id() just as much as for the admin themselves
-- (it resolves to the id of the admin who owns them), so every staff member
-- was silently getting the same full read/write access as an admin on every
-- row in the account, regardless of the narrower, location-scoped
-- "*_staff_*" policies that were supposed to be the real restriction for
-- staff. Postgres OR's RLS policies together, so the blanket admin policy
-- always won.
--
-- Fix: require the caller to actually be an admin before that blanket
-- policy applies, so staff fall through to the location-scoped policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select role = 'admin' from public.profiles where id = auth.uid();
$$;

-- locations
drop policy if exists "locations_admin_all" on public.locations;
create policy "locations_admin_all"
on public.locations for all
using (owner_id = public.account_owner_id() and public.is_admin())
with check (owner_id = public.account_owner_id() and public.is_admin());

-- staff_locations
drop policy if exists "staff_locations_admin_all" on public.staff_locations;
create policy "staff_locations_admin_all"
on public.staff_locations for all
using (
  exists (
    select 1 from public.locations l
    where l.id = staff_locations.location_id
      and l.owner_id = public.account_owner_id()
  )
  and public.is_admin()
)
with check (
  exists (
    select 1 from public.locations l
    where l.id = staff_locations.location_id
      and l.owner_id = public.account_owner_id()
  )
  and public.is_admin()
);

-- clients
drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_all"
on public.clients for all
using (owner_id = public.account_owner_id() and public.is_admin())
with check (owner_id = public.account_owner_id() and public.is_admin());

-- objectives
drop policy if exists "objectives_admin_all" on public.objectives;
create policy "objectives_admin_all"
on public.objectives for all
using (owner_id = public.account_owner_id() and public.is_admin())
with check (owner_id = public.account_owner_id() and public.is_admin());

-- checklist_entries
drop policy if exists "checklist_entries_admin_all" on public.checklist_entries;
create policy "checklist_entries_admin_all"
on public.checklist_entries for all
using (owner_id = public.account_owner_id() and public.is_admin())
with check (owner_id = public.account_owner_id() and public.is_admin());

-- annual_reports
drop policy if exists "annual_reports_admin_all" on public.annual_reports;
create policy "annual_reports_admin_all"
on public.annual_reports for all
using (owner_id = public.account_owner_id() and public.is_admin())
with check (owner_id = public.account_owner_id() and public.is_admin());

-- annual_report_objectives
drop policy if exists "annual_report_objectives_admin_all" on public.annual_report_objectives;
create policy "annual_report_objectives_admin_all"
on public.annual_report_objectives for all
using (
  exists (
    select 1 from public.annual_reports ar
    where ar.id = annual_report_objectives.annual_report_id
      and ar.owner_id = public.account_owner_id()
  )
  and public.is_admin()
)
with check (
  exists (
    select 1 from public.annual_reports ar
    where ar.id = annual_report_objectives.annual_report_id
      and ar.owner_id = public.account_owner_id()
  )
  and public.is_admin()
);

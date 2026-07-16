-- Row Level Security for the annual report tables introduced in
-- 0011_annual_reports.sql. Mirrors the pattern used for
-- objectives/checklist_entries in 0009_checklist_rls.sql: admin access is
-- scoped by owner_id = public.account_owner_id(), staff access is scoped
-- through their staff_locations rows via public.is_staff_at_location().

alter table public.annual_reports enable row level security;
alter table public.annual_report_objectives enable row level security;

-- annual_reports: admins have full access; staff can read/record/update
-- (not delete) reports for clients at a location they're assigned to.

create policy "annual_reports_admin_all"
on public.annual_reports for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "annual_reports_staff_select"
on public.annual_reports for select
using (
  exists (
    select 1 from public.clients c
    where c.id = annual_reports.client_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "annual_reports_staff_insert"
on public.annual_reports for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = annual_reports.client_id
      and c.owner_id = annual_reports.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "annual_reports_staff_update"
on public.annual_reports for update
using (
  exists (
    select 1 from public.clients c
    where c.id = annual_reports.client_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = annual_reports.client_id
      and c.owner_id = annual_reports.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

-- annual_report_objectives: same shape, joined back through annual_reports
-- (and from there through clients) to resolve location scoping.

create policy "annual_report_objectives_admin_all"
on public.annual_report_objectives for all
using (
  exists (
    select 1 from public.annual_reports ar
    where ar.id = annual_report_objectives.annual_report_id
      and ar.owner_id = public.account_owner_id()
  )
)
with check (
  exists (
    select 1 from public.annual_reports ar
    where ar.id = annual_report_objectives.annual_report_id
      and ar.owner_id = public.account_owner_id()
  )
);

create policy "annual_report_objectives_staff_select"
on public.annual_report_objectives for select
using (
  exists (
    select 1 from public.annual_reports ar
    join public.clients c on c.id = ar.client_id
    where ar.id = annual_report_objectives.annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "annual_report_objectives_staff_insert"
on public.annual_report_objectives for insert
with check (
  exists (
    select 1 from public.annual_reports ar
    join public.clients c on c.id = ar.client_id
    where ar.id = annual_report_objectives.annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "annual_report_objectives_staff_update"
on public.annual_report_objectives for update
using (
  exists (
    select 1 from public.annual_reports ar
    join public.clients c on c.id = ar.client_id
    where ar.id = annual_report_objectives.annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.annual_reports ar
    join public.clients c on c.id = ar.client_id
    where ar.id = annual_report_objectives.annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

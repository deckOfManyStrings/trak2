-- Row Level Security for the checklist tables introduced in
-- 0008_checklists.sql. Mirrors the pattern used for locations/clients in
-- 0002_row_level_security.sql and 0004_fix_rls_recursion.sql: admin access
-- is scoped by owner_id = public.account_owner_id(), staff access is scoped
-- through their staff_locations rows via public.is_staff_at_location().

alter table public.objectives enable row level security;
alter table public.checklist_entries enable row level security;

-- objectives: admins manage the wording, staff just need to read it to
-- render the checklist columns.

create policy "objectives_admin_all"
on public.objectives for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "objectives_staff_select"
on public.objectives for select
using (owner_id = public.account_owner_id());

-- checklist_entries: admins have full access; staff can read/record/update
-- (not delete) entries for clients at a location they're assigned to.

create policy "checklist_entries_admin_all"
on public.checklist_entries for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "checklist_entries_staff_select"
on public.checklist_entries for select
using (
  exists (
    select 1 from public.clients c
    where c.id = checklist_entries.client_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "checklist_entries_staff_insert"
on public.checklist_entries for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = checklist_entries.client_id
      and c.owner_id = checklist_entries.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "checklist_entries_staff_update"
on public.checklist_entries for update
using (
  exists (
    select 1 from public.clients c
    where c.id = checklist_entries.client_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = checklist_entries.client_id
      and c.owner_id = checklist_entries.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

-- Persisted Semi-Annual Assessment Reports.
--
-- Mirrors annual_reports (0011) with a rolling 6-month window ending on
-- review_date. period_start/period_end are stored explicitly so historical
-- reports remain reproducible if the window rule changes later.
create table public.semi_annual_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  review_date date not null,
  period_start date not null,
  period_end date not null,
  summary text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index semi_annual_reports_client_id_idx
  on public.semi_annual_reports (client_id);
create index semi_annual_reports_owner_id_idx
  on public.semi_annual_reports (owner_id);

comment on table public.semi_annual_reports is
  'One row per generated Semi-Annual Assessment Report for a client. summary covers the six-month period in staff''s own words.';

create trigger semi_annual_reports_set_updated_at
before update on public.semi_annual_reports
for each row execute function public.set_updated_at();

create table public.semi_annual_report_objectives (
  id uuid primary key default gen_random_uuid(),
  semi_annual_report_id uuid not null
    references public.semi_annual_reports (id) on delete cascade,
  objective_id uuid references public.objectives (id) on delete set null,
  objective_title text not null,
  yes_count integer not null default 0,
  no_count integer not null default 0,
  tracked_days integer not null default 0,
  rating_percent numeric(5,2),
  comments text,
  created_at timestamptz not null default now()
);

create index semi_annual_report_objectives_report_id_idx
  on public.semi_annual_report_objectives (semi_annual_report_id);

comment on table public.semi_annual_report_objectives is
  'Per-objective rating + staff comments captured at the time one Semi-Annual Assessment Report was generated.';

-- RLS: same shape as annual_reports (0012).
alter table public.semi_annual_reports enable row level security;
alter table public.semi_annual_report_objectives enable row level security;

create policy "semi_annual_reports_admin_all"
on public.semi_annual_reports for all
using (owner_id = public.account_owner_id())
with check (owner_id = public.account_owner_id());

create policy "semi_annual_reports_staff_select"
on public.semi_annual_reports for select
using (
  exists (
    select 1 from public.clients c
    where c.id = semi_annual_reports.client_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "semi_annual_reports_staff_insert"
on public.semi_annual_reports for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = semi_annual_reports.client_id
      and c.owner_id = semi_annual_reports.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "semi_annual_reports_staff_update"
on public.semi_annual_reports for update
using (
  exists (
    select 1 from public.clients c
    where c.id = semi_annual_reports.client_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = semi_annual_reports.client_id
      and c.owner_id = semi_annual_reports.owner_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "semi_annual_report_objectives_admin_all"
on public.semi_annual_report_objectives for all
using (
  exists (
    select 1 from public.semi_annual_reports r
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and r.owner_id = public.account_owner_id()
  )
)
with check (
  exists (
    select 1 from public.semi_annual_reports r
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and r.owner_id = public.account_owner_id()
  )
);

create policy "semi_annual_report_objectives_staff_select"
on public.semi_annual_report_objectives for select
using (
  exists (
    select 1 from public.semi_annual_reports r
    join public.clients c on c.id = r.client_id
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "semi_annual_report_objectives_staff_insert"
on public.semi_annual_report_objectives for insert
with check (
  exists (
    select 1 from public.semi_annual_reports r
    join public.clients c on c.id = r.client_id
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

create policy "semi_annual_report_objectives_staff_update"
on public.semi_annual_report_objectives for update
using (
  exists (
    select 1 from public.semi_annual_reports r
    join public.clients c on c.id = r.client_id
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
)
with check (
  exists (
    select 1 from public.semi_annual_reports r
    join public.clients c on c.id = r.client_id
    where r.id = semi_annual_report_objectives.semi_annual_report_id
      and public.is_staff_at_location(c.location_id)
  )
);

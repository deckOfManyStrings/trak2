-- Persisted Annual Assessment Reports.
--
-- One row per generated report per client. `review_date` is the date of the
-- actual annual review meeting (picked by staff, not auto-set to today).
-- `period_start`/`period_end` are the rolling 12-month window (ending on
-- review_date) used to pull that report's checklist data, stored explicitly
-- so historical reports remain reproducible even if the "rolling 12 months"
-- rule changes later.
create table public.annual_reports (
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

create index annual_reports_client_id_idx on public.annual_reports (client_id);
create index annual_reports_owner_id_idx on public.annual_reports (owner_id);

comment on table public.annual_reports is
  'One row per generated Annual Assessment Report for a client. summary covers the year in staff''s own words (transportation notes, if any, are folded in here rather than a dedicated section).';

create trigger annual_reports_set_updated_at
before update on public.annual_reports
for each row execute function public.set_updated_at();

-- One row per objective shown on a given annual_reports row. Snapshotted
-- (yes/no/tracked counts, rating, and the objective's wording at the time)
-- so a report's contents never change even if the underlying objective is
-- later renamed or removed.
create table public.annual_report_objectives (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports (id) on delete cascade,
  objective_id uuid references public.objectives (id) on delete set null,
  objective_title text not null,
  yes_count integer not null default 0,
  no_count integer not null default 0,
  tracked_days integer not null default 0,
  rating_percent numeric(5,2),
  comments text,
  created_at timestamptz not null default now()
);

create index annual_report_objectives_report_id_idx
  on public.annual_report_objectives (annual_report_id);

comment on table public.annual_report_objectives is
  'Per-objective rating + staff comments captured at the time one Annual Assessment Report was generated.';

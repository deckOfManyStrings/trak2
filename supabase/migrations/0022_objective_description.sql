-- Optional long-form wording for monthly Excel exports.

alter table public.objectives
  add column description text;

comment on column public.objectives.description is
  'Optional long-form objective wording shown on the monthly Excel export. Falls back to title when null.';

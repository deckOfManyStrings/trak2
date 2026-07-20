-- Staff employment details on profiles (staff role rows).

alter table public.profiles
  add column position text,
  add column shift_time text
    check (
      shift_time is null
      or shift_time in ('am', 'pm', 'noc')
    ),
  add column date_of_hire date;

comment on column public.profiles.position is
  'Job title / position for staff members.';
comment on column public.profiles.shift_time is
  'Assigned shift: am, pm, or noc.';
comment on column public.profiles.date_of_hire is
  'Date the staff member was hired.';

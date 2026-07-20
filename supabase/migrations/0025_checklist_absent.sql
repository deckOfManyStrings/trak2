-- Rename checklist value NP (No program) to A (Absent).

alter type public.checklist_value rename value 'NP' to 'A';

comment on column public.checklist_entries.value is
  'Daily Y/N/H/A/N-A marks per client and objective.';

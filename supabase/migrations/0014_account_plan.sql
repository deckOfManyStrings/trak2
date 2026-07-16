-- Adds a manual free/premium plan flag to admin accounts. Free accounts are
-- capped (enforced in application code, not RLS) at 1 location and 2
-- clients; premium accounts are unlimited. There is no billing integration
-- yet - the plan is toggled by hand via the internal /internal/accounts
-- control panel, gated by an email allowlist. If real billing (e.g. Stripe)
-- is added later, a webhook can drive this same column instead.

create type public.account_plan as enum ('free', 'premium');

alter table public.profiles
  add column plan public.account_plan not null default 'free';

comment on column public.profiles.plan is
  'Only meaningful on admin rows (the root of an account). Manually toggled today via the internal control panel; free accounts are capped at 1 location / 2 clients in application code.';

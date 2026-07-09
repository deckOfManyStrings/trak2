-- Fixes the actual root cause of "Database error saving new user",
-- confirmed via Postgres logs:
--
--   ERROR: 42804: column "status" is of type account_status but
--   expression is of type text
--   HINT: You will need to rewrite or cast the expression.
--   CONTEXT: PL/pgSQL function handle_new_user() line 9
--
-- The `case when ... then 'invited' else 'active' end` expression resolves
-- to plain text in this context and isn't implicitly coerced to the
-- account_status enum the way a bare string literal would be. Needs an
-- explicit cast.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role public.user_role;
  new_owner_id uuid;
begin
  new_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'admin');
  new_owner_id := nullif(new.raw_user_meta_data ->> 'invited_by', '')::uuid;

  insert into public.profiles (id, role, owner_id, email, full_name, status)
  values (
    new.id,
    new_role,
    new_owner_id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    (case when new_role = 'staff' then 'invited' else 'active' end)::public.account_status
  );

  return new;
end;
$$;

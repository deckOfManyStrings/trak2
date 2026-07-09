-- Fixes "Database error saving new user" from Supabase Auth when creating
-- any new user (self-serve signup or admin invite).
--
-- Root cause, confirmed empirically: the handle_new_user() trigger's SQL is
-- correct (a manual insert with a real auth.users id succeeds fine), but
-- the trigger is fired by the supabase_auth_admin role as part of GoTrue's
-- own auth.users insert - a role that does not own auth.users itself
-- (`postgres` doesn't either; Supabase reserves that for its internal
-- role). Even though handle_new_user() is SECURITY DEFINER (so its DML
-- runs with the function owner's rights), Postgres still requires the
-- invoking role to have basic visibility into the schema, types, and
-- tables the function touches. Without these grants, the trigger fails
-- and GoTrue reports a generic "Database error saving new user".

grant usage on schema public to supabase_auth_admin;

grant usage on type public.user_role to supabase_auth_admin;
grant usage on type public.account_status to supabase_auth_admin;

grant select, insert, update on public.profiles to supabase_auth_admin;

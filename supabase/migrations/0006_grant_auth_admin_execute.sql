-- Follow-up to 0005: still seeing "Database error creating new user" after
-- granting schema/type/table access to supabase_auth_admin. Broadening the
-- grants further: explicit EXECUTE on the trigger function itself (triggers
-- normally fire without requiring this, but Supabase's locked-down
-- environment for the auth admin role may still check it), and widening
-- the profiles grant to ALL privileges to rule out a narrower permission
-- gap (e.g. DELETE, or privileges checked internally by the constraint
-- validators).

grant execute on function public.handle_new_user() to supabase_auth_admin;

grant all privileges on public.profiles to supabase_auth_admin;

-- Allows an authenticated user with no profiles row yet to create one for
-- themselves, but only as a brand-new admin (role = 'admin', owner_id =
-- null). This covers auth.users rows that existed before the
-- handle_new_user trigger did (or any other edge case where the trigger
-- didn't run), without opening any path for a user to grant themselves
-- staff access under someone else's account - staff rows are only ever
-- created by the handle_new_user trigger at invite time, and this policy
-- can never satisfy role = 'staff'.

create policy "profiles_self_insert_as_admin"
on public.profiles for insert
with check (
  id = auth.uid()
  and role = 'admin'
  and owner_id is null
);

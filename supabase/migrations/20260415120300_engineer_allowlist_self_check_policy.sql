-- Allow authenticated users to check if they are on the engineer allowlist.
-- Without this, RLS policies on other tables that sub-query engineer_allowlist
-- (e.g., providers, storage) fail because the authenticated role can't read
-- the allowlist at all.
create policy "Users can check own allowlist membership"
  on engineer_allowlist for select
  using (user_id = auth.uid());

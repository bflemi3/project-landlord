-- Engineers need to delete charge definitions when deleting a provider.
-- The existing policies only cover landlord insert/update and member select.
create policy "Engineers can manage charge definitions"
  on charge_definitions for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

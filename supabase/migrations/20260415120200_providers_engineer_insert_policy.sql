-- Engineers can create and update providers
create policy "Engineers can manage providers"
  on providers for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

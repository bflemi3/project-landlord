-- Allow users to view profiles of people they share a property with.
-- This enables landlords to see tenant names/emails and vice versa.
create policy "Co-members can view profiles"
  on profiles for select
  using (
    exists (
      select 1
      from memberships my
      join memberships theirs on theirs.property_id = my.property_id
      where my.user_id = auth.uid()
        and my.deleted_at is null
        and theirs.user_id = profiles.id
        and theirs.deleted_at is null
    )
  );

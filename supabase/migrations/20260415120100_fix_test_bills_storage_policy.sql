-- Fix: add explicit WITH CHECK clause to engineer storage policy
-- The original policy used FOR ALL with only USING, which may not
-- properly gate INSERT/UPDATE in all Postgres versions.

drop policy if exists "Engineers can manage test bills" on storage.objects;

create policy "Engineers can manage test bills"
  on storage.objects for all
  using (
    bucket_id = 'test-bills'
    and exists (
      select 1 from engineer_allowlist where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'test-bills'
    and exists (
      select 1 from engineer_allowlist where user_id = auth.uid()
    )
  );

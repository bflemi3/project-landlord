-- =============================================================================
-- Property creation persistence: contracts Storage bucket + RLS.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 10.
--
-- Object key format: {unit_id}/{contract_id}.<ext> — NO bucket prefix.
-- The folder-name extraction (storage.foldername(name))[1]::uuid resolves
-- to a unit id because the key starts with the unit id.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  false,
  26214400,                                       -- 25 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- =============================================================================
-- Contract bucket RLS — unit-membership-driven via the path-extracted unit id.
-- Tenants on the unit get read access via is_unit_member; only the unit's
-- landlord can write/replace/delete the file.
-- =============================================================================
create policy "Unit members can view contract files"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and is_unit_member((storage.foldername(name))[1]::uuid)
  );

create policy "Unit landlords can upload contract files"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and is_unit_landlord((storage.foldername(name))[1]::uuid)
  );

create policy "Unit landlords can update contract files"
  on storage.objects for update
  using (
    bucket_id = 'contracts'
    and is_unit_landlord((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'contracts'
    and is_unit_landlord((storage.foldername(name))[1]::uuid)
  );

create policy "Unit landlords can delete contract files"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and is_unit_landlord((storage.foldername(name))[1]::uuid)
  );

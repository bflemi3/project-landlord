-- Allow landlords to delete source documents they own
create policy "Landlords can delete documents"
  on source_documents for delete
  using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );

-- Allow landlords to delete source document files from storage
create policy "Landlords can delete source document files"
  on storage.objects for delete
  using (
    bucket_id = 'source-documents'
    and auth.uid() is not null
  );

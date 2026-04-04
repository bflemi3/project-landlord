-- Replace property_id with unit_id on source_documents
alter table source_documents drop constraint source_documents_property_id_fkey;
alter table source_documents rename column property_id to unit_id;
alter table source_documents
  add constraint source_documents_unit_id_fkey
  foreign key (unit_id) references units(id) on delete cascade;

-- Update indexes
drop index idx_source_documents_property_id;
create index idx_source_documents_unit_id on source_documents(unit_id);

-- Update RLS policies
drop policy "Members can view source documents" on source_documents;
drop policy "Landlords can upload documents" on source_documents;
drop policy "Landlords can update documents" on source_documents;

create policy "Members can view source documents"
  on source_documents for select using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_member(units.property_id))
  );
create policy "Landlords can upload documents"
  on source_documents for insert with check (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );
create policy "Landlords can update documents"
  on source_documents for update using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );

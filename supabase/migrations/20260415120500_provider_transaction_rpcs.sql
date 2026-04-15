-- =============================================================================
-- Transactional RPCs for provider create and delete operations
-- =============================================================================

-- Delete a provider and all related data in a single transaction.
-- Returns the storage paths of test bills so the caller can delete files
-- from storage after the transaction commits.
create or replace function delete_provider_cascade(p_provider_id uuid)
returns text[] as $$
declare
  v_storage_paths text[];
begin
  -- Collect storage paths before deleting rows
  select coalesce(array_agg(storage_path), '{}')
  into v_storage_paths
  from provider_test_bills
  where provider_id = p_provider_id;

  -- Delete test bills (NO ACTION FK)
  delete from provider_test_bills where provider_id = p_provider_id;

  -- Delete charge definitions (NO ACTION FK)
  delete from charge_definitions where provider_id = p_provider_id;

  -- Delete provider (provider_invoice_profiles cascade automatically)
  delete from providers where id = p_provider_id;

  return v_storage_paths;
end;
$$ language plpgsql security invoker;

-- Create a provider and optionally link a test bill in a single transaction.
-- Returns the new provider ID.
create or replace function create_provider_with_bill(
  p_name text,
  p_display_name text default null,
  p_tax_id text default null,
  p_country_code text default 'BR',
  p_email text default null,
  p_phone text default null,
  p_website text default null,
  p_company_cache_id uuid default null,
  p_bill_storage_path text default null,
  p_bill_file_name text default null,
  p_bill_uploaded_by uuid default null
)
returns uuid as $$
declare
  v_provider_id uuid;
begin
  insert into providers (name, display_name, tax_id, country_code, email, phone, website, company_cache_id)
  values (p_name, p_display_name, p_tax_id, p_country_code, p_email, p_phone, p_website, p_company_cache_id)
  returning id into v_provider_id;

  if p_bill_storage_path is not null and p_bill_file_name is not null then
    insert into provider_test_bills (provider_id, storage_path, file_name, mime_type, uploaded_by, source)
    values (v_provider_id, p_bill_storage_path, p_bill_file_name, 'application/pdf', p_bill_uploaded_by, 'playground');
  end if;

  return v_provider_id;
end;
$$ language plpgsql security invoker;

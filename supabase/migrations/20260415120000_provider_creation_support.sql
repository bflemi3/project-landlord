-- =============================================================================
-- Provider creation support:
-- 1. Add display_name, email, company_cache_id to providers
-- 2. Add phone, email to company_cache
-- 3. Add provider_id to provider_test_bills
-- 4. Create test-bills storage bucket
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Providers table: display_name, email, company_cache_id
-- -----------------------------------------------------------------------------
alter table providers
  add column display_name text,
  add column email text,
  add column company_cache_id uuid references company_cache(id);

create index idx_providers_company_cache_id
  on providers(company_cache_id);

-- -----------------------------------------------------------------------------
-- 2. Company cache: phone, email
-- -----------------------------------------------------------------------------
alter table company_cache
  add column phone text,
  add column email text;

-- -----------------------------------------------------------------------------
-- 3. Provider test bills: provider_id
-- Bills belong to a provider, optionally to a profile. This lets bills
-- uploaded during provider creation exist before any profile is created.
-- -----------------------------------------------------------------------------
alter table provider_test_bills
  add column provider_id uuid references providers(id);

create index idx_provider_test_bills_provider_id
  on provider_test_bills(provider_id);

-- Backfill existing rows by joining through profile_id
update provider_test_bills ptb
set provider_id = pip.provider_id
from provider_invoice_profiles pip
where ptb.profile_id = pip.id
  and ptb.provider_id is null;

-- -----------------------------------------------------------------------------
-- 4. Test-bills storage bucket (private, PDF-only)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'test-bills',
  'test-bills',
  false,
  52428800, -- 50MB
  array['application/pdf']
);

-- Engineers can manage all test bill files
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

-- Users can upload test bills (for future provider request flow)
create policy "Users can upload test bills"
  on storage.objects for insert
  with check (
    bucket_id = 'test-bills'
    and auth.role() = 'authenticated'
  );

-- Users can view their own uploaded test bills
create policy "Users can view own test bills"
  on storage.objects for select
  using (
    bucket_id = 'test-bills'
    and auth.uid() = owner
  );

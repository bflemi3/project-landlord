-- =============================================================================
-- Billing Intelligence: extend provider_invoice_profiles
-- =============================================================================

create type provider_profile_status as enum ('draft', 'active', 'deprecated');
create type provider_category as enum (
  'electricity', 'water', 'gas', 'internet', 'condo',
  'sewer', 'insurance', 'other'
);

alter table provider_invoice_profiles
  add column category provider_category,
  add column region text,
  add column status provider_profile_status not null default 'draft',
  add column capabilities jsonb not null default '{}'::jsonb;

-- Backfill: set existing active profiles to 'active' status
update provider_invoice_profiles
  set status = 'active'
  where is_active = true;

update provider_invoice_profiles
  set status = 'deprecated'
  where is_active = false;

-- Add index for CNPJ-based lookups through the join
create index idx_providers_tax_id on providers(tax_id) where tax_id is not null;

-- Rename profiles.cpf to profiles.tax_id (country-agnostic)
-- and add index for bill-to-user matching
alter table profiles rename column cpf to tax_id;
comment on column profiles.tax_id is 'Personal or business tax ID (e.g., CPF/CNPJ in Brazil). Used to match bills to users.';
create unique index idx_profiles_tax_id on profiles(tax_id) where tax_id is not null;

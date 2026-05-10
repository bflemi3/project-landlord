-- =============================================================================
-- Property creation persistence: contracts table (UNIT-scoped).
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 4.
-- A rental contract is one tenancy on one unit; a multi-unit property holds
-- multiple unrelated leases. Mirrors the unit-scoping of charge_definitions
-- and statements. FK is to units(id), NOT properties(id).
-- =============================================================================

create table contracts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  bytes integer,
  original_filename text,
  upload_status file_upload_status not null default 'pending',
  -- Extraction columns (JSONB lives directly on the row; one row per upload)
  extraction_data jsonb,
  extraction_language text,
  extraction_model text,
  extraction_schema_version smallint not null default 0,
  extracted_at timestamptz,
  raw_text text,
  uploaded_by uuid not null references profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column contracts.storage_path is
  'Object key as storage.objects.name records it: "{unit_id}/{contract_id}.<ext>" '
  'with NO bucket prefix. The bucket name (contracts) is implicit.';

comment on column contracts.extraction_schema_version is
  'Sentinel 0 = no extraction yet. >=1 = extracted under that '
  'CONTRACT_EXTRACTION_SCHEMA_VERSION (src/lib/contract-extraction/schema-version.ts).';

create index idx_contracts_unit_id on contracts(unit_id);

-- At-most-one active contract per unit. Defends against concurrent re-uploads
-- and future bugs that could leave multiple is_active=true rows.
create unique index uq_contracts_one_active_per_unit
  on contracts (unit_id) where is_active = true and deleted_at is null;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table contracts enable row level security;

-- SELECT: any unit member (landlord OR tenant scoped to the unit).
create policy "Unit members can view contracts"
  on contracts for select
  using (is_unit_member(unit_id));

-- INSERT: unit landlord only.
create policy "Unit landlords can insert contracts"
  on contracts for insert
  with check (is_unit_landlord(unit_id));

-- UPDATE: unit landlord only.
create policy "Unit landlords can update contracts"
  on contracts for update
  using (is_unit_landlord(unit_id))
  with check (is_unit_landlord(unit_id));

-- DELETE: unit landlord only (defensive — soft delete via deleted_at preferred).
create policy "Unit landlords can delete contracts"
  on contracts for delete
  using (is_unit_landlord(unit_id));

-- updated_at trigger: the foundation migration's do-block applied set_updated_at
-- to all tables present at that time. We attach it here for this new table.
create trigger set_updated_at
  before update on contracts
  for each row execute function update_updated_at();

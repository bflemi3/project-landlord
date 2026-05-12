-- =============================================================================
-- Property creation persistence: provider_requests table.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 2.
-- =============================================================================

-- unaccent is required by the v1 normalizer (lower(unaccent(input))).
create extension if not exists unaccent;

-- =============================================================================
-- normalize_provider_name(text): v1 algorithm. Lives in this migration so
-- inserts/lookups during the same submit operate on identical normalization.
-- Sharpening is a forward-only follow-up that re-normalizes existing rows
-- in place.
-- =============================================================================
create or replace function public.normalize_provider_name(p_input text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
  v_words text[];
  v_last text;
begin
  if p_input is null then
    return null;
  end if;

  -- 1. Lowercase + strip accents (unaccent).
  v := lower(unaccent(p_input));
  -- 2. Collapse whitespace and most punctuation to single spaces.
  v := regexp_replace(v, '[^\w]+', ' ', 'g');
  -- 3. Trim and collapse repeated spaces.
  v := trim(regexp_replace(v, '\s+', ' ', 'g'));

  if v = '' then
    return v;
  end if;

  -- 4. Strip a trailing legal-suffix token if present (single pass).
  v_words := regexp_split_to_array(v, '\s+');
  v_last := v_words[array_length(v_words, 1)];
  if v_last in ('ltda', 'sa', 'me', 'eireli', 'epp', 'inc', 'llc', 'ltd', 'gmbh') then
    v_words := v_words[1:array_length(v_words, 1) - 1];
    v := array_to_string(v_words, ' ');
  end if;

  -- 5. Trim again after possible suffix strip.
  return trim(v);
end;
$$;

comment on function public.normalize_provider_name(text) is
  'V1 normalizer for provider_requests dedupe. Lowercase+unaccent, collapse '
  'punctuation, drop trailing legal-suffix token (ltda/sa/me/eireli/epp/inc/'
  'llc/ltd/gmbh). Sharpening = forward-only migration re-normalizing rows.';

-- =============================================================================
-- provider_requests
-- =============================================================================
create table provider_requests (
  id uuid primary key default gen_random_uuid(),
  source provider_request_source not null,
  status provider_request_status not null default 'pending',
  requested_provider_name text,
  requested_provider_tax_id text,
  normalized_provider_name text,
  expense_type expense_type,
  country_code text not null default 'BR',
  state text,
  city text,
  neighborhood text,
  provider_id uuid references providers(id),
  profile_id uuid references provider_invoice_profiles(id),
  requested_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  assigned_at timestamptz,
  notes text,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column provider_requests.normalized_provider_name is
  'Maintained by the trigger below; the trigger overrides any caller value '
  'so dedupe lookups always compare byte-equal to the stored column.';

-- =============================================================================
-- Maintenance trigger for normalized_provider_name. Generated columns require
-- IMMUTABLE expressions; we want to evolve the normalizer over time without
-- being bound to that constraint, so we use a regular column + trigger.
-- =============================================================================
create or replace function public.set_provider_request_normalized_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_provider_name := public.normalize_provider_name(new.requested_provider_name);
  return new;
end;
$$;

create trigger trg_provider_requests_set_normalized_name
  before insert or update on provider_requests
  for each row execute function public.set_provider_request_normalized_name();

-- =============================================================================
-- Dedupe indexes: composite indexes aligned to each match priority in the RPC.
-- Match rules (in order): tax_id; provider_id+region; normalized_name+region.
-- =============================================================================
create index idx_provider_requests_dedupe_tax_id
  on provider_requests (country_code, requested_provider_tax_id)
  where requested_provider_tax_id is not null
    and status not in ('declined', 'complete');

create index idx_provider_requests_dedupe_provider
  on provider_requests (country_code, provider_id, expense_type, state, city)
  where provider_id is not null
    and status not in ('declined', 'complete');

create index idx_provider_requests_dedupe_name
  on provider_requests (country_code, normalized_provider_name, expense_type, state, city)
  where status not in ('declined', 'complete');

create index idx_provider_requests_requested_by on provider_requests (requested_by);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table provider_requests enable row level security;

-- SELECT: owner OR engineer.
-- The full policy (which also lets members of a property whose unit's
-- charge_definitions reference this request read it) is created in the
-- charge_definitions modifications migration once the
-- charge_definitions.provider_request_id column exists.
create policy "Requesters and engineers read provider_requests"
  on provider_requests for select
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from engineer_allowlist where user_id = auth.uid()
    )
  );

-- INSERT: only via SECURITY DEFINER RPC. No direct insert policy granted.

-- UPDATE: engineers only.
create policy "Engineers update provider_requests"
  on provider_requests for update
  using (exists (select 1 from engineer_allowlist where user_id = auth.uid()))
  with check (exists (select 1 from engineer_allowlist where user_id = auth.uid()));

-- DELETE: engineers only (defensive — keep stale-row purge engineer-gated).
create policy "Engineers delete provider_requests"
  on provider_requests for delete
  using (exists (select 1 from engineer_allowlist where user_id = auth.uid()));

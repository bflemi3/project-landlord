-- =============================================================================
-- Billing Intelligence: provider test bills, test cases, and test runs
-- =============================================================================

-- Provider test bills: real, unredacted bills used for parser development
-- and accuracy testing. Uploaded by users (via provider requests) or
-- engineers (via playground). Separate from example_documents which are
-- sanitized/redacted for the profile selection UI.
create table provider_test_bills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references provider_invoice_profiles(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes integer,
  uploaded_by uuid references auth.users(id),
  source text not null,
  created_at timestamptz not null default now()
);

create index idx_provider_test_bills_profile_id
  on provider_test_bills(profile_id);

comment on column provider_test_bills.profile_id
  is 'Null when bill is uploaded for a provider request before the profile exists';
comment on column provider_test_bills.uploaded_by
  is 'Null for service role / engineer uploads without a user session';
comment on column provider_test_bills.source
  is 'provider_request, playground, or production_correction';

-- Test cases: link a test bill to human-verified expected extraction values.
-- The expected_fields JSONB uses dot-notation keys matching BillExtractionResult
-- field paths (e.g., "billing.amountDue", "customer.name").
create table extraction_test_cases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references provider_invoice_profiles(id) on delete cascade,
  test_bill_id uuid not null references provider_test_bills(id) on delete cascade,
  description text,
  expected_fields jsonb not null,
  competencies_tested text[] not null default '{extraction}',
  created_by text not null default 'engineer',
  created_at timestamptz not null default now()
);

create index idx_extraction_test_cases_profile_id
  on extraction_test_cases(profile_id);
create index idx_extraction_test_cases_test_bill_id
  on extraction_test_cases(test_bill_id);

comment on column extraction_test_cases.expected_fields
  is 'JSONB with dot-notation keys matching BillExtractionResult fields: provider.taxId, customer.name, billing.amountDue, etc.';
comment on column extraction_test_cases.competencies_tested
  is 'Which competencies this case validates: identification, extraction, validation';

-- Test runs: results from running the accuracy test suite.
-- Stores per-field accuracy and a detailed report as JSONB.
create table extraction_test_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references provider_invoice_profiles(id) on delete set null,
  total_cases integer not null,
  total_fields integer not null,
  passed_fields integer not null,
  accuracy numeric(5,4) not null,
  min_accuracy_threshold numeric(5,4),
  passed boolean not null,
  report jsonb not null,
  triggered_by text not null,
  created_at timestamptz not null default now()
);

create index idx_extraction_test_runs_profile_id
  on extraction_test_runs(profile_id);
create index idx_extraction_test_runs_created_at
  on extraction_test_runs(created_at desc);

comment on column extraction_test_runs.profile_id
  is 'Null for full suite runs across all providers';
comment on column extraction_test_runs.min_accuracy_threshold
  is 'The min_accuracy from provider_invoice_profiles at the time of this run. Null for full suite runs.';
comment on column extraction_test_runs.passed
  is 'Whether accuracy >= min_accuracy_threshold at the time of this run';
comment on column extraction_test_runs.triggered_by
  is 'playground or mcp';

-- RLS
-- Note: the test runner, MCP, and orchestrator use the service role key
-- which bypasses RLS entirely. These policies govern access through the
-- playground UI (engineer auth token) and the product UI (user auth token).
alter table provider_test_bills enable row level security;
alter table extraction_test_cases enable row level security;
alter table extraction_test_runs enable row level security;

-- provider_test_bills: engineers have full access, users can insert
-- (for provider requests) and read their own uploads
create policy "Engineers can manage test bills"
  on provider_test_bills for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

create policy "Users can upload test bills"
  on provider_test_bills for insert
  with check (auth.uid() = uploaded_by);

create policy "Users can view own test bills"
  on provider_test_bills for select
  using (auth.uid() = uploaded_by);

-- extraction_test_cases: engineering-only
create policy "Engineers can manage test cases"
  on extraction_test_cases for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

-- extraction_test_runs: engineering-only
create policy "Engineers can manage test runs"
  on extraction_test_runs for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

-- =============================================================================
-- Provider thresholds on provider_invoice_profiles
-- =============================================================================
-- Defaults match the currently hardcoded values in confidence.ts.
-- Plan 3 (playground) will refactor confidence.ts to read these from the DB.

alter table provider_invoice_profiles
  add column min_accuracy numeric(5,4) not null default 0.9500,
  add column auto_accept_threshold numeric(5,4) not null default 0.9000,
  add column review_threshold numeric(5,4) not null default 0.5000;

comment on column provider_invoice_profiles.min_accuracy
  is 'Minimum accuracy required to transition provider from draft to active';
comment on column provider_invoice_profiles.auto_accept_threshold
  is 'Extraction confidence >= this value routes to auto-accept (confirmed/high)';
comment on column provider_invoice_profiles.review_threshold
  is 'Extraction confidence < this value routes to failed; between this and auto_accept routes to needs-review';

-- Threshold change history for auditing and trend analysis
create table provider_threshold_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references provider_invoice_profiles(id) on delete cascade,
  threshold_type text not null,
  old_value numeric(5,4),
  new_value numeric(5,4) not null,
  reason text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_provider_threshold_history_profile_id
  on provider_threshold_history(profile_id);

comment on column provider_threshold_history.threshold_type
  is 'min_accuracy, auto_accept, or review';
comment on column provider_threshold_history.old_value
  is 'Null for initial threshold set';
comment on column provider_threshold_history.reason
  is 'Why the engineer changed it — displayed alongside accuracy trends in playground';

alter table provider_threshold_history enable row level security;

create policy "Engineers can manage threshold history"
  on provider_threshold_history for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

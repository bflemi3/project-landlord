# Playground UI — Database & Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all database schema changes, infrastructure code, and type updates required by the Playground UI before any UI routes are built.

**Architecture:** Five migrations run in dependency order: (1) new enums + table alterations, (2) table renames, (3) test_cases column changes, (4) new tables referencing renamed tables, (5) data migration + drop old table. Infrastructure includes an eng Supabase client factory with production fallback, middleware auth gate for `/eng/*` routes, DB-derived enum types replacing manual definitions, and parameterized confidence thresholds.

**Tech Stack:** PostgreSQL (Supabase), TypeScript, Vitest, Recharts (dependency install)

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 1-2 (complete)
**Blocks:** Plans 3a-2 through 3a-6

---

## File Structure

```
supabase/migrations/
  20260414120000_playground_enums_and_alterations.sql
  20260414120100_rename_test_tables.sql
  20260414120200_test_cases_competency_column.sql
  20260414120300_playground_new_tables.sql
  20260414120400_migrate_threshold_history_to_audit_log.sql

src/lib/supabase/
  eng-client.ts                # New: eng Supabase client factory

src/lib/types/
  enums.ts                     # New: DB-derived enum re-exports
  database.ts                  # Regenerated

src/lib/supabase/middleware.ts # Modified: /eng/* auth gate

src/lib/billing-intelligence/
  types.ts                     # Modified: derive ProviderCategory, ProviderProfileStatus from DB
  confidence.ts                # Modified: parameterize thresholds
  __tests__/confidence.test.ts # Modified: update tests for parameterized thresholds
  test-runner/types.ts         # Modified: derive Competency from DB enum

src/middleware.ts              # Modified: /eng/* route handling
```

---

### Task 1: Migration — New Enums and Table Alterations

**Files:**
- Create: `supabase/migrations/20260414120000_playground_enums_and_alterations.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Playground UI: new enums and table alterations
-- =============================================================================

-- New enums for provider requests, fix requests, and test competencies
create type request_source as enum (
  'user_new_provider', 'user_correction', 'engineer', 'system'
);

create type request_status as enum (
  'pending', 'in_progress', 'testing', 'complete', 'declined'
);

create type fix_request_status as enum ('open', 'resolved');

create type test_competency as enum (
  'identification', 'extraction', 'validation',
  'payment_matching', 'invoice_discovery'
);

-- Alter providers: add display_name and company_cache link
alter table providers
  add column display_name text,
  add column company_cache_id uuid references company_cache(id);

comment on column providers.display_name
  is 'Human-friendly name for UI display (e.g., "Enliv" instead of full legal name)';
comment on column providers.company_cache_id
  is 'Link to external tax ID lookup data from company_cache';

-- Alter provider_invoice_profiles: add ai_notes
alter table provider_invoice_profiles
  add column ai_notes text;

comment on column provider_invoice_profiles.ai_notes
  is 'Freeform notes for AI (Claude) — API info, scraping targets, bill format notes, vault secret references';
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up --local
```

Expected: migration applies without errors.

- [ ] **Step 3: Verify the new enums and columns exist**

```bash
npx supabase db lint --local
```

Expected: no lint errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260414120000_playground_enums_and_alterations.sql
git commit -m "feat: add playground enums and alter providers/profiles tables

Add request_source, request_status, fix_request_status, test_competency
enums. Add display_name and company_cache_id to providers. Add ai_notes
to provider_invoice_profiles."
```

---

### Task 2: Migration — Rename Test Tables

**Files:**
- Create: `supabase/migrations/20260414120100_rename_test_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Playground UI: rename extraction_test_* tables to test_*
-- Broader naming reflects that these tables serve all competencies.
-- Must run before test_fix_requests creation (which references renamed tables).
-- =============================================================================

-- Rename tables
alter table extraction_test_cases rename to test_cases;
alter table extraction_test_runs rename to test_runs;

-- Rename indexes to match new table names
alter index idx_extraction_test_cases_profile_id rename to idx_test_cases_profile_id;
alter index idx_extraction_test_cases_test_bill_id rename to idx_test_cases_test_bill_id;
alter index idx_extraction_test_runs_profile_id rename to idx_test_runs_profile_id;
alter index idx_extraction_test_runs_created_at rename to idx_test_runs_created_at;

-- Rename RLS policies to match new table names
-- Drop old policies and recreate with new names
alter policy "Engineers can manage test cases" on test_cases
  rename to "Engineers can manage test cases";

alter policy "Engineers can manage test runs" on test_runs
  rename to "Engineers can manage test runs";
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up --local
```

Expected: migration applies without errors. RLS policies carry over automatically with table rename.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260414120100_rename_test_tables.sql
git commit -m "feat: rename extraction_test_cases/runs to test_cases/runs

Broader naming reflects multi-competency support. Indexes renamed to match.
Must precede test_fix_requests table creation."
```

---

### Task 3: Migration — Modify test_cases for Multi-Competency

**Files:**
- Create: `supabase/migrations/20260414120200_test_cases_competency_column.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Playground UI: modify test_cases for multi-competency support
-- =============================================================================

-- Make test_bill_id nullable (validation, payment matching, invoice discovery
-- don't start from a bill PDF — they use source_data JSONB instead)
alter table test_cases
  alter column test_bill_id drop not null;

-- Add source_data for non-bill inputs
alter table test_cases
  add column source_data jsonb;

comment on column test_cases.source_data
  is 'Input data for non-bill competencies: extraction result (validation), bill summary + transaction (payment matching), customer tax ID (invoice discovery). Null for extraction/identification (bill PDF is the source).';

-- Replace competencies_tested text[] with single competency enum column.
-- Backfill existing rows: all current test cases are extraction.
alter table test_cases
  add column competency test_competency;

update test_cases set competency = 'extraction';

alter table test_cases
  alter column competency set not null;

-- Drop the old array column
alter table test_cases
  drop column competencies_tested;

-- Add index on competency for filtering
create index idx_test_cases_competency on test_cases(competency);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up --local
```

Expected: migration applies. Existing test cases get `competency = 'extraction'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260414120200_test_cases_competency_column.sql
git commit -m "feat: modify test_cases for multi-competency support

Make test_bill_id nullable, add source_data jsonb, replace
competencies_tested text[] with single competency test_competency column.
Backfill existing rows to 'extraction'."
```

---

### Task 4: Migration — New Tables (provider_requests, test_fix_requests, system_thresholds, audit_log)

**Files:**
- Create: `supabase/migrations/20260414120300_playground_new_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Playground UI: new tables for requests, fixes, thresholds, and audit log
-- =============================================================================

-- -----------------------------------------------------------------------------
-- provider_requests: unified inbox for provider-related work
-- -----------------------------------------------------------------------------
create table provider_requests (
  id                  uuid primary key default gen_random_uuid(),
  source              request_source not null,
  status              request_status not null default 'pending',
  provider_id         uuid references providers(id),
  profile_id          uuid references provider_invoice_profiles(id),
  test_bill_id        uuid references provider_test_bills(id),
  requested_by        uuid references auth.users(id),
  assigned_to         uuid references engineer_allowlist(user_id),
  assigned_at         timestamptz,
  decline_reason      text,
  correction_field    text,
  correction_original text,
  correction_value    text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_provider_requests_status_created
  on provider_requests(status, created_at);
create index idx_provider_requests_profile_id
  on provider_requests(profile_id);
create index idx_provider_requests_provider_id
  on provider_requests(provider_id);
create index idx_provider_requests_assigned_to
  on provider_requests(assigned_to);

comment on column provider_requests.assigned_to
  is 'FK to engineer_allowlist.user_id — only engineers can be assigned';
comment on column provider_requests.decline_reason
  is 'Required when status = declined';
comment on column provider_requests.correction_field
  is 'For user_correction source: which field was corrected';

-- updated_at trigger
create trigger set_provider_requests_updated_at
  before update on provider_requests
  for each row execute function update_updated_at();

-- RLS
alter table provider_requests enable row level security;

create policy "Engineers have full access to provider requests"
  on provider_requests for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

create policy "Users can view own provider requests"
  on provider_requests for select
  using (auth.uid() = requested_by);

-- -----------------------------------------------------------------------------
-- test_fix_requests: engineer-to-AI communication channel
-- -----------------------------------------------------------------------------
create table test_fix_requests (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references provider_invoice_profiles(id),
  test_case_id          uuid references test_cases(id),
  test_run_id           uuid references test_runs(id),
  provider_request_id   uuid references provider_requests(id),
  competency            test_competency not null,
  source_data           jsonb,
  actual_result         jsonb not null,
  expected_result       jsonb,
  raw_external          jsonb,
  engineer_notes        text not null,
  status                fix_request_status not null default 'open',
  created_by            uuid not null references auth.users(id),
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_test_fix_requests_status_created
  on test_fix_requests(status, created_at);
create index idx_test_fix_requests_profile_id
  on test_fix_requests(profile_id);
create index idx_test_fix_requests_test_case_id
  on test_fix_requests(test_case_id);
create index idx_test_fix_requests_provider_request_id
  on test_fix_requests(provider_request_id);

comment on column test_fix_requests.test_case_id
  is 'Nullable — fix can come from ad-hoc pipeline run (no test case)';
comment on column test_fix_requests.test_run_id
  is 'Nullable — fix from ad-hoc run has no test run record';
comment on column test_fix_requests.provider_request_id
  is 'Links to a broader provider request if the engineer is working in that context';
comment on column test_fix_requests.source_data
  is 'Snapshot of pipeline input at time of failure';
comment on column test_fix_requests.raw_external
  is 'Raw API/scrape response with metadata, snapshot from time of failure';

-- updated_at trigger
create trigger set_test_fix_requests_updated_at
  before update on test_fix_requests
  for each row execute function update_updated_at();

-- RLS: engineers only
alter table test_fix_requests enable row level security;

create policy "Engineers have full access to fix requests"
  on test_fix_requests for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- system_thresholds: system-wide default thresholds
-- -----------------------------------------------------------------------------
create table system_thresholds (
  key         text primary key,
  value       numeric(5,4) not null,
  updated_at  timestamptz not null default now()
);

-- Seed with defaults matching current hardcoded values in confidence.ts
insert into system_thresholds (key, value) values
  ('min_accuracy', 0.9500),
  ('auto_accept', 0.9000),
  ('review', 0.5000);

-- updated_at trigger
create trigger set_system_thresholds_updated_at
  before update on system_thresholds
  for each row execute function update_updated_at();

-- RLS: engineers only
alter table system_thresholds enable row level security;

create policy "Engineers have full access to system thresholds"
  on system_thresholds for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- audit_log: polymorphic audit trail for all eng platform entities
-- -----------------------------------------------------------------------------
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  old_value   jsonb,
  new_value   jsonb not null,
  changed_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index idx_audit_log_entity
  on audit_log(entity_type, entity_id, created_at desc);
create index idx_audit_log_entity_action
  on audit_log(entity_type, action, created_at desc);
create index idx_audit_log_changed_by
  on audit_log(changed_by, created_at desc);

comment on column audit_log.entity_type
  is 'profile, provider, request, fix_request, system_threshold';
comment on column audit_log.entity_id
  is 'UUID or text key depending on entity_type. Always queried with entity_type.';
comment on column audit_log.action
  is 'status_change, capability_added, capability_removed, threshold_updated, assigned, notes_updated';

-- RLS: engineers only
alter table audit_log enable row level security;

create policy "Engineers have full access to audit log"
  on audit_log for all
  using (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  )
  with check (
    exists (select 1 from engineer_allowlist where user_id = auth.uid())
  );
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up --local
```

Expected: migration applies without errors. All four tables created with indexes, triggers, RLS, and seed data.

- [ ] **Step 3: Verify system_thresholds seed data**

```bash
npx supabase db query --local "select * from system_thresholds order by key;"
```

Expected output:
```
 key           | value  | updated_at
---------------+--------+----------------------------
 auto_accept   | 0.9000 | ...
 min_accuracy  | 0.9500 | ...
 review        | 0.5000 | ...
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260414120300_playground_new_tables.sql
git commit -m "feat: add provider_requests, test_fix_requests, system_thresholds, audit_log

New tables for playground UI: provider request queue, AI fix requests,
system-wide thresholds (seeded with defaults), and polymorphic audit log.
All with indexes, RLS policies, and updated_at triggers."
```

---

### Task 5: Migration — Migrate Threshold History to Audit Log and Drop Old Table

**Files:**
- Create: `supabase/migrations/20260414120400_migrate_threshold_history_to_audit_log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Playground UI: migrate provider_threshold_history data to audit_log,
-- then drop the old table.
-- =============================================================================

-- Migrate existing threshold history records into audit_log format.
-- Each row becomes an audit_log entry with entity_type = 'profile',
-- action = 'threshold_updated'.
insert into audit_log (entity_type, entity_id, action, old_value, new_value, changed_by, created_at)
select
  'profile',
  profile_id::text,
  'threshold_updated',
  case when old_value is not null
    then jsonb_build_object('threshold_type', threshold_type, 'value', old_value)
    else null
  end,
  jsonb_build_object('threshold_type', threshold_type, 'value', new_value, 'reason', reason),
  changed_by,
  created_at
from provider_threshold_history;

-- Drop the old table
-- Rollback plan: recreate from audit_log where entity_type='profile'
-- and action='threshold_updated'. Data is preserved in audit_log.
drop table provider_threshold_history;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up --local
```

Expected: migration applies. If `provider_threshold_history` had rows, they are now in `audit_log`. Table is dropped.

- [ ] **Step 3: Verify the old table no longer exists**

```bash
npx supabase db query --local "select count(*) from provider_threshold_history;" 2>&1 || echo "Table dropped successfully"
```

Expected: error indicating table does not exist, confirming successful drop.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260414120400_migrate_threshold_history_to_audit_log.sql
git commit -m "feat: migrate threshold history to audit_log and drop old table

Move provider_threshold_history data into audit_log with entity_type='profile'
and action='threshold_updated'. Drop provider_threshold_history table."
```

---

### Task 6: Regenerate Supabase Types

**Files:**
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Regenerate types from local Supabase**

```bash
npx supabase gen types --local > src/lib/types/database.ts
```

Expected: `database.ts` is regenerated with new enums (`request_source`, `request_status`, `fix_request_status`, `test_competency`), new tables (`provider_requests`, `test_fix_requests`, `system_thresholds`, `audit_log`), renamed tables (`test_cases`, `test_runs`), and altered columns.

- [ ] **Step 2: Verify new enums are present**

Search `database.ts` for `request_source`, `request_status`, `fix_request_status`, `test_competency` — all four should appear in the `Enums` section.

- [ ] **Step 3: Verify renamed tables are present**

Search `database.ts` for `test_cases` and `test_runs` — should exist. `extraction_test_cases` and `extraction_test_runs` should NOT exist.

- [ ] **Step 4: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors. If there are errors from code referencing old table names or types, they will be fixed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "chore: regenerate Supabase types after playground migrations

New enums, renamed tables, new tables, and altered columns all reflected
in generated types."
```

---

### Task 7: Create DB-Derived Enum Types Module

**Files:**
- Create: `src/lib/types/enums.ts`

- [ ] **Step 1: Create the enums re-export module**

```typescript
/**
 * DB-derived enum types re-exported from Supabase generated types.
 *
 * Import these instead of manually defining enum union types.
 * When the DB schema changes and types are regenerated, these
 * update automatically.
 */
import type { Database } from './database'

// Existing enums (Plan 1)
export type ProviderCategory = Database['public']['Enums']['provider_category']
export type ProviderProfileStatus = Database['public']['Enums']['provider_profile_status']

// New enums (Plan 3)
export type RequestSource = Database['public']['Enums']['request_source']
export type RequestStatus = Database['public']['Enums']['request_status']
export type FixRequestStatus = Database['public']['Enums']['fix_request_status']
export type TestCompetency = Database['public']['Enums']['test_competency']
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/enums.ts
git commit -m "feat: add DB-derived enum types module

Re-exports ProviderCategory, ProviderProfileStatus, RequestSource,
RequestStatus, FixRequestStatus, TestCompetency from generated Supabase types."
```

---

### Task 8: Update billing-intelligence Types to Use DB-Derived Enums

**Files:**
- Modify: `src/lib/billing-intelligence/types.ts`
- Modify: `src/lib/billing-intelligence/providers/types.ts`
- Modify: `src/lib/billing-intelligence/test-runner/types.ts`

- [ ] **Step 1: Update `src/lib/billing-intelligence/types.ts`**

Replace the manual `ProviderCategory` and `ProviderProfileStatus` type definitions with re-exports from the DB-derived enums module:

```typescript
// REMOVE these lines:
export type ProviderCategory =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'condo'
  | 'sewer'
  | 'insurance'
  | 'other'

export type ProviderProfileStatus = 'draft' | 'active' | 'deprecated'

// REPLACE with:
export type { ProviderCategory, ProviderProfileStatus } from '@/lib/types/enums'
```

The `ExtractionResult` interface references `ProviderCategory` — the re-export keeps this working without changing any import sites that import from `billing-intelligence/types`.

- [ ] **Step 2: Update `src/lib/billing-intelligence/providers/types.ts`**

No changes needed — this file imports `ProviderCategory` and `ProviderProfileStatus` from `../types`, which now re-exports from the DB-derived module. Verify:

```bash
npx tsc --noEmit
```

Expected: no errors from `providers/types.ts`.

- [ ] **Step 3: Update `src/lib/billing-intelligence/test-runner/types.ts`**

Replace the manual `Competency` type with DB-derived `TestCompetency`:

```typescript
// REMOVE:
export type Competency = 'identification' | 'extraction' | 'validation'

// REPLACE with:
import type { TestCompetency } from '@/lib/types/enums'
export type Competency = TestCompetency
```

Update `LoadedTestCase` to use singular `competency` instead of `competencies` array:

```typescript
// CHANGE:
export interface LoadedTestCase {
  id: string
  testBillId: string
  profileId: string
  description: string | null
  billText: string
  expectedFields: Record<string, string | number>
  competencies: Competency[]
}

// TO:
export interface LoadedTestCase {
  id: string
  testBillId: string | null
  profileId: string
  description: string | null
  /** Bill text for extraction/identification. Null for other competencies. */
  billText: string | null
  /** Structured input for non-bill competencies (validation, payment matching, etc.) */
  sourceData: Record<string, unknown> | null
  expectedFields: Record<string, string | number>
  competency: Competency
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: may have errors in test runner code referencing old `competencies` field or `testBillId` being non-nullable. These are expected and will be addressed in task 10 (test runner updates). For now, note the errors but proceed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/types.ts src/lib/billing-intelligence/providers/types.ts src/lib/billing-intelligence/test-runner/types.ts
git commit -m "feat: derive ProviderCategory, ProviderProfileStatus, Competency from DB

Replace manual type definitions with re-exports from DB-derived enums module.
Update LoadedTestCase for single competency and nullable test_bill_id."
```

---

### Task 9: Parameterize Confidence Thresholds (TDD)

**Files:**
- Modify: `src/lib/billing-intelligence/confidence.ts`
- Modify: `src/lib/billing-intelligence/__tests__/confidence.test.ts`

- [ ] **Step 1: Update tests first — add threshold parameter tests**

Add new test cases to `confidence.test.ts` for parameterized thresholds. Existing tests should continue to pass with default thresholds:

In `src/lib/billing-intelligence/__tests__/confidence.test.ts`, add these new tests inside the `describe('computeFieldStatus')` block:

```typescript
  // Parameterized threshold tests
  describe('with custom thresholds', () => {
    const thresholds = { autoAccept: 0.85, review: 0.40 }

    it('confirmed: extraction >= custom autoAccept + validated', () => {
      expect(computeFieldStatus({ extraction: 0.85, validation: 0.85 }, thresholds))
        .toBe('confirmed')
    })

    it('high: extraction >= custom autoAccept, no validation', () => {
      expect(computeFieldStatus({ extraction: 0.85 }, thresholds))
        .toBe('high')
    })

    it('needs-review: extraction between custom review and autoAccept', () => {
      expect(computeFieldStatus({ extraction: 0.60 }, thresholds))
        .toBe('needs-review')
    })

    it('failed: extraction below custom review threshold', () => {
      expect(computeFieldStatus({ extraction: 0.39 }, thresholds))
        .toBe('failed')
    })

    it('boundary: extraction exactly at custom autoAccept is high', () => {
      expect(computeFieldStatus({ extraction: 0.85 }, thresholds))
        .toBe('high')
    })

    it('boundary: extraction exactly at custom review is needs-review', () => {
      expect(computeFieldStatus({ extraction: 0.40 }, thresholds))
        .toBe('needs-review')
    })

    it('boundary: extraction just below custom review is failed', () => {
      expect(computeFieldStatus({ extraction: 0.39 }, thresholds))
        .toBe('failed')
    })
  })
```

Add these tests inside the `describe('buildExtractionConfidence')` block:

```typescript
  describe('with custom thresholds', () => {
    it('uses custom thresholds for field status routing', () => {
      const thresholds = { autoAccept: 0.85, review: 0.40 }
      const result = buildExtractionConfidence({
        sourceMethod: 'pdf',
        fields: {
          amountDue: { found: true },
          dueDate: { found: true },
        },
      }, thresholds)

      // PDF extraction=0.80, custom autoAccept=0.85 → 0.80 < 0.85 → needs-review
      expect(result.fields.amountDue.status).toBe('needs-review')
    })

    it('PDF source with lowered autoAccept can achieve high status', () => {
      const thresholds = { autoAccept: 0.75, review: 0.40 }
      const result = buildExtractionConfidence({
        sourceMethod: 'pdf',
        fields: {
          amountDue: { found: true },
        },
      }, thresholds)

      // PDF extraction=0.80, custom autoAccept=0.75 → 0.80 >= 0.75 → high
      expect(result.fields.amountDue.status).toBe('high')
    })
  })
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npx vitest run src/lib/billing-intelligence/__tests__/confidence.test.ts
```

Expected: new parameterized threshold tests fail (functions don't accept threshold params yet). Existing tests still pass.

- [ ] **Step 3: Update `computeFieldStatus` to accept optional thresholds**

In `src/lib/billing-intelligence/confidence.ts`, update the function signature and body:

```typescript
export interface ConfidenceThresholds {
  /** Confidence >= this → auto-accept (confirmed/high). Default: 0.9 */
  autoAccept: number
  /** Confidence < this → failed. Between review and autoAccept → needs-review. Default: 0.5 */
  review: number
}

const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  autoAccept: 0.9,
  review: 0.5,
}

/**
 * Compute the routing status for a single field based on its
 * extraction and validation confidence.
 *
 * Extraction confidence: "did we read it correctly?" (0-1)
 * Validation confidence: "does it match another source?" (0-1, optional)
 *
 * Status routing:
 * - confirmed:    extraction >= autoAccept AND validated >= autoAccept
 * - high:         extraction >= autoAccept, no validation or not yet validated
 * - needs-review: extraction between review and autoAccept, or validation found discrepancy
 * - failed:       extraction < review or field not found
 */
export function computeFieldStatus(
  input: { extraction: number; validation?: number },
  thresholds?: ConfidenceThresholds,
): FieldStatus {
  const { extraction, validation } = input
  const { autoAccept, review } = thresholds ?? DEFAULT_THRESHOLDS

  // Validation discrepancy always forces review
  if (validation !== undefined && validation < review) return 'needs-review'

  // Validated and extraction is good
  if (validation !== undefined && validation >= autoAccept && extraction >= autoAccept) return 'confirmed'

  // Good extraction, no validation (or validation not yet run)
  if (extraction >= autoAccept) return 'high'

  // Medium extraction
  if (extraction >= review) return 'needs-review'

  // Low extraction or not found
  return 'failed'
}
```

- [ ] **Step 4: Update `buildExtractionConfidence` to accept optional thresholds**

```typescript
/**
 * Build the full ExtractionConfidence object for an extraction result.
 * Called by providers after parsing to produce a uniform confidence structure.
 *
 * Each field's extraction confidence = source method score if found, 0 if not.
 * Validation is an independent dimension set per field if a second source is available.
 * Status routing is computed per field from both dimensions.
 */
export function buildExtractionConfidence(
  input: ConfidenceInput,
  thresholds?: ConfidenceThresholds,
): ExtractionConfidence {
  const methodScore = getSourceMethodScore(input.sourceMethod)

  const fields: Record<string, FieldConfidence> = {}
  let confirmed = 0
  let high = 0
  let needsReview = 0
  let failed = 0

  for (const [name, field] of Object.entries(input.fields)) {
    const extraction = field.found ? methodScore : 0
    const status = computeFieldStatus({
      extraction,
      validation: field.validation,
    }, thresholds)

    fields[name] = {
      extraction,
      status,
      ...(field.validation !== undefined && { validation: field.validation }),
      ...(field.validationSource && { validationSource: field.validationSource }),
    }

    switch (status) {
      case 'confirmed': confirmed++; break
      case 'high': high++; break
      case 'needs-review': needsReview++; break
      case 'failed': failed++; break
    }
  }

  const totalFields = Object.keys(fields).length

  return {
    fields,
    source: {
      method: input.sourceMethod,
      methodScore,
    },
    summary: {
      totalFields,
      confirmed,
      high,
      needsReview,
      failed,
      autoAcceptable: needsReview === 0 && failed === 0,
    },
  }
}
```

- [ ] **Step 5: Export the `ConfidenceThresholds` type**

Ensure `ConfidenceThresholds` is exported from the module so call sites can import it. It is already exported at the declaration level from step 3.

- [ ] **Step 6: Run tests — verify all pass**

```bash
npx vitest run src/lib/billing-intelligence/__tests__/confidence.test.ts
```

Expected: ALL tests pass — both existing tests (using default thresholds via backward compatibility) and new parameterized tests.

- [ ] **Step 7: Run the full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass. The `computeFieldStatus` and `buildExtractionConfidence` functions maintain backward compatibility through the optional parameter with defaults.

- [ ] **Step 8: Commit**

```bash
git add src/lib/billing-intelligence/confidence.ts src/lib/billing-intelligence/__tests__/confidence.test.ts
git commit -m "feat: parameterize confidence thresholds in computeFieldStatus

computeFieldStatus and buildExtractionConfidence now accept optional
ConfidenceThresholds parameter. Defaults match previous hardcoded values
(autoAccept: 0.9, review: 0.5) for backward compatibility. Call sites
can pass profile-specific thresholds from the DB."
```

---

### Task 10: Update Test Runner Types for Compatibility

**Files:**
- Modify: `src/lib/billing-intelligence/test-runner/runner.ts`
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts`
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts`
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts`

- [ ] **Step 1: Update `runner.ts` for `LoadedTestCase` changes**

The `LoadedTestCase` now has `testBillId: string | null`, `billText: string | null`, `sourceData`, and `competency` (singular). Update `runTestCase` and `TestCaseResult`:

In `src/lib/billing-intelligence/test-runner/runner.ts`, update the `TestCaseResult` reference — it still uses `testBillId`. The `runTestCase` function accesses `testCase.testBillId` which is now nullable. Since the function is pure and just passes `testBillId` through to the result, this is safe. Update the result type:

In `src/lib/billing-intelligence/test-runner/types.ts`, update `TestCaseResult`:

```typescript
export interface TestCaseResult {
  testCaseId: string
  testBillId: string | null
  profileId: string
  description: string | null
  /** null when identification competency not tested */
  identificationPassed: boolean | null
  /** null when validation competency not tested */
  validationPassed: boolean | null
  /** Empty when identification failed — extraction not scored */
  fieldComparisons: FieldComparison[]
  totalFields: number
  passedFields: number
}
```

- [ ] **Step 2: Update test files for `competency` singular and nullable fields**

In all three test files (`runner.test.ts`, `compare.test.ts`, `reporter.test.ts`), update any `LoadedTestCase` mock objects:

Change `competencies: ['extraction']` to `competency: 'extraction'`.
Change `testBillId: 'bill-1'` — keep as-is (still valid, just now nullable).
Add `billText: 'some text'` and `sourceData: null` to mock objects.

Example for a mock `LoadedTestCase`:

```typescript
const mockTestCase: LoadedTestCase = {
  id: 'tc-1',
  testBillId: 'bill-1',
  profileId: 'profile-1',
  description: 'Test case 1',
  billText: 'bill text content',
  sourceData: null,
  expectedFields: { 'billing.amountDue': 24567 },
  competency: 'extraction',
}
```

- [ ] **Step 3: Run tests — verify all pass**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/__tests__/
```

Expected: all test runner tests pass.

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass across the entire codebase.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/
git commit -m "feat: update test runner for single competency and nullable fields

Align runner, types, and tests with DB schema changes: competency singular,
testBillId nullable, add sourceData and billText to LoadedTestCase."
```

---

### Task 11: Create Eng Supabase Client Factory

**Files:**
- Create: `src/lib/supabase/eng-client.ts`

- [ ] **Step 1: Create the eng client factory**

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Eng Supabase client factory.
 *
 * Creates Supabase clients for the /eng/ platform. Uses production env vars
 * (SUPABASE_PROD_URL, SUPABASE_PROD_ANON_KEY) if set, otherwise falls back
 * to standard env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).
 *
 * In production deployment: prod vars not set → falls back to standard vars →
 * both paths hit the same instance. No extra configuration needed.
 *
 * In local development (default): prod vars not set → uses local Supabase.
 * In local development (against production): set SUPABASE_PROD_* in .env.local.
 */

function getEngUrl(): string {
  return process.env.SUPABASE_PROD_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
}

function getEngAnonKey(): string {
  return process.env.SUPABASE_PROD_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

function getEngServiceRoleKey(): string {
  return process.env.SUPABASE_PROD_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
}

/**
 * Create an eng Supabase client with the anon key.
 * Used for user-authenticated operations in /eng/ routes.
 */
export function createEngClient() {
  return createSupabaseClient<Database>(getEngUrl(), getEngAnonKey())
}

/**
 * Create an eng Supabase client with the service role key.
 * Bypasses RLS — used for middleware auth checks and server-side operations.
 */
export function createEngServiceClient() {
  return createSupabaseClient<Database>(getEngUrl(), getEngServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Check if the eng client is configured to use production Supabase.
 * Useful for UI indicators showing which environment is active.
 */
export function isEngUsingProduction(): boolean {
  return !!process.env.SUPABASE_PROD_URL
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/eng-client.ts
git commit -m "feat: add eng Supabase client factory with production fallback

Creates Supabase clients for /eng/ routes using SUPABASE_PROD_* env vars
when set, falling back to standard vars. Includes anon client, service
role client, and production detection utility."
```

---

### Task 12: Update Middleware for /eng/* Auth Gate

**Files:**
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update `src/lib/supabase/middleware.ts` to handle /eng/* routes**

Add the engineer auth check after the existing auth logic. The middleware needs to:
1. Check if the request is for `/eng/*`
2. If not authenticated → redirect to sign-in
3. If authenticated → check `engineer_allowlist` using the eng service client
4. If not on allowlist → redirect to `/app`

Add the following after the existing authenticated-user redirect block (before the `return supabaseResponse` at the end):

```typescript
  // Engineer auth gate: /eng/* routes require engineer_allowlist membership
  if (pathname.startsWith('/eng')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/sign-in'
      return redirectWithCookies(url, supabaseResponse)
    }

    // Check engineer_allowlist using service role (bypasses RLS)
    const { createEngServiceClient } = await import('@/lib/supabase/eng-client')
    const engService = createEngServiceClient()
    const userId = (user as Record<string, unknown>).sub as string
    const { data: engineer } = await engService
      .from('engineer_allowlist')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!engineer) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return redirectWithCookies(url, supabaseResponse)
    }
  }
```

- [ ] **Step 2: Update `src/middleware.ts` matcher to include /eng routes**

The current matcher already matches all routes except static assets, so `/eng/*` is already covered. Verify by checking the regex pattern: `/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|serwist/.*|sw.js|workbox-.*).*)` — this matches `/eng/` routes. No changes needed to `src/middleware.ts`.

- [ ] **Step 3: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: add /eng/* auth gate to middleware

Check engineer_allowlist for /eng/* routes using eng service client.
Unauthenticated → sign-in, not on allowlist → /app redirect."
```

---

### Task 13: Install Recharts Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

Expected: Recharts is added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify the install**

```bash
npm ls recharts
```

Expected: shows `recharts@x.x.x` as a dependency.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for playground trend charts and sparklines"
```

---

### Task 14: Full Verification

- [ ] **Step 1: Run all migrations from scratch to verify ordering**

```bash
npx supabase db reset --local
```

Wait — per project rules, never use `supabase db reset`. Since migrations were already applied individually, verify all migrations are consistent:

```bash
npx supabase migration list --local
```

Expected: all migrations listed in order, all applied.

- [ ] **Step 2: Regenerate types one final time to ensure consistency**

```bash
npx supabase gen types --local > src/lib/types/database.ts
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Run TypeScript compilation check**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Run linter**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 6: Final commit if types changed**

```bash
git add src/lib/types/database.ts
git commit -m "chore: final type regeneration after all playground migrations"
```

---

## Summary of All Deliverables

### Migrations (5 files, ordered by timestamp)
1. `20260414120000` — New enums + alter providers/profiles
2. `20260414120100` — Rename test tables
3. `20260414120200` — test_cases multi-competency columns
4. `20260414120300` — New tables (provider_requests, test_fix_requests, system_thresholds, audit_log)
5. `20260414120400` — Migrate threshold history + drop old table

### New Files (2)
- `src/lib/supabase/eng-client.ts` — Eng client factory
- `src/lib/types/enums.ts` — DB-derived enum re-exports

### Modified Files (6)
- `src/lib/types/database.ts` — Regenerated
- `src/lib/billing-intelligence/types.ts` — Derive enums from DB
- `src/lib/billing-intelligence/confidence.ts` — Parameterize thresholds
- `src/lib/billing-intelligence/__tests__/confidence.test.ts` — Threshold param tests
- `src/lib/billing-intelligence/test-runner/types.ts` — Single competency, nullable fields
- `src/lib/supabase/middleware.ts` — /eng/* auth gate

### Dependencies (1)
- Recharts installed

# Billing Intelligence Test Runner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an accuracy test runner that executes real bill PDFs against the billing-intelligence pipeline (identification → extraction → validation), scores per-field/per-competency/per-provider accuracy, and stores results in the database. Consumed by the engineering playground (Plan 3) and custom MCP (Plan 4).

**Architecture:** Real, unredacted bill PDFs are stored in `provider_test_bills` (uploaded by users via provider requests or engineers via playground). Test cases in `extraction_test_cases` reference a test bill and store human-verified expected field values as JSONB. The runner receives loaded test cases (bill text already extracted), compares each field against expected values, and produces accuracy reports stored in `extraction_test_runs`. The `BillExtractionResult` type from Plan 1 is the contract — test cases define expected values using the same dot-notation field names. CI integration is shelved — can be added later as a thin wrapper around the runner.

**Tech Stack:** Vitest (unit tests), Supabase (DB + Storage), TypeScript

---

## File Structure

```
src/lib/billing-intelligence/
  test-runner/
    types.ts              # LoadedTestCase, TestCaseResult, AccuracyReport, FieldComparison types
    compare.ts            # Field-level comparison: dot-path resolution, string/number matching
    runner.ts             # Score test cases, aggregate accuracy reports (pure, no DB)
    reporter.ts           # Format AccuracyReport into human-readable text output
    __tests__/
      compare.test.ts     # Unit tests for field comparison
      runner.test.ts      # Unit tests for runner with mocked pipeline
      reporter.test.ts    # Unit tests for report formatting

supabase/migrations/
  20260413120500_provider_test_bills_and_test_runner.sql   # provider_test_bills + test_cases + test_runs
```

---

### Task 1: Database Migration — Provider Test Bills, Test Cases, and Test Runs

**Files:**
- Create: `supabase/migrations/20260413120500_provider_test_bills_and_test_runner.sql`

- [ ] **Step 1: Write the migration**

```sql
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
  profile_id uuid,
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
  add column auto_accept_threshold numeric(3,2) not null default 0.90,
  add column review_threshold numeric(3,2) not null default 0.50;

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
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase migration up --local`
Expected: Migration applies successfully, tables created.

- [ ] **Step 3: Regenerate Supabase types**

Run: `npx supabase gen types --lang=typescript --local > src/lib/types/database.ts`
Expected: `database.ts` includes `provider_test_bills`, `extraction_test_cases`, and `extraction_test_runs` table types.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260413120500_provider_test_bills_and_test_runner.sql src/lib/types/database.ts
git commit -m "feat: add provider_test_bills, extraction_test_cases, and extraction_test_runs tables"
```

---

### Task 2: Test Runner Types

**Files:**
- Create: `src/lib/billing-intelligence/test-runner/types.ts`

- [ ] **Step 1: Write the types file**

These types define the contract between the runner, reporter, and consumers (playground, MCP). The `expected_fields` JSONB in the DB uses dot-notation keys (e.g., `"billing.amountDue"`) that map to nested fields in `BillExtractionResult`.

Key design decisions:
- `LoadedTestCase` includes `testBillId` so the playground can link back to the source bill
- `TestCaseResult` treats identification as a pass/fail gate — if identification fails, extraction is skipped (not scored). You fix identification first, then care about extraction accuracy.
- `AccuracyReport` separates identification stats from extraction accuracy — they are different competencies with different fix workflows
- Validation results tracked separately — validation is a cross-check competency, not field extraction

```typescript
// src/lib/billing-intelligence/test-runner/types.ts

/**
 * A test case loaded from the DB, ready to run.
 * The bill PDF has been downloaded and converted to text.
 */
export interface LoadedTestCase {
  id: string
  testBillId: string
  profileId: string
  description: string | null
  billText: string
  expectedFields: Record<string, string | number>
  competencies: Competency[]
}

export type Competency = 'identification' | 'extraction' | 'validation'

/**
 * Result of comparing one field between extracted and expected values.
 */
export interface FieldComparison {
  field: string
  expected: string | number
  actual: string | number | undefined
  passed: boolean
}

/**
 * Result of running one test case through the pipeline.
 *
 * Identification is a gate: if it fails, extraction is not scored.
 * Fix identification first, then measure extraction accuracy.
 */
export interface TestCaseResult {
  testCaseId: string
  testBillId: string
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

/**
 * Aggregated accuracy report for a test run (one provider or all).
 *
 * Identification and extraction are reported separately:
 * - identification: pass/fail gate — how many test cases identified the right provider?
 * - extraction: field-level accuracy — only computed for cases where identification passed
 */
export interface AccuracyReport {
  profileId: string | null
  totalCases: number
  identification: {
    tested: number
    passed: number
    failed: number
  }
  extraction: {
    /** Cases where identification passed (or was not tested) and extraction was scored */
    casesScored: number
    totalFields: number
    passedFields: number
    accuracy: number
  }
  validation: {
    tested: number
    passed: number
    failed: number
  }
  caseResults: TestCaseResult[]
  /** Per-field extraction accuracy across scored test cases */
  fieldAccuracy: Record<string, { total: number; passed: number; accuracy: number }>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/types.ts
git commit -m "feat: add test runner types for accuracy measurement"
```

---

### Task 3: Field Comparison Logic

**Files:**
- Create: `src/lib/billing-intelligence/test-runner/compare.ts`
- Test: `src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts`

The compare module resolves dot-notation field paths (e.g., `"billing.amountDue"`) against an `BillExtractionResult` and compares the resolved value to the expected value. This is the core scoring logic.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts

import { describe, it, expect } from 'vitest'
import { resolveField, compareField, compareAllFields } from '../compare'
import type { BillExtractionResult } from '../../types'
import { buildBillExtractionConfidence } from '../../confidence'

const sampleExtraction: BillExtractionResult = {
  provider: {
    profileId: 'test-profile',
    companyName: 'Test Co',
    taxId: '12345678000199',
    category: 'electricity',
  },
  customer: {
    name: 'João Silva',
    taxId: '12345678901',
    taxIdType: 'cpf',
    countryCode: 'BR',
    accountNumber: '',
  },
  billing: {
    referenceMonth: '2026-03',
    dueDate: '2026-04-15',
    amountDue: 15000,
    currency: 'BRL',
  },
  payment: {
    linhaDigitavel: '23793381286008301283715748301017194000000000015000',
  },
  confidence: buildBillExtractionConfidence({
    sourceMethod: 'pdf',
    fields: {
      customerName: { found: true },
      amountDue: { found: true },
    },
  }),
  rawSource: 'pdf',
}

// Extraction with optional consumption present
const extractionWithConsumption: BillExtractionResult = {
  ...sampleExtraction,
  consumption: { value: 269, unit: 'kWh' },
}

// Extraction with consumption absent (undefined)
const extractionWithoutConsumption: BillExtractionResult = {
  ...sampleExtraction,
  consumption: undefined,
}

describe('resolveField', () => {
  it('resolves top-level path', () => {
    expect(resolveField(sampleExtraction, 'rawSource')).toBe('pdf')
  })

  it('resolves nested path', () => {
    expect(resolveField(sampleExtraction, 'billing.amountDue')).toBe(15000)
  })

  it('resolves two-level nested path', () => {
    expect(resolveField(sampleExtraction, 'provider.taxId')).toBe('12345678000199')
  })

  it('returns undefined for missing leaf', () => {
    expect(resolveField(sampleExtraction, 'billing.nonexistent')).toBeUndefined()
  })

  it('returns undefined for missing intermediate object', () => {
    expect(resolveField(extractionWithoutConsumption, 'consumption.value')).toBeUndefined()
  })

  it('resolves through optional intermediate when present', () => {
    expect(resolveField(extractionWithConsumption, 'consumption.value')).toBe(269)
  })

  it('returns undefined when path resolves to an object (not a primitive)', () => {
    expect(resolveField(sampleExtraction, 'billing')).toBeUndefined()
  })

  it('returns undefined for empty path', () => {
    expect(resolveField(sampleExtraction, '')).toBeUndefined()
  })

  it('returns undefined for optional payment field when absent', () => {
    const noPixExtraction = { ...sampleExtraction, payment: {} }
    expect(resolveField(noPixExtraction, 'payment.pixPayload')).toBeUndefined()
  })
})

describe('compareField', () => {
  it('passes when string values match', () => {
    const result = compareField(sampleExtraction, 'customer.name', 'João Silva')
    expect(result.passed).toBe(true)
    expect(result.actual).toBe('João Silva')
  })

  it('passes when number values match', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', 15000)
    expect(result.passed).toBe(true)
  })

  it('fails when values differ', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', 20000)
    expect(result.passed).toBe(false)
    expect(result.expected).toBe(20000)
    expect(result.actual).toBe(15000)
  })

  it('fails when field is missing from extraction', () => {
    const result = compareField(sampleExtraction, 'billing.nonexistent', 'something')
    expect(result.passed).toBe(false)
    expect(result.actual).toBeUndefined()
  })

  it('coerces when expected is string representation of actual number', () => {
    const result = compareField(sampleExtraction, 'billing.amountDue', '15000')
    expect(result.passed).toBe(true)
  })

  it('coerces when actual is string and expected is number', () => {
    // rawSource is 'pdf' (string), expected as number won't match even with coercion
    const result = compareField(sampleExtraction, 'rawSource', 123)
    expect(result.passed).toBe(false)
  })

  it('passes when both actual and expected are empty strings', () => {
    // accountNumber is '' in the sample extraction
    const result = compareField(sampleExtraction, 'customer.accountNumber', '')
    expect(result.passed).toBe(true)
  })

  it('populates field name in result', () => {
    const result = compareField(sampleExtraction, 'billing.dueDate', '2026-04-15')
    expect(result.field).toBe('billing.dueDate')
    expect(result.expected).toBe('2026-04-15')
  })
})

describe('compareAllFields', () => {
  it('compares all expected fields against extraction', () => {
    const results = compareAllFields(sampleExtraction, {
      'customer.name': 'João Silva',
      'billing.amountDue': 15000,
      'billing.dueDate': '2026-04-15',
    })
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.passed)).toBe(true)
  })

  it('returns mix of passed and failed', () => {
    const results = compareAllFields(sampleExtraction, {
      'customer.name': 'João Silva',
      'billing.amountDue': 99999,
    })
    const nameResult = results.find((r) => r.field === 'customer.name')
    const amountResult = results.find((r) => r.field === 'billing.amountDue')
    expect(nameResult?.passed).toBe(true)
    expect(amountResult?.passed).toBe(false)
  })

  it('returns empty array for empty expected fields', () => {
    const results = compareAllFields(sampleExtraction, {})
    expect(results).toHaveLength(0)
  })

  it('handles optional fields that are present', () => {
    const results = compareAllFields(extractionWithConsumption, {
      'consumption.value': 269,
    })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
  })

  it('handles optional fields that are absent', () => {
    const results = compareAllFields(extractionWithoutConsumption, {
      'consumption.value': 269,
    })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].actual).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts`
Expected: FAIL — `resolveField`, `compareField`, `compareAllFields` not found.

- [ ] **Step 3: Implement compare.ts**

```typescript
// src/lib/billing-intelligence/test-runner/compare.ts

import type { BillExtractionResult } from '../types'
import type { FieldComparison } from './types'

/**
 * Resolve a dot-notation path against an BillExtractionResult.
 * e.g., "billing.amountDue" → extraction.billing.amountDue
 */
export function resolveField(
  extraction: BillExtractionResult,
  path: string,
): string | number | undefined {
  const parts = path.split('.')
  let current: unknown = extraction

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return current
  }
  return undefined
}

/**
 * Compare a single field from an extraction against an expected value.
 * Handles string/number coercion: if expected is a string representation
 * of a number and actual is a number (or vice versa), compare as strings.
 */
export function compareField(
  extraction: BillExtractionResult,
  path: string,
  expected: string | number,
): FieldComparison {
  const actual = resolveField(extraction, path)

  let passed = actual === expected
  if (!passed && actual !== undefined) {
    // Coerce: compare string representations
    passed = String(actual) === String(expected)
  }

  return { field: path, expected, actual, passed }
}

/**
 * Compare all expected fields against an extraction result.
 */
export function compareAllFields(
  extraction: BillExtractionResult,
  expectedFields: Record<string, string | number>,
): FieldComparison[] {
  return Object.entries(expectedFields).map(([path, expected]) =>
    compareField(extraction, path, expected),
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/compare.ts src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts
git commit -m "feat: add field comparison logic for accuracy test runner"
```

---

### Task 4: Test Runner Core

**Files:**
- Create: `src/lib/billing-intelligence/test-runner/runner.ts`
- Test: `src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts`

The runner scores test cases and aggregates reports. It does NOT talk to the database — it receives loaded test cases and returns results. Pure and testable.

Key behavior: **identification is a gate**. If identification fails, extraction is not scored for that test case (empty `fieldComparisons`, zero fields). You fix identification first, then care about extraction accuracy. The report separates identification stats from extraction accuracy.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts

import { describe, it, expect } from 'vitest'
import { runTestCase, buildAccuracyReport } from '../runner'
import type { LoadedTestCase, TestCaseResult } from '../types'
import type { BillExtractionResult } from '../../types'
import { buildBillExtractionConfidence } from '../../confidence'

const makeExtraction = (overrides: Partial<BillExtractionResult['billing']> = {}): BillExtractionResult => ({
  provider: {
    profileId: 'test-profile',
    companyName: 'Test Co',
    taxId: '12345678000199',
    category: 'electricity',
  },
  customer: {
    name: 'João Silva',
    taxId: '12345678901',
    taxIdType: 'cpf',
    countryCode: 'BR',
    accountNumber: '999888',
  },
  billing: {
    referenceMonth: '2026-03',
    dueDate: '2026-04-15',
    amountDue: 15000,
    currency: 'BRL',
    ...overrides,
  },
  payment: {},
  confidence: buildBillExtractionConfidence({
    sourceMethod: 'pdf',
    fields: { amountDue: { found: true } },
  }),
  rawSource: 'pdf',
})

const sampleTestCase: LoadedTestCase = {
  id: 'tc-1',
  testBillId: 'bill-1',
  profileId: 'test-profile',
  description: 'March 2026 bill',
  billText: 'irrelevant for this test — pipeline is mocked',
  expectedFields: {
    'provider.taxId': '12345678000199',
    'customer.name': 'João Silva',
    'billing.amountDue': 15000,
    'billing.dueDate': '2026-04-15',
  },
  competencies: ['extraction'],
}

describe('runTestCase', () => {
  it('scores all fields as passed when extraction matches', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.passedFields).toBe(4)
    expect(result.totalFields).toBe(4)
    expect(result.fieldComparisons).toHaveLength(4)
  })

  it('scores failed fields when extraction differs', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction({ amountDue: 99999 }),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.passedFields).toBe(3)
    expect(result.totalFields).toBe(4)
    expect(result.fieldComparisons.find((f) => f.field === 'billing.amountDue')?.passed).toBe(false)
  })

  it('skips extraction scoring when identification fails', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: makeExtraction(),
      identificationPassed: false,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(false)
    expect(result.fieldComparisons).toHaveLength(0)
    expect(result.totalFields).toBe(0)
    expect(result.passedFields).toBe(0)
  })

  it('skips extraction scoring when identification fails and extraction is null', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: null,
      identificationPassed: false,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(false)
    expect(result.fieldComparisons).toHaveLength(0)
    expect(result.totalFields).toBe(0)
    expect(result.passedFields).toBe(0)
  })

  it('scores extraction when identification passes', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: makeExtraction(),
      identificationPassed: true,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(true)
    expect(result.passedFields).toBe(4)
  })

  it('sets identificationPassed to null when not tested', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBeNull()
  })

  it('records validationPassed true', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: true,
    })
    expect(result.validationPassed).toBe(true)
  })

  it('records validationPassed false', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: false,
    })
    expect(result.validationPassed).toBe(false)
  })

  it('returns zero fields when extraction is null', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: null,
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.totalFields).toBe(0)
    expect(result.fieldComparisons).toHaveLength(0)
  })

  it('handles all three competencies together', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: true,
      validationPassed: true,
    })
    expect(result.identificationPassed).toBe(true)
    expect(result.validationPassed).toBe(true)
    expect(result.passedFields).toBe(4)
    expect(result.totalFields).toBe(4)
  })

  it('preserves testBillId, profileId, and description in result', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.testBillId).toBe('bill-1')
    expect(result.profileId).toBe('test-profile')
    expect(result.description).toBe('March 2026 bill')
  })
})

describe('buildAccuracyReport', () => {
  const makeResult = (overrides: Partial<TestCaseResult> = {}): TestCaseResult => ({
    testCaseId: 'tc-1',
    testBillId: 'bill-1',
    profileId: 'test-profile',
    description: 'Bill 1',
    identificationPassed: null,
    validationPassed: null,
    fieldComparisons: [
      { field: 'billing.amountDue', expected: 100, actual: 100, passed: true },
      { field: 'billing.dueDate', expected: '2026-04-15', actual: '2026-04-15', passed: true },
    ],
    totalFields: 2,
    passedFields: 2,
    ...overrides,
  })

  it('returns zero-state report for empty results', () => {
    const report = buildAccuracyReport('test-profile', [])
    expect(report.profileId).toBe('test-profile')
    expect(report.totalCases).toBe(0)
    expect(report.identification.tested).toBe(0)
    expect(report.extraction.casesScored).toBe(0)
    expect(report.extraction.totalFields).toBe(0)
    expect(report.extraction.accuracy).toBe(0)
    expect(report.validation.tested).toBe(0)
    expect(report.fieldAccuracy).toEqual({})
  })

  it('propagates profileId to report', () => {
    const report = buildAccuracyReport('my-profile', [makeResult()])
    expect(report.profileId).toBe('my-profile')
  })

  it('propagates null profileId for full suite runs', () => {
    const report = buildAccuracyReport(null, [makeResult()])
    expect(report.profileId).toBeNull()
  })

  it('aggregates extraction accuracy from scored cases only', () => {
    const results: TestCaseResult[] = [
      makeResult({ passedFields: 2 }),
      makeResult({
        testCaseId: 'tc-2',
        testBillId: 'bill-2',
        fieldComparisons: [
          { field: 'billing.amountDue', expected: 200, actual: 200, passed: true },
          { field: 'billing.dueDate', expected: '2026-05-15', actual: '2026-05-20', passed: false },
        ],
        passedFields: 1,
      }),
    ]
    const report = buildAccuracyReport('test-profile', results)
    expect(report.totalCases).toBe(2)
    expect(report.extraction.casesScored).toBe(2)
    expect(report.extraction.totalFields).toBe(4)
    expect(report.extraction.passedFields).toBe(3)
    expect(report.extraction.accuracy).toBeCloseTo(0.75)
    expect(report.fieldAccuracy['billing.amountDue'].accuracy).toBe(1)
    expect(report.fieldAccuracy['billing.dueDate'].accuracy).toBe(0.5)
  })

  it('separates identification stats', () => {
    const results: TestCaseResult[] = [
      makeResult({ identificationPassed: true }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', identificationPassed: true }),
      makeResult({
        testCaseId: 'tc-3',
        testBillId: 'bill-3',
        identificationPassed: false,
        fieldComparisons: [],
        totalFields: 0,
        passedFields: 0,
      }),
    ]
    const report = buildAccuracyReport('test-profile', results)
    expect(report.identification.tested).toBe(3)
    expect(report.identification.passed).toBe(2)
    expect(report.identification.failed).toBe(1)
    // Only 2 cases scored for extraction (identification failed case excluded)
    expect(report.extraction.casesScored).toBe(2)
  })

  it('reports identification.tested as 0 when no cases test identification', () => {
    const results: TestCaseResult[] = [
      makeResult({ identificationPassed: null }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', identificationPassed: null }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.identification.tested).toBe(0)
    expect(report.identification.passed).toBe(0)
    expect(report.identification.failed).toBe(0)
  })

  it('excludes identification-failed cases from extraction accuracy', () => {
    const results: TestCaseResult[] = [
      makeResult({
        identificationPassed: false,
        fieldComparisons: [],
        totalFields: 0,
        passedFields: 0,
      }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.extraction.casesScored).toBe(0)
    expect(report.extraction.totalFields).toBe(0)
    expect(report.extraction.accuracy).toBe(0)
    expect(report.fieldAccuracy).toEqual({})
  })

  it('handles mixed competencies across cases', () => {
    const results: TestCaseResult[] = [
      // Case 1: tests identification + extraction
      makeResult({ identificationPassed: true }),
      // Case 2: tests extraction only (older test case)
      makeResult({
        testCaseId: 'tc-2',
        testBillId: 'bill-2',
        identificationPassed: null,
      }),
    ]
    const report = buildAccuracyReport('p', results)
    // Only case 1 tested identification
    expect(report.identification.tested).toBe(1)
    expect(report.identification.passed).toBe(1)
    // Both cases scored for extraction
    expect(report.extraction.casesScored).toBe(2)
    expect(report.extraction.totalFields).toBe(4)
  })

  it('tracks validation stats', () => {
    const results: TestCaseResult[] = [
      makeResult({ validationPassed: true }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', validationPassed: false }),
      makeResult({ testCaseId: 'tc-3', testBillId: 'bill-3', validationPassed: null }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.validation.tested).toBe(2)
    expect(report.validation.passed).toBe(1)
    expect(report.validation.failed).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts`
Expected: FAIL — `runTestCase`, `buildAccuracyReport` not found.

- [ ] **Step 3: Implement runner.ts**

```typescript
// src/lib/billing-intelligence/test-runner/runner.ts

import type { BillExtractionResult } from '../types'
import type {
  LoadedTestCase,
  TestCaseResult,
  AccuracyReport,
} from './types'
import { compareAllFields } from './compare'

export interface RunTestCaseInput {
  testCase: LoadedTestCase
  extraction: BillExtractionResult | null
  identificationPassed: boolean | null
  validationPassed: boolean | null
}

/**
 * Run a single test case against an extraction result.
 *
 * Identification is a gate: if it fails, extraction is not scored.
 * The caller runs the pipeline (identify + extract + validate) and
 * passes results here. This keeps the runner pure.
 */
export function runTestCase(input: RunTestCaseInput): TestCaseResult {
  const { testCase, extraction, identificationPassed, validationPassed } = input

  // If identification was tested and failed, skip extraction scoring
  const identificationFailed = identificationPassed === false
  const shouldScoreExtraction = !identificationFailed && extraction !== null

  const fieldComparisons = shouldScoreExtraction
    ? compareAllFields(extraction, testCase.expectedFields)
    : []
  const passedFields = fieldComparisons.filter((f) => f.passed).length

  return {
    testCaseId: testCase.id,
    testBillId: testCase.testBillId,
    profileId: testCase.profileId,
    description: testCase.description,
    identificationPassed,
    validationPassed,
    fieldComparisons,
    totalFields: fieldComparisons.length,
    passedFields,
  }
}

/**
 * Aggregate test case results into an accuracy report.
 *
 * Identification and extraction are reported separately:
 * - identification: pass/fail counts
 * - extraction: field-level accuracy, only from cases where identification passed
 * - validation: pass/fail counts
 */
export function buildAccuracyReport(
  profileId: string | null,
  caseResults: TestCaseResult[],
): AccuracyReport {
  // Identification stats
  const idTested = caseResults.filter((r) => r.identificationPassed !== null)
  const identification = {
    tested: idTested.length,
    passed: idTested.filter((r) => r.identificationPassed === true).length,
    failed: idTested.filter((r) => r.identificationPassed === false).length,
  }

  // Validation stats
  const valTested = caseResults.filter((r) => r.validationPassed !== null)
  const validation = {
    tested: valTested.length,
    passed: valTested.filter((r) => r.validationPassed === true).length,
    failed: valTested.filter((r) => r.validationPassed === false).length,
  }

  // Extraction accuracy — only from scored cases (identification didn't fail)
  const scoredCases = caseResults.filter((r) => r.fieldComparisons.length > 0)
  const totalFields = scoredCases.reduce((sum, r) => sum + r.totalFields, 0)
  const passedFields = scoredCases.reduce((sum, r) => sum + r.passedFields, 0)

  // Per-field accuracy across scored cases
  const fieldStats: Record<string, { total: number; passed: number }> = {}
  for (const caseResult of scoredCases) {
    for (const fc of caseResult.fieldComparisons) {
      if (!fieldStats[fc.field]) fieldStats[fc.field] = { total: 0, passed: 0 }
      fieldStats[fc.field].total++
      if (fc.passed) fieldStats[fc.field].passed++
    }
  }

  const fieldAccuracy: AccuracyReport['fieldAccuracy'] = {}
  for (const [field, stats] of Object.entries(fieldStats)) {
    fieldAccuracy[field] = {
      ...stats,
      accuracy: stats.total > 0 ? stats.passed / stats.total : 0,
    }
  }

  return {
    profileId,
    totalCases: caseResults.length,
    identification,
    extraction: {
      casesScored: scoredCases.length,
      totalFields,
      passedFields,
      accuracy: totalFields > 0 ? passedFields / totalFields : 0,
    },
    validation,
    caseResults,
    fieldAccuracy,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/runner.ts src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts
git commit -m "feat: add test runner core with identification gate and split accuracy reporting"
```

---

### Task 5: Report Formatter

**Files:**
- Create: `src/lib/billing-intelligence/test-runner/reporter.ts`
- Test: `src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts`

Formats an `AccuracyReport` into a human-readable string for playground display. Shows identification, extraction, and validation as separate sections. Also provides a `meetsThreshold` check that compares extraction accuracy against the provider's `min_accuracy`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts

import { describe, it, expect } from 'vitest'
import { formatReport, meetsThreshold } from '../reporter'
import type { AccuracyReport } from '../types'

const makeReport = (overrides?: Partial<AccuracyReport>): AccuracyReport => ({
  profileId: 'test-profile',
  totalCases: 3,
  identification: { tested: 3, passed: 2, failed: 1 },
  extraction: {
    casesScored: 2,
    totalFields: 8,
    passedFields: 7,
    accuracy: 0.875,
  },
  validation: { tested: 2, passed: 1, failed: 1 },
  caseResults: [],
  fieldAccuracy: {
    'billing.amountDue': { total: 2, passed: 2, accuracy: 1 },
    'billing.dueDate': { total: 2, passed: 1, accuracy: 0.5 },
  },
  ...overrides,
})

describe('formatReport', () => {
  it('includes extraction accuracy percentage', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('87.5%')
  })

  it('includes identification stats', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('Identification')
    expect(output).toContain('2/3')
  })

  it('includes validation stats', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('Validation')
    expect(output).toContain('1/2')
  })

  it('includes per-field accuracy', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('billing.amountDue')
    expect(output).toContain('100.0%')
    expect(output).toContain('billing.dueDate')
    expect(output).toContain('50.0%')
  })

  it('shows provider ID when set', () => {
    const output = formatReport(makeReport({ profileId: 'enliv-campeche-id' }))
    expect(output).toContain('enliv-campeche-id')
  })

  it('shows "All providers" when profileId is null', () => {
    const output = formatReport(makeReport({ profileId: null }))
    expect(output).toContain('All providers')
  })

  it('skips identification section when none tested', () => {
    const output = formatReport(makeReport({
      identification: { tested: 0, passed: 0, failed: 0 },
    }))
    expect(output).not.toContain('Identification')
  })

  it('skips validation section when none tested', () => {
    const output = formatReport(makeReport({
      validation: { tested: 0, passed: 0, failed: 0 },
    }))
    expect(output).not.toContain('Validation')
  })
})

describe('meetsThreshold', () => {
  it('returns true when extraction accuracy >= threshold', () => {
    expect(meetsThreshold(makeReport({ extraction: { casesScored: 2, totalFields: 8, passedFields: 8, accuracy: 0.95 } }), 0.95)).toBe(true)
  })

  it('returns true when extraction accuracy > threshold', () => {
    expect(meetsThreshold(makeReport({ extraction: { casesScored: 2, totalFields: 8, passedFields: 8, accuracy: 1.0 } }), 0.95)).toBe(true)
  })

  it('returns false when extraction accuracy < threshold', () => {
    expect(meetsThreshold(makeReport(), 0.95)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts`
Expected: FAIL — `formatReport`, `meetsThreshold` not found.

- [ ] **Step 3: Implement reporter.ts**

```typescript
// src/lib/billing-intelligence/test-runner/reporter.ts

import type { AccuracyReport } from './types'

/**
 * Format an accuracy report into a human-readable string.
 * Shows identification, extraction, and validation as separate sections.
 */
export function formatReport(report: AccuracyReport): string {
  const lines: string[] = []

  const label = report.profileId ?? 'All providers'
  lines.push(`Accuracy Report: ${label}`)
  lines.push('='.repeat(50))
  lines.push(`Total cases: ${report.totalCases}`)
  lines.push('')

  // Identification (only if tested)
  if (report.identification.tested > 0) {
    lines.push(`Identification: ${report.identification.passed}/${report.identification.tested} passed`)
    if (report.identification.failed > 0) {
      lines.push(`  ${report.identification.failed} failed — fix identification before trusting extraction accuracy`)
    }
    lines.push('')
  }

  // Extraction
  const ext = report.extraction
  lines.push(`Extraction: ${(ext.accuracy * 100).toFixed(1)}% (${ext.passedFields}/${ext.totalFields} fields across ${ext.casesScored} cases)`)
  lines.push('')

  // Per-field breakdown
  lines.push('Per-field accuracy:')
  const sorted = Object.entries(report.fieldAccuracy).sort(
    ([, a], [, b]) => a.accuracy - b.accuracy,
  )
  for (const [field, stats] of sorted) {
    const pct = (stats.accuracy * 100).toFixed(1)
    const indicator = stats.accuracy === 1 ? '✓' : stats.accuracy >= 0.9 ? '~' : '✗'
    lines.push(`  ${indicator} ${field}: ${pct}% (${stats.passed}/${stats.total})`)
  }

  // Validation (only if tested)
  if (report.validation.tested > 0) {
    lines.push('')
    lines.push(`Validation: ${report.validation.passed}/${report.validation.tested} passed`)
  }

  return lines.join('\n')
}

/**
 * Check if extraction accuracy meets the minimum threshold.
 * Uses extraction accuracy specifically — identification and validation
 * are separate competencies with their own pass/fail logic.
 */
export function meetsThreshold(report: AccuracyReport, threshold: number): boolean {
  return report.extraction.accuracy >= threshold
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/reporter.ts src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts
git commit -m "feat: add accuracy report formatter with split competency sections"
```

---

### Task 6: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All billing-intelligence tests pass. No regressions in existing tests.

- [ ] **Step 2: Run TypeScript type checking**

Run: `pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Fix any failures**

If any tests fail or type errors appear, fix them before proceeding.

- [ ] **Step 4: Commit any fixes**

Only if fixes were needed:
```bash
git add -u
git commit -m "fix: address test runner integration issues"
```

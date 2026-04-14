# Playground UI — Plan 3a-6: Code Changes & Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the test runner for multi-competency support, add capabilities update utility, wire up system request auto-creation with Slack alerts, and run a final code review.

**Architecture:** Modifies the existing billing-intelligence test runner to handle all competency types (not just extraction). Adds utility for AI to update provider capabilities. Wires the test runner into the provider requests system for automated regression alerts. Final code review validates all Plan 3a work against the spec.

**Tech Stack:** TypeScript, Vitest

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 3a-1 through 3a-5
**Blocks:** Plan 3b (payment matching pipeline)

---

## File Structure

```
src/lib/billing-intelligence/
  test-runner/
    types.ts                          # Updated: single competency, nullable fields, sourceData
    compare.ts                        # Updated: per-competency comparison logic
    runner.ts                         # Updated: dispatch per competency, system request creation
    reporter.ts                       # Minor updates for competency labels
    __tests__/
      compare.test.ts                 # Updated: tests for all competency field schemas
      runner.test.ts                  # Updated: tests for multi-competency dispatch
      reporter.test.ts                # Updated if reporter changes
  providers/
    capabilities.ts                   # New: updateProfileCapabilities utility
    README.md                         # Updated: document capabilities workflow
```

---

### Task 1: Update Test Runner Types

**Files:**
- Modify: `src/lib/billing-intelligence/test-runner/types.ts`

- [ ] **Step 1: Update the types**

```typescript
// src/lib/billing-intelligence/test-runner/types.ts
import type { Database } from '@/lib/types/database'

/** Competency type derived from DB enum */
export type Competency = Database['public']['Enums']['test_competency']

/**
 * A test case loaded from the DB, ready to run.
 * For extraction/identification: billText is loaded from the PDF.
 * For validation/matching/discovery: sourceData contains the pipeline input.
 */
export interface LoadedTestCase {
  id: string
  testBillId: string | null
  profileId: string
  description: string | null
  competency: Competency
  /** PDF text — populated for extraction and identification test cases */
  billText: string | null
  /** Source data — populated for validation, payment_matching, invoice_discovery */
  sourceData: Record<string, any> | null
  expectedFields: Record<string, any>
}

/**
 * Result of comparing one field between extracted and expected values.
 */
export interface FieldComparison {
  field: string
  expected: any
  actual: any
  passed: boolean
}

/**
 * Result of running one test case through the pipeline.
 */
export interface TestCaseResult {
  testCaseId: string
  testBillId: string | null
  profileId: string
  competency: Competency
  description: string | null
  passed: boolean
  fieldComparisons: FieldComparison[]
  totalFields: number
  passedFields: number
  /** Raw pipeline output for display/debugging */
  rawResult?: Record<string, any>
}

/**
 * Aggregated accuracy report for a test run.
 * Groups results by competency.
 */
export interface AccuracyReport {
  profileId: string | null
  totalCases: number
  byCompetency: Record<Competency, {
    tested: number
    passed: number
    failed: number
    fieldAccuracy: number
  }>
  extraction: {
    casesScored: number
    totalFields: number
    passedFields: number
    accuracy: number
  }
  caseResults: TestCaseResult[]
  fieldAccuracy: Record<string, { total: number; passed: number; accuracy: number }>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/types.ts
git commit -m "refactor: update test runner types for multi-competency support"
```

---

### Task 2: Update Compare Functions

**Files:**
- Modify: `src/lib/billing-intelligence/test-runner/compare.ts`

The compare functions currently only handle extraction fields (dot-notation paths into ExtractionResult). We need to support all competency field schemas.

- [ ] **Step 1: Write failing tests for new competency comparisons**

```typescript
// Add to src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts

import { compareExpectedFields } from '../compare'

describe('compareExpectedFields — identification', () => {
  it('passes when provider ID matches', () => {
    const actual = { 'identification.providerId': 'abc-123', 'identification.confidence': 0.95 }
    const expected = { 'identification.providerId': 'abc-123', 'identification.confidence': 0.95 }
    const results = compareExpectedFields(actual, expected)
    expect(results.every((r) => r.passed)).toBe(true)
  })

  it('fails when provider ID does not match', () => {
    const actual = { 'identification.providerId': 'abc-123' }
    const expected = { 'identification.providerId': 'def-456' }
    const results = compareExpectedFields(actual, expected)
    expect(results[0].passed).toBe(false)
  })
})

describe('compareExpectedFields — validation', () => {
  it('passes when validation.passed matches', () => {
    const actual = { 'validation.passed': true, 'validation.confirmedFields': ['amountDue', 'dueDate'] }
    const expected = { 'validation.passed': true }
    const results = compareExpectedFields(actual, expected)
    expect(results.find((r) => r.field === 'validation.passed')?.passed).toBe(true)
  })

  it('handles array comparison for confirmedFields', () => {
    const actual = { 'validation.confirmedFields': ['amountDue', 'dueDate'] }
    const expected = { 'validation.confirmedFields': ['amountDue', 'dueDate'] }
    const results = compareExpectedFields(actual, expected)
    expect(results[0].passed).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts
```

Expected: FAIL — `compareExpectedFields` not defined.

- [ ] **Step 3: Update compare.ts with generic comparison**

```typescript
// src/lib/billing-intelligence/test-runner/compare.ts
import type { ExtractionResult } from '../types'
import type { FieldComparison } from './types'

/**
 * Resolve a dot-notation path against an ExtractionResult.
 */
export function resolveField(
  extraction: ExtractionResult,
  path: string,
): string | number | undefined {
  const parts = path.split('.')
  let current: unknown = extraction
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  if (typeof current === 'string' || typeof current === 'number') return current
  return undefined
}

/**
 * Compare a single field from an extraction against an expected value.
 */
export function compareField(
  extraction: ExtractionResult,
  path: string,
  expected: string | number,
): FieldComparison {
  const actual = resolveField(extraction, path)
  let passed = actual === expected
  if (!passed && actual !== undefined) {
    passed = String(actual) === String(expected)
  }
  return { field: path, expected, actual, passed }
}

/**
 * Compare all expected fields against an extraction result.
 */
export function compareAllFields(
  extraction: ExtractionResult,
  expectedFields: Record<string, string | number>,
): FieldComparison[] {
  return Object.entries(expectedFields).map(([path, expected]) =>
    compareField(extraction, path, expected),
  )
}

/**
 * Deep equality comparison for JSON values (handles primitives, arrays, objects).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return String(a) === String(b)

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    // Sort for order-independent comparison
    const sortedA = [...a].sort()
    const sortedB = [...b].sort()
    return sortedA.every((val, i) => deepEqual(val, sortedB[i]))
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }

  return false
}

/**
 * Generic field comparison for any competency.
 * Compares flat key-value maps where values can be primitives, arrays, or objects.
 * Used for identification, validation, payment_matching, and invoice_discovery expected fields.
 */
export function compareExpectedFields(
  actual: Record<string, any>,
  expected: Record<string, any>,
): FieldComparison[] {
  return Object.entries(expected).map(([field, expectedValue]) => {
    const actualValue = actual[field]
    const passed = deepEqual(actualValue, expectedValue)
    return { field, expected: expectedValue, actual: actualValue, passed }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/compare.ts src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts
git commit -m "feat: add generic compareExpectedFields for multi-competency support"
```

---

### Task 3: Update Runner for Multi-Competency Dispatch

**Files:**
- Modify: `src/lib/billing-intelligence/test-runner/runner.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// Add to src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts

import { runTestCase, buildAccuracyReport } from '../runner'
import type { LoadedTestCase } from '../types'

describe('runTestCase — validation competency', () => {
  it('compares validation expected fields against actual result', () => {
    const testCase: LoadedTestCase = {
      id: 'tc-1',
      testBillId: null,
      profileId: 'prof-1',
      description: 'Validation test',
      competency: 'validation',
      billText: null,
      sourceData: { billing: { amountDue: 24567 } },
      expectedFields: { 'validation.passed': true },
    }

    const result = runTestCase({
      testCase,
      pipelineResult: { 'validation.passed': true, 'validation.confirmedFields': ['amountDue'] },
    })

    expect(result.passed).toBe(true)
    expect(result.competency).toBe('validation')
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts
```

- [ ] **Step 3: Update runner.ts**

```typescript
// src/lib/billing-intelligence/test-runner/runner.ts
import type {
  LoadedTestCase,
  TestCaseResult,
  AccuracyReport,
  Competency,
} from './types'
import { compareAllFields, compareExpectedFields } from './compare'
import type { ExtractionResult } from '../types'

export interface RunTestCaseInput {
  testCase: LoadedTestCase
  /** For extraction: the ExtractionResult from the pipeline */
  extraction?: ExtractionResult | null
  /** For identification: whether identification passed */
  identificationPassed?: boolean | null
  /** For non-extraction competencies: the pipeline result as a flat field map */
  pipelineResult?: Record<string, any>
}

/**
 * Run a single test case against pipeline output.
 * Dispatches to the appropriate comparison logic based on competency.
 */
export function runTestCase(input: RunTestCaseInput): TestCaseResult {
  const { testCase } = input

  let fieldComparisons
  let passed: boolean

  switch (testCase.competency) {
    case 'extraction': {
      const extraction = input.extraction
      if (!extraction) {
        return {
          testCaseId: testCase.id,
          testBillId: testCase.testBillId,
          profileId: testCase.profileId,
          competency: testCase.competency,
          description: testCase.description,
          passed: false,
          fieldComparisons: [],
          totalFields: 0,
          passedFields: 0,
        }
      }
      fieldComparisons = compareAllFields(extraction, testCase.expectedFields as Record<string, string | number>)
      passed = fieldComparisons.every((f) => f.passed)
      break
    }

    case 'identification':
    case 'validation':
    case 'payment_matching':
    case 'invoice_discovery': {
      const pipelineResult = input.pipelineResult ?? {}
      fieldComparisons = compareExpectedFields(pipelineResult, testCase.expectedFields)
      passed = fieldComparisons.every((f) => f.passed)
      break
    }

    default:
      fieldComparisons = []
      passed = false
  }

  const passedFields = fieldComparisons.filter((f) => f.passed).length

  return {
    testCaseId: testCase.id,
    testBillId: testCase.testBillId,
    profileId: testCase.profileId,
    competency: testCase.competency,
    description: testCase.description,
    passed,
    fieldComparisons,
    totalFields: fieldComparisons.length,
    passedFields,
    rawResult: input.pipelineResult,
  }
}

/**
 * Aggregate test case results into an accuracy report.
 * Groups results by competency.
 */
export function buildAccuracyReport(
  profileId: string | null,
  caseResults: TestCaseResult[],
): AccuracyReport {
  // By competency stats
  const competencies: Competency[] = ['identification', 'extraction', 'validation', 'payment_matching', 'invoice_discovery']
  const byCompetency: AccuracyReport['byCompetency'] = {} as AccuracyReport['byCompetency']

  for (const comp of competencies) {
    const cases = caseResults.filter((r) => r.competency === comp)
    const passed = cases.filter((r) => r.passed)
    const totalFields = cases.reduce((sum, r) => sum + r.totalFields, 0)
    const passedFields = cases.reduce((sum, r) => sum + r.passedFields, 0)
    byCompetency[comp] = {
      tested: cases.length,
      passed: passed.length,
      failed: cases.length - passed.length,
      fieldAccuracy: totalFields > 0 ? passedFields / totalFields : 0,
    }
  }

  // Extraction-specific (backward compat)
  const extractionCases = caseResults.filter((r) => r.competency === 'extraction')
  const totalFields = extractionCases.reduce((sum, r) => sum + r.totalFields, 0)
  const passedFields = extractionCases.reduce((sum, r) => sum + r.passedFields, 0)

  // Per-field accuracy across all competencies
  const fieldStats: Record<string, { total: number; passed: number }> = {}
  for (const caseResult of caseResults) {
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
    byCompetency,
    extraction: {
      casesScored: extractionCases.length,
      totalFields,
      passedFields,
      accuracy: totalFields > 0 ? passedFields / totalFields : 0,
    },
    caseResults,
    fieldAccuracy,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts
```

Fix any failures from the old test format — update old tests to use new `competency` field instead of `competencies` array.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/runner.ts src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts
git commit -m "feat: update test runner for multi-competency dispatch"
```

---

### Task 4: Capabilities Update Utility

**Files:**
- Create: `src/lib/billing-intelligence/providers/capabilities.ts`
- Modify: `src/lib/billing-intelligence/providers/README.md`

- [ ] **Step 1: Create the utility**

```typescript
// src/lib/billing-intelligence/providers/capabilities.ts
import { createClient } from '@supabase/supabase-js'

interface ProviderCapabilities {
  extraction: true
  validation?: { method: 'public_api' | 'web_scrape' | 'barcode_math' }
  paymentStatus?: { method: 'provider_api' | 'dda' | 'bank_match' }
  apiLookup?: boolean
}

/**
 * Update a provider profile's capabilities in the database.
 *
 * Called by Claude when building or modifying a provider.
 * In Plan 4 (MCP), this will be replaced with a deterministic MCP tool.
 *
 * Requires SUPABASE_PROD_URL and SUPABASE_PROD_SERVICE_ROLE_KEY env vars
 * (or standard vars as fallback).
 */
export async function updateProfileCapabilities(
  profileId: string,
  capabilities: ProviderCapabilities,
): Promise<void> {
  const url = process.env.SUPABASE_PROD_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase URL and service role key are required')
  }

  const supabase = createClient(url, key)

  const { error } = await supabase
    .from('provider_invoice_profiles')
    .update({ capabilities })
    .eq('id', profileId)

  if (error) throw new Error(`Failed to update capabilities: ${error.message}`)

  // Log to audit_log
  await supabase.from('audit_log').insert({
    entity_type: 'profile',
    entity_id: profileId,
    action: 'capability_added',
    old_value: null,
    new_value: capabilities,
    changed_by: null, // AI-initiated, no user
  })
}
```

- [ ] **Step 2: Update README**

Add to the end of `src/lib/billing-intelligence/providers/README.md`:

```markdown
## Updating Capabilities

After adding or removing a capability (validation, payment detection, API lookup),
update the profile's capabilities in the database:

\`\`\`typescript
import { updateProfileCapabilities } from './capabilities'

await updateProfileCapabilities('profile-uuid', {
  extraction: true,
  validation: { method: 'public_api' },
  paymentStatus: { method: 'provider_api' },
  apiLookup: true,
})
\`\`\`

This is currently done programmatically. Plan 4 (MCP) will provide a
deterministic tool for this. Plan 6 will formalize it in the Claude skill.
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing-intelligence/providers/capabilities.ts src/lib/billing-intelligence/providers/README.md
git commit -m "feat: add capabilities update utility for AI provider development"
```

---

### Task 5: System Request Auto-Creation on Test Regression

**Files:**
- Create: `src/lib/billing-intelligence/test-runner/regression-alert.ts`

- [ ] **Step 1: Create the regression alert utility**

```typescript
// src/lib/billing-intelligence/test-runner/regression-alert.ts
import { createClient } from '@supabase/supabase-js'

interface TestRunResult {
  profileId: string
  passed: boolean
  accuracy: number
  report: Record<string, any>
}

/**
 * After a test run completes, check if an active profile has regressed
 * (was passing, now failing). If so, create a system request and send
 * a Slack alert.
 */
export async function checkForRegression(run: TestRunResult): Promise<void> {
  if (run.passed) return // No regression

  const url = process.env.SUPABASE_PROD_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  const supabase = createClient(url, key)

  // Check if profile is active
  const { data: profile } = await supabase
    .from('provider_invoice_profiles')
    .select('status')
    .eq('id', run.profileId)
    .single()

  if (!profile || profile.status !== 'active') return

  // Check previous run was passing
  const { data: previousRuns } = await supabase
    .from('test_runs')
    .select('passed')
    .eq('profile_id', run.profileId)
    .order('created_at', { ascending: false })
    .limit(2)

  // Need at least 2 runs (current + previous), and previous must have passed
  if (!previousRuns || previousRuns.length < 2 || !previousRuns[1].passed) return

  // Check no open system request already exists
  const { data: existing } = await supabase
    .from('provider_requests')
    .select('id')
    .eq('profile_id', run.profileId)
    .eq('source', 'system')
    .in('status', ['pending', 'in_progress'])
    .limit(1)

  if (existing && existing.length > 0) return

  // Create system request
  await supabase.from('provider_requests').insert({
    source: 'system',
    status: 'pending',
    profile_id: run.profileId,
    notes: `Accuracy regression detected. Accuracy dropped to ${(run.accuracy * 100).toFixed(1)}%. Previous run was passing. Review test failures in the accuracy dashboard.`,
  })

  // Send Slack alert
  const webhookUrl = process.env.SLACK_ENG_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔴 Accuracy regression on profile ${run.profileId}: dropped to ${(run.accuracy * 100).toFixed(1)}%. Check /eng/accuracy`,
        }),
      })
    } catch {
      // Slack alert is best-effort, don't fail the test run
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/regression-alert.ts
git commit -m "feat: add regression detection with system request + Slack alert"
```

---

### Task 6: Update All Existing Test Files

**Files:**
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/compare.test.ts`
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/runner.test.ts`
- Modify: `src/lib/billing-intelligence/test-runner/__tests__/reporter.test.ts`

- [ ] **Step 1: Update existing tests to use new types**

Update any test that references the old `competencies: Competency[]` to use `competency: Competency` (single value). Update any test that references `testBillId: string` to accept nullable. Update `AccuracyReport` references to use the new `byCompetency` structure.

- [ ] **Step 2: Run all test runner tests**

```bash
npx vitest run src/lib/billing-intelligence/test-runner/
```

Expected: All tests pass.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: No regressions in other tests.

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing-intelligence/test-runner/__tests__/
git commit -m "test: update test runner tests for multi-competency types"
```

---

### Task 7: Full Verification

- [ ] **Step 1: TypeScript compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 3: Run linter**

```bash
npx next lint
```

- [ ] **Step 4: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve remaining type and lint issues from Plan 3a"
```

---

### Task 8: Superpowers Code Review

- [ ] **Step 1: Run superpowers code review**

Invoke the `superpowers:requesting-code-review` skill to review all Plan 3a work against the spec at `docs/superpowers/specs/2026-04-14-playground-ui-design.md`.

The review should verify:
- All routes from the spec are implemented
- All data model changes are applied
- All shared components exist and match spec descriptions
- All UI sections match spec (providers, requests, fixes, accuracy, discovery)
- Threshold management with guidance is implemented
- Test case CRUD supports all competencies
- Fix request flow works end-to-end
- Engineer auth middleware gates /eng/ routes
- Eng Supabase client with fallback pattern works
- Sidebar badges are wired up
- No spec requirements are missing from the implementation

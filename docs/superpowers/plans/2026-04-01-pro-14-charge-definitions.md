# PRO-14: Charge Definitions and Recurring Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining acceptance criteria for charge definitions: auto-generation of charge instances from recurring rules, PostHog analytics, and charge deactivation toggle.

**Architecture:** Most of PRO-14 was already built during PRO-13 (onboarding). The remaining work is: (1) a pure function + server action that generates `charge_instances` from `charge_definitions` for a given billing period, (2) a PostHog `charge_definition_created` event in the create-charges action, and (3) a deactivate/reactivate toggle on charge definitions. The generation function creates the foundation that PRO-15 (statement generation) will consume.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), TanStack Query, PostHog (client-side `posthog-js`), Vitest integration tests, next-intl for i18n.

**Linear:** PRO-14 — branch `brandfleming/pro-14-charge-definitions-and-recurring-rules`

---

## What Already Exists

These are **done** — do not rebuild:

| Artifact | Location |
|----------|----------|
| DB schema: `charge_definitions`, `recurring_rules`, `responsibility_allocations`, `charge_instances` | `supabase/migrations/20260318120000_data_model_foundation.sql` |
| RLS policies for all charge tables | Same migration |
| Server action: `createCharges` / `createChargesCore` | `src/app/actions/properties/create-charges.ts` |
| Server action: `updateCharge` / `updateChargeCore` | `src/app/actions/properties/update-charge.ts` |
| Server action: `removeCharge` / `removeChargeCore` | `src/app/actions/properties/remove-charge.ts` |
| Split utilities: `parseSplit`, `buildAllocationRows` | `src/lib/split-allocations.ts` |
| Query: `fetchUnitCharges` + `useUnitCharges` hook | `src/lib/queries/unit-charges.ts`, `src/lib/hooks/use-unit-charges.ts` |
| UI: `ChargeCard`, `ChargeRow` (composable), `ChargeConfigSheet` | `src/components/charge-card.tsx`, `src/components/charge-row.tsx`, `src/app/app/p/new/steps/charge-config-sheet.tsx` |
| UI: `ChargesSection` on property detail (add/edit/remove) | `src/app/app/p/[id]/sections/charges-section.tsx` |
| Integration tests for create/update/remove | `src/app/actions/properties/__tests__/` |

## What This Plan Builds

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 1 | Generate charge instances from recurring definitions | "Recurring charges auto-generate instances each billing cycle" |
| 2 | PostHog `charge_definition_created` event | "PostHog event fires with correct properties" |
| 3 | Charge deactivation toggle | "Charge definitions can be edited and deactivated" (toggle, not just soft-delete) |

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/generate-charge-instances.ts` | Pure function: given charge definitions + period, returns charge instance rows |
| Create | `src/lib/__tests__/generate-charge-instances.test.ts` | Unit tests for the generation function |
| Create | `src/app/actions/statements/generate-instances.ts` | Server action wrapping the pure function (writes to DB) |
| Create | `src/app/actions/statements/__tests__/generate-instances.integration.test.ts` | Integration test against real Supabase |
| Create | `src/app/actions/properties/toggle-charge-active.ts` | Server action to toggle `is_active` |
| Create | `src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts` | Integration test for toggle |
| Modify | `src/app/actions/properties/create-charges.ts` | Add PostHog event import + capture call |
| Modify | `src/app/app/p/[id]/sections/charges-section.tsx` | Add deactivate action to charge context menu |
| Modify | `src/components/charge-card.tsx` | Visual indicator for inactive charges |
| Modify | `messages/en.json` | Add i18n keys for deactivate/reactivate |
| Modify | `messages/pt-BR.json` | Add i18n keys for deactivate/reactivate |
| Modify | `messages/es.json` | Add i18n keys for deactivate/reactivate |

---

## Task 1: Generate Charge Instances from Recurring Definitions

The core function that PRO-15 will consume. Given a unit's active charge definitions (with recurring rules and allocations), generate the `charge_instance` rows for a specific billing period (year + month). This is a **pure function** — no DB writes, just data transformation.

**Files:**
- Create: `src/lib/generate-charge-instances.ts`
- Create: `src/lib/__tests__/generate-charge-instances.test.ts`

### Step 1: Write the failing tests

- [ ] **Step 1.1: Create the test file with all test cases**

```ts
// src/lib/__tests__/generate-charge-instances.test.ts
import { describe, it, expect } from 'vitest'
import {
  generateChargeInstances,
  type ChargeDefinitionWithRule,
  type GeneratedInstance,
} from '../generate-charge-instances'

function makeCharge(overrides: Partial<ChargeDefinitionWithRule> = {}): ChargeDefinitionWithRule {
  return {
    id: 'cd-1',
    name: 'Rent',
    chargeType: 'rent',
    amountMinor: 200000,
    currency: 'BRL',
    isActive: true,
    recurringRule: {
      startDate: '2026-01-01',
      endDate: null,
      dayOfMonth: 10,
    },
    allocations: [
      { role: 'tenant', allocation_type: 'percentage', percentage: 100, fixed_minor: null },
    ],
    ...overrides,
  }
}

describe('generateChargeInstances', () => {
  it('generates an instance for an active fixed charge within the period', () => {
    const charges = [makeCharge()]
    const result = generateChargeInstances(charges, 2026, 4)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      chargeDefinitionId: 'cd-1',
      name: 'Rent',
      amountMinor: 200000,
      currency: 'BRL',
      chargeSource: 'manual',
      splitType: 'percentage',
      tenantPercentage: 100,
      landlordPercentage: 0,
      tenantFixedMinor: null,
      landlordFixedMinor: null,
    })
  })

  it('skips inactive charge definitions', () => {
    const charges = [makeCharge({ isActive: false })]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(0)
  })

  it('skips charges whose recurring rule has not started yet', () => {
    const charges = [makeCharge({ recurringRule: { startDate: '2026-06-01', endDate: null, dayOfMonth: 10 } })]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(0)
  })

  it('skips charges whose recurring rule has ended', () => {
    const charges = [makeCharge({ recurringRule: { startDate: '2026-01-01', endDate: '2026-03-31', dayOfMonth: 10 } })]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(0)
  })

  it('includes charges on the start month boundary', () => {
    const charges = [makeCharge({ recurringRule: { startDate: '2026-04-01', endDate: null, dayOfMonth: 10 } })]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(1)
  })

  it('includes charges on the end month boundary', () => {
    const charges = [makeCharge({ recurringRule: { startDate: '2026-01-01', endDate: '2026-04-30', dayOfMonth: 10 } })]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(1)
  })

  it('generates variable charges with null amount', () => {
    const charges = [makeCharge({ chargeType: 'variable', amountMinor: null })]
    const result = generateChargeInstances(charges, 2026, 4)

    expect(result).toHaveLength(1)
    expect(result[0].amountMinor).toBe(0)
  })

  it('handles split percentage allocations (tenant 70 / landlord 30)', () => {
    const charges = [makeCharge({
      allocations: [
        { role: 'tenant', allocation_type: 'percentage', percentage: 70, fixed_minor: null },
        { role: 'landlord', allocation_type: 'percentage', percentage: 30, fixed_minor: null },
      ],
    })]
    const result = generateChargeInstances(charges, 2026, 4)

    expect(result[0]).toMatchObject({
      splitType: 'percentage',
      tenantPercentage: 70,
      landlordPercentage: 30,
      tenantFixedMinor: null,
      landlordFixedMinor: null,
    })
  })

  it('handles fixed amount allocations', () => {
    const charges = [makeCharge({
      amountMinor: 100000,
      allocations: [
        { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 60000 },
        { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 40000 },
      ],
    })]
    const result = generateChargeInstances(charges, 2026, 4)

    expect(result[0]).toMatchObject({
      splitType: 'fixed_amount',
      tenantPercentage: null,
      landlordPercentage: null,
      tenantFixedMinor: 60000,
      landlordFixedMinor: 40000,
    })
  })

  it('handles multiple charges for the same period', () => {
    const charges = [
      makeCharge({ id: 'cd-1', name: 'Rent' }),
      makeCharge({ id: 'cd-2', name: 'Condo Fee', amountMinor: 50000 }),
    ]
    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toEqual(['Rent', 'Condo Fee'])
  })

  it('defaults to tenant-pays-100% when no allocations exist', () => {
    const charges = [makeCharge({ allocations: [] })]
    const result = generateChargeInstances(charges, 2026, 4)

    expect(result[0]).toMatchObject({
      splitType: 'percentage',
      tenantPercentage: 100,
      landlordPercentage: 0,
    })
  })
})
```

- [ ] **Step 1.2: Run the tests to confirm they fail**

Run: `npx vitest run src/lib/__tests__/generate-charge-instances.test.ts`
Expected: FAIL — module `../generate-charge-instances` not found.

### Step 2: Implement the pure generation function

- [ ] **Step 2.1: Create the generation function**

```ts
// src/lib/generate-charge-instances.ts

export interface RecurringRule {
  startDate: string   // ISO date 'YYYY-MM-DD'
  endDate: string | null
  dayOfMonth: number
}

export interface AllocationRow {
  role: string
  allocation_type: string
  percentage: number | null
  fixed_minor: number | null
}

export interface ChargeDefinitionWithRule {
  id: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  currency: string
  isActive: boolean
  recurringRule: RecurringRule | null
  allocations: AllocationRow[]
}

export interface GeneratedInstance {
  chargeDefinitionId: string
  name: string
  amountMinor: number
  currency: string
  chargeSource: 'manual'
  splitType: 'percentage' | 'fixed_amount'
  tenantPercentage: number | null
  landlordPercentage: number | null
  tenantFixedMinor: number | null
  landlordFixedMinor: number | null
}

/**
 * Given a set of charge definitions with their recurring rules and allocations,
 * returns the charge instance data for the specified billing period.
 *
 * Pure function — no side effects, no DB calls.
 */
export function generateChargeInstances(
  charges: ChargeDefinitionWithRule[],
  periodYear: number,
  periodMonth: number,
): GeneratedInstance[] {
  return charges
    .filter((c) => c.isActive && isInPeriod(c.recurringRule, periodYear, periodMonth))
    .map((c) => buildInstance(c))
}

function isInPeriod(rule: RecurringRule | null, year: number, month: number): boolean {
  if (!rule) return true // No rule = always active (e.g., one-time charges)

  // Period as YYYYMM for comparison
  const period = year * 100 + month
  const [startY, startM] = rule.startDate.split('-').map(Number)
  const startPeriod = startY * 100 + startM

  if (period < startPeriod) return false

  if (rule.endDate) {
    const [endY, endM] = rule.endDate.split('-').map(Number)
    const endPeriod = endY * 100 + endM
    if (period > endPeriod) return false
  }

  return true
}

function buildInstance(charge: ChargeDefinitionWithRule): GeneratedInstance {
  const tenantAlloc = charge.allocations.find((a) => a.role === 'tenant')
  const landlordAlloc = charge.allocations.find((a) => a.role === 'landlord')
  const isFixed = (tenantAlloc?.allocation_type ?? landlordAlloc?.allocation_type) === 'fixed_amount'

  if (isFixed) {
    return {
      chargeDefinitionId: charge.id,
      name: charge.name,
      amountMinor: charge.amountMinor ?? 0,
      currency: charge.currency,
      chargeSource: 'manual',
      splitType: 'fixed_amount',
      tenantPercentage: null,
      landlordPercentage: null,
      tenantFixedMinor: tenantAlloc?.fixed_minor ?? 0,
      landlordFixedMinor: landlordAlloc?.fixed_minor ?? 0,
    }
  }

  // Default: percentage split
  const tenantPct = tenantAlloc?.percentage ?? (charge.allocations.length === 0 ? 100 : 0)
  const landlordPct = landlordAlloc?.percentage ?? (charge.allocations.length === 0 ? 0 : 0)

  return {
    chargeDefinitionId: charge.id,
    name: charge.name,
    amountMinor: charge.amountMinor ?? 0,
    currency: charge.currency,
    chargeSource: 'manual',
    splitType: 'percentage',
    tenantPercentage: tenantPct,
    landlordPercentage: landlordPct,
    tenantFixedMinor: null,
    landlordFixedMinor: null,
  }
}
```

- [ ] **Step 2.2: Run the tests**

Run: `npx vitest run src/lib/__tests__/generate-charge-instances.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/generate-charge-instances.ts src/lib/__tests__/generate-charge-instances.test.ts
git commit -m "feat(PRO-14): add pure charge instance generation function with tests"
```

### Step 3: Server action to generate and persist instances

This wraps the pure function with a Supabase query to fetch the charge definitions and a write to persist the generated instances. PRO-15 will call this when creating/generating a statement draft.

**Files:**
- Create: `src/app/actions/statements/generate-instances.ts`
- Create: `src/app/actions/statements/__tests__/generate-instances.integration.test.ts`

- [ ] **Step 3.1: Write the integration test**

```ts
// src/app/actions/statements/__tests__/generate-instances.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '@/app/actions/properties/create-charges'
import { generateAndPersistInstances } from '../generate-instances'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('generateAndPersistInstances', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string
  let statementId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    unitId = prop.unitId

    // Seed two charges: one fixed, one variable
    await createChargesCore(client, unitId, [
      {
        name: 'Rent',
        chargeType: 'rent',
        amountMinor: 200000,
        dueDay: 10,
        payer: 'tenant',
        tenantPercent: 100,
        landlordPercent: 0,
      },
      {
        name: 'Water',
        chargeType: 'variable',
        amountMinor: null,
        dueDay: 15,
        payer: 'split',
        splitMode: 'percent',
        tenantPercent: 70,
        landlordPercent: 30,
      },
    ])

    // Create a draft statement to attach instances to
    const admin = getAdminClient()
    const { data: stmt } = await admin
      .from('statements')
      .insert({
        unit_id: unitId,
        period_year: 2026,
        period_month: 4,
        status: 'draft',
        total_amount_minor: 0,
        created_by: userId,
      })
      .select('id')
      .single()
    statementId = stmt!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('generates charge instances for all active definitions and persists them', async () => {
    const result = await generateAndPersistInstances(client, unitId, statementId, 2026, 4)

    expect(result.success).toBe(true)
    expect(result.instanceCount).toBe(2)

    // Verify persisted instances
    const admin = getAdminClient()
    const { data: instances } = await admin
      .from('charge_instances')
      .select('name, amount_minor, charge_source, split_type, tenant_percentage, landlord_percentage')
      .eq('statement_id', statementId)
      .order('name')

    expect(instances).toHaveLength(2)

    // Rent
    expect(instances![0]).toMatchObject({
      name: 'Rent',
      amount_minor: 200000,
      charge_source: 'manual',
      split_type: 'percentage',
      tenant_percentage: 100,
      landlord_percentage: 0,
    })

    // Water (variable — amount 0)
    expect(instances![1]).toMatchObject({
      name: 'Water',
      amount_minor: 0,
      charge_source: 'manual',
      split_type: 'percentage',
      tenant_percentage: 70,
      landlord_percentage: 30,
    })
  })
})
```

- [ ] **Step 3.2: Run the test to confirm it fails**

Run: `npx vitest run src/app/actions/statements/__tests__/generate-instances.integration.test.ts`
Expected: FAIL — module `../generate-instances` not found.

- [ ] **Step 3.3: Implement the server action**

```ts
// src/app/actions/statements/generate-instances.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import {
  generateChargeInstances,
  type ChargeDefinitionWithRule,
} from '@/lib/generate-charge-instances'

interface GenerateResult {
  success: boolean
  instanceCount: number
}

/** Fetch active charge definitions with rules and allocations for a unit. */
async function fetchDefinitionsWithRules(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<ChargeDefinitionWithRule[]> {
  const { data, error } = await supabase
    .from('charge_definitions')
    .select(`
      id, name, charge_type, amount_minor, currency, is_active,
      recurring_rules ( start_date, end_date, day_of_month ),
      responsibility_allocations ( role, allocation_type, percentage, fixed_minor )
    `)
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (error || !data) return []

  return data.map((row) => {
    const rules = (row.recurring_rules ?? []) as unknown as { start_date: string; end_date: string | null; day_of_month: number }[]
    const rule = rules[0] ?? null

    return {
      id: row.id,
      name: row.name,
      chargeType: row.charge_type as ChargeDefinitionWithRule['chargeType'],
      amountMinor: row.amount_minor,
      currency: row.currency,
      isActive: row.is_active,
      recurringRule: rule
        ? { startDate: rule.start_date, endDate: rule.end_date, dayOfMonth: rule.day_of_month }
        : null,
      allocations: (row.responsibility_allocations ?? []) as unknown as ChargeDefinitionWithRule['allocations'],
    }
  })
}

/** Generate charge instances from recurring definitions and persist to DB. */
export async function generateAndPersistInstances(
  supabase: TypedSupabaseClient,
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<GenerateResult> {
  const definitions = await fetchDefinitionsWithRules(supabase, unitId)
  const instances = generateChargeInstances(definitions, periodYear, periodMonth)

  if (instances.length === 0) {
    return { success: true, instanceCount: 0 }
  }

  const rows = instances.map((inst) => ({
    statement_id: statementId,
    charge_definition_id: inst.chargeDefinitionId,
    name: inst.name,
    amount_minor: inst.amountMinor,
    currency: inst.currency,
    charge_source: inst.chargeSource,
    split_type: inst.splitType,
    tenant_percentage: inst.tenantPercentage,
    landlord_percentage: inst.landlordPercentage,
    tenant_fixed_minor: inst.tenantFixedMinor,
    landlord_fixed_minor: inst.landlordFixedMinor,
  }))

  const { error } = await supabase.from('charge_instances').insert(rows)

  if (error) {
    console.error('Failed to persist charge instances:', error)
    return { success: false, instanceCount: 0 }
  }

  return { success: true, instanceCount: instances.length }
}
```

- [ ] **Step 3.4: Run the integration test**

Run: `npx vitest run src/app/actions/statements/__tests__/generate-instances.integration.test.ts`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/app/actions/statements/generate-instances.ts src/app/actions/statements/__tests__/generate-instances.integration.test.ts
git commit -m "feat(PRO-14): add server action to generate and persist charge instances"
```

---

## Task 2: PostHog `charge_definition_created` Event

Fire a PostHog event when charges are created. The existing pattern uses client-side `posthog-js` (see `src/app/auth/sign-up/page.tsx:141`). Since charge creation happens via a server action called from a client component, fire the event on the client after a successful server action response.

**Files:**
- Modify: `src/app/app/p/[id]/sections/charges-section.tsx`
- Modify: `src/app/app/p/new/steps/charges-form.tsx` (onboarding also creates charges)

- [ ] **Step 2.1: Add PostHog capture to charges-section.tsx**

In `src/app/app/p/[id]/sections/charges-section.tsx`, add the PostHog import and capture call inside `handleSave` after a successful create:

```ts
// At top of file, add import:
import posthog from 'posthog-js'
```

Then in the `handleSave` function, after the `createCharges` call in the `else` branch (new charge creation), add:

```ts
    } else {
      // Create new
      await createCharges(unitId, [{
        name: config.name,
        chargeType: config.chargeType,
        amountMinor: config.amountMinor,
        dueDay: config.dueDay,
        payer: config.payer,
        splitMode: config.splitMode,
        tenantPercent: config.tenantPercent,
        landlordPercent: config.landlordPercent,
        tenantFixedMinor: config.tenantFixedMinor,
        landlordFixedMinor: config.landlordFixedMinor,
      }])

      posthog.capture('charge_definition_created', {
        property_id: propertyId,
        charge_type: config.chargeType,
      })
    }
```

Note: `propertyId` is not currently passed to `ChargesSection`. It needs to be added as a prop.

In `unit-section.tsx`, pass `propertyId` to `ChargesSection`:

```tsx
<ChargesSection unitId={unitId} propertyId={propertyId} />
```

Update `ChargesSection` props:

```ts
export function ChargesSection({ unitId, propertyId }: { unitId: string; propertyId: string }) {
```

- [ ] **Step 2.2: Add PostHog capture to the onboarding charges form**

Check `src/app/app/p/new/steps/charges-form.tsx` — if charges are created there via `createCharges`, add the same PostHog capture after creation. The property ID should be available from the onboarding flow context.

- [ ] **Step 2.3: Commit**

```bash
git add src/app/app/p/[id]/sections/charges-section.tsx src/app/app/p/[id]/sections/unit-section.tsx src/app/app/p/new/steps/charges-form.tsx
git commit -m "feat(PRO-14): fire charge_definition_created PostHog event on charge creation"
```

---

## Task 3: Charge Deactivation Toggle

Currently `removeCharge` does a soft delete (`deleted_at`). The acceptance criteria says "edited and deactivated" — add a toggle for the `is_active` flag so landlords can pause a charge without deleting it.

**Files:**
- Create: `src/app/actions/properties/toggle-charge-active.ts`
- Create: `src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts`
- Modify: `src/app/app/p/[id]/sections/charges-section.tsx`
- Modify: `src/components/charge-card.tsx`
- Modify: `messages/en.json`, `messages/pt-BR.json`, `messages/es.json`

### Step 3.1: Write the integration test

- [ ] **Create the test file**

```ts
// src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { createChargesCore } from '../create-charges'
import { toggleChargeActiveCore } from '../toggle-charge-active'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('toggleChargeActiveCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let unitId: string
  let chargeId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    unitId = prop.unitId

    await createChargesCore(client, unitId, [{
      name: 'Rent',
      chargeType: 'rent',
      amountMinor: 200000,
      dueDay: 10,
      payer: 'tenant',
      tenantPercent: 100,
      landlordPercent: 0,
    }])

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('name', 'Rent')
      .single()
    chargeId = data!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('deactivates an active charge', async () => {
    const result = await toggleChargeActiveCore(client, chargeId, false)
    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('is_active')
      .eq('id', chargeId)
      .single()
    expect(data?.is_active).toBe(false)
  })

  it('reactivates a deactivated charge', async () => {
    const result = await toggleChargeActiveCore(client, chargeId, true)
    expect(result.success).toBe(true)

    const admin = getAdminClient()
    const { data } = await admin
      .from('charge_definitions')
      .select('is_active')
      .eq('id', chargeId)
      .single()
    expect(data?.is_active).toBe(true)
  })
})
```

- [ ] **Step 3.2: Run test to confirm it fails**

Run: `npx vitest run src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts`
Expected: FAIL — module not found.

### Step 3.3: Implement the server action

- [ ] **Create toggle action**

```ts
// src/app/actions/properties/toggle-charge-active.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function toggleChargeActiveCore(
  supabase: TypedSupabaseClient,
  chargeId: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('charge_definitions')
    .update({ is_active: isActive })
    .eq('id', chargeId)

  return { success: !error }
}

export async function toggleChargeActive(
  chargeId: string,
  isActive: boolean,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return toggleChargeActiveCore(supabase, chargeId, isActive)
}
```

- [ ] **Step 3.4: Run integration test**

Run: `npx vitest run src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/app/actions/properties/toggle-charge-active.ts src/app/actions/properties/__tests__/toggle-charge-active.integration.test.ts
git commit -m "feat(PRO-14): add toggle-charge-active server action with tests"
```

### Step 3.6: Add deactivation UI

- [ ] **Add i18n keys**

In each locale file (`messages/en.json`, `messages/pt-BR.json`, `messages/es.json`), add these keys under the `propertyDetail` namespace:

```json
{
  "propertyDetail": {
    "deactivateCharge": "Pause charge",
    "reactivateCharge": "Resume charge",
    "chargeInactive": "Paused"
  }
}
```

For `pt-BR.json`:
```json
{
  "propertyDetail": {
    "deactivateCharge": "Pausar cobranca",
    "reactivateCharge": "Retomar cobranca",
    "chargeInactive": "Pausada"
  }
}
```

For `es.json`:
```json
{
  "propertyDetail": {
    "deactivateCharge": "Pausar cargo",
    "reactivateCharge": "Reanudar cargo",
    "chargeInactive": "Pausado"
  }
}
```

- [ ] **Update ChargeCard to show inactive state**

In `src/components/charge-card.tsx`, add a visual indicator when `charge.isActive` is `false`. Add a "Paused" badge next to the amount:

```tsx
import { Badge } from '@/components/ui/badge'

// Inside ChargeCard, after the amount/variable display:
{!charge.isActive && (
  <Badge variant="secondary" className="text-xs">
    {t('chargeInactive')}
  </Badge>
)}
```

Also add opacity to the entire row when inactive by passing a className:

```tsx
<ChargeRow
  configured={configured}
  onClick={onClick}
  className={cn(!charge.isActive && 'opacity-60', className)}
>
```

- [ ] **Update ChargesSection with toggle action**

In `src/app/app/p/[id]/sections/charges-section.tsx`:

1. Import `toggleChargeActive`
2. Add a long-press or secondary action. The simplest approach for MVP: when the user opens the charge config sheet for an existing charge, add a "Pause/Resume" button at the bottom of the sheet. Alternatively, add it to the `handleSkip` logic.

The cleanest approach: add a toggle button in the charges list next to each charge. But to keep it simple and aligned with existing patterns, add a "Pause charge" / "Resume charge" action as a text button at the bottom of the `ChargeConfigSheet` when editing an existing charge.

In `charges-section.tsx`, add a handler:

```ts
import { toggleChargeActive } from '@/app/actions/properties/toggle-charge-active'

async function handleToggleActive(charge: ChargeDefinition) {
  await toggleChargeActive(charge.id, !charge.isActive)
  queryClient.invalidateQueries({ queryKey: ['unit-charges', unitId] })
}
```

Pass the toggle handler into the sheet or render a toggle button in the charges list. The simplest: add a long-press menu or a swipe action. For MVP, add the toggle as part of the `handleSkip` button — rename it contextually:

Update the `onSkip` handler when editing to show "Pause" or "Resume" instead of delete:

Actually, the simplest MVP approach: add a small toggle/button directly on each `ChargeCard` in the list, or add "Pause" / "Resume" as a destructive action in the config sheet footer when editing.

**Recommended approach:** In the `ChargeConfigSheet`, when editing (`existingConfig != null`), replace the cancel/skip button with two actions:
- "Pause charge" / "Resume charge" (toggle active)  
- "Remove charge" (existing delete behavior)

This keeps the UI clean — tap a charge to edit, and the sheet footer has the secondary actions.

- [ ] **Step 3.7: Commit**

```bash
git add messages/en.json messages/pt-BR.json messages/es.json src/components/charge-card.tsx src/app/app/p/[id]/sections/charges-section.tsx
git commit -m "feat(PRO-14): add charge deactivation toggle UI with i18n"
```

---

## Task 4: Update the `fetchUnitCharges` query to include `isActive` filter option

Currently `fetchUnitCharges` filters by `deleted_at is null` but returns both active and inactive charges (which is correct for the property detail view — landlords should see paused charges). However, make sure the `isActive` field is properly mapped. Check `src/lib/queries/unit-charges.ts` — it already maps `is_active` to `isActive`. No changes needed here.

- [ ] **Step 4.1: Verify no changes needed**

Read `src/lib/queries/unit-charges.ts` and confirm `isActive: c.is_active` is already mapped. It is — skip this task.

---

## Task 5: Final verification

- [ ] **Step 5.1: Run all charge-related tests**

```bash
npx vitest run src/lib/__tests__/generate-charge-instances.test.ts src/app/actions/properties/__tests__/ src/app/actions/statements/__tests__/
```

Expected: All tests PASS.

- [ ] **Step 5.2: Run the full test suite**

```bash
npx vitest run
```

Expected: No regressions.

- [ ] **Step 5.3: Type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

---

## Acceptance Criteria Mapping

| Criteria | Task | Status |
|----------|------|--------|
| Landlord can add rent, recurring, and variable charges to a unit | Pre-existing (PRO-13) | Done |
| Recurring charges auto-generate instances each billing cycle | Task 1 + Task 3 | This plan |
| Responsibility split can be set per charge | Pre-existing (PRO-13) | Done |
| Money stored in minor units, never float | Pre-existing (PRO-5) | Done |
| Charge definitions can be edited and deactivated | Task 3 (toggle) + pre-existing (edit) | This plan |
| `charge_definition_created` PostHog event fires | Task 2 | This plan |

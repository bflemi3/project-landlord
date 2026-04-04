# PRO-15: Statement Generation & Completeness Warnings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landlords can generate monthly draft statements, review completeness warnings, and add manual charges with optional bill uploads.

**Architecture:** Schema migrations fix source_documents FK and the due-day model. New server actions handle statement CRUD and bill upload. New queries power the draft view. A `DetailPageLayout` component is extracted for reuse. The property detail page gets a statement lifecycle section, and a new route `/app/p/[id]/s/[statementId]` hosts the full draft view.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Storage + RLS), TanStack Query, React 19, shadcn, next-intl

**Spec:** `docs/superpowers/specs/2026-04-02-pro-15-statement-generation-design.md`

---

## Phase 1: Schema & Backend Foundation

### Task 1: Migration — source_documents property_id → unit_id

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_source_documents_unit_id.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Replace property_id with unit_id on source_documents
alter table source_documents drop constraint source_documents_property_id_fkey;
alter table source_documents rename column property_id to unit_id;
alter table source_documents
  add constraint source_documents_unit_id_fkey
  foreign key (unit_id) references units(id) on delete cascade;

-- Update indexes
drop index idx_source_documents_property_id;
create index idx_source_documents_unit_id on source_documents(unit_id);

-- Update RLS policies
drop policy "Members can view source documents" on source_documents;
drop policy "Landlords can upload documents" on source_documents;
drop policy "Landlords can update documents" on source_documents;

create policy "Members can view source documents"
  on source_documents for select using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_member(units.property_id))
  );
create policy "Landlords can upload documents"
  on source_documents for insert with check (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );
create policy "Landlords can update documents"
  on source_documents for update using (
    exists (select 1 from units where units.id = source_documents.unit_id
      and is_property_landlord(units.property_id))
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: clean reset with all migrations applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "migrate: source_documents property_id → unit_id with updated RLS"
```

### Task 2: Migration — update create_property_with_membership RPC to accept due_day

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_property_rpc_due_day.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Update RPC to accept due_day parameter for the unit
drop function if exists create_property_with_membership;

create function create_property_with_membership(
  p_name text,
  p_street text default null,
  p_number text default null,
  p_complement text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country_code text default 'BR',
  p_due_day integer default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_unit_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into properties (
    name, street, number, complement, neighborhood,
    city, state, postal_code, country_code,
    created_by
  ) values (
    p_name, p_street, p_number, p_complement, p_neighborhood,
    p_city, p_state, p_postal_code, p_country_code,
    v_user_id
  ) returning id into v_property_id;

  insert into units (property_id, name, due_day_of_month)
  values (v_property_id, p_name, p_due_day)
  returning id into v_unit_id;

  insert into memberships (user_id, property_id, role)
  values (v_user_id, v_property_id, 'landlord');

  return json_build_object('property_id', v_property_id, 'unit_id', v_unit_id);
end;
$$;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: clean reset, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "migrate: add p_due_day param to create_property_with_membership RPC"
```

### Task 3: Regenerate Supabase types

**Files:**
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Regenerate types**

Run: `npx supabase gen types typescript --local > src/lib/types/database.ts`

- [ ] **Step 2: Verify the types compile**

Run: `pnpm tsc --noEmit`
Expected: no type errors (or only pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "chore: regenerate Supabase types after migrations"
```

### Task 4: Fix generateChargeInstances to skip null amountMinor

**Files:**
- Modify: `src/lib/generate-charge-instances.ts:146-150`
- Modify: `src/lib/__tests__/generate-charge-instances.test.ts` (if exists, otherwise create)

- [ ] **Step 1: Write the failing test**

Check if `src/lib/__tests__/generate-charge-instances.test.ts` exists. If not, create it. Add a test:

```ts
import { generateChargeInstances, type ChargeDefinitionWithRule } from '../generate-charge-instances'

describe('generateChargeInstances', () => {
  it('skips definitions where amountMinor is null', () => {
    const charges: ChargeDefinitionWithRule[] = [
      {
        id: 'rent-1',
        name: 'Rent',
        chargeType: 'rent',
        amountMinor: 200000,
        currency: 'BRL',
        isActive: true,
        recurringRule: { startDate: '2026-01-01', endDate: null, dayOfMonth: 1 },
        allocations: [],
      },
      {
        id: 'gas-1',
        name: 'Gas',
        chargeType: 'variable',
        amountMinor: null,
        currency: 'BRL',
        isActive: true,
        recurringRule: { startDate: '2026-01-01', endDate: null, dayOfMonth: 1 },
        allocations: [],
      },
    ]

    const result = generateChargeInstances(charges, 2026, 4)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Rent')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/generate-charge-instances.test.ts`
Expected: FAIL — Gas is included with amountMinor 0.

- [ ] **Step 3: Add the filter**

In `src/lib/generate-charge-instances.ts`, update the filter chain in `generateChargeInstances`:

```ts
export function generateChargeInstances(
  charges: ChargeDefinitionWithRule[],
  periodYear: number,
  periodMonth: number,
): GeneratedInstance[] {
  return charges
    .filter((charge) => charge.isActive)
    .filter((charge) => charge.amountMinor !== null)
    .filter((charge) => isInPeriod(charge.recurringRule, periodYear, periodMonth))
    .map((charge) => ({
      chargeDefinitionId: charge.id,
      name: charge.name,
      amountMinor: charge.amountMinor!,
      currency: charge.currency,
      chargeSource: 'manual' as const,
      ...buildSplitFields(charge.allocations),
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/generate-charge-instances.test.ts`
Expected: PASS

- [ ] **Step 5: Update the integration test**

The existing integration test at `src/app/actions/statements/__tests__/generate-instances.integration.test.ts` expects `instanceCount: 2` (Rent + Water). Water is a variable charge with `amountMinor: null`, so it should now be skipped. Update:

- Change the assertion `expect(result.instanceCount).toBe(2)` to `expect(result.instanceCount).toBe(1)`
- Remove or update the test `'persists the water instance with split allocation and zero amount'` since Water will no longer generate an instance
- Add a test verifying that variable charges with null amount are NOT in charge_instances

- [ ] **Step 6: Run integration tests**

Run: `pnpm test:integration`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/generate-charge-instances.ts src/lib/__tests__/ src/app/actions/statements/__tests__/
git commit -m "fix: skip variable charges with null amount in generateChargeInstances"
```

---

## Phase 2: Due Date Model Cleanup

### Task 5: Remove dueDay from ChargeConfig and charge config sheet

**Files:**
- Modify: `src/app/app/p/new/steps/charge-config-sheet.tsx`
- Modify: `src/app/actions/properties/create-charges.ts`
- Modify: `src/app/actions/properties/update-charge.ts`

- [ ] **Step 1: Remove dueDay from ChargeConfig interface**

In `src/app/app/p/new/steps/charge-config-sheet.tsx`, remove `dueDay: number` from the `ChargeConfig` interface. Remove the `dueDay` state, the `DueDaySelect` component usage from the form, and the `dueDay` field from `handleSave`. Remove the entire `DueDaySelect` function component since it's no longer used.

- [ ] **Step 2: Remove dueDay from ChargeInput and createCharges**

In `src/app/actions/properties/create-charges.ts`:
- Remove `dueDay: number` from `ChargeInput`
- Remove the `dueDay` validation (`if (charge.dueDay < 1 || charge.dueDay > 28)`)
- Change `day_of_month: charge.dueDay` to `day_of_month: 1` in the recurring_rules insert

- [ ] **Step 3: Remove dueDay from UpdateChargeInput and updateCharge**

In `src/app/actions/properties/update-charge.ts`:
- Remove `dueDay: number` from `UpdateChargeInput`
- Remove the recurring_rules update that writes `day_of_month: input.dueDay` — replace with no-op or remove entirely (the rule's day_of_month no longer matters)

- [ ] **Step 4: Update ChargesForm — save due day to parent for RPC**

In `src/app/app/p/new/steps/charges-form.tsx`: the global due day selector stays, but it no longer cascades to individual charges. Remove the `handleDueDayChange` cascade logic that updates per-charge `dueDay`. The due day value still flows to the parent via `dueDayRef` — it will be passed to the RPC in the next task.

- [ ] **Step 5: Update charges-section.tsx — remove dueDay from handleSave**

In `src/app/app/p/[id]/sections/charges-section.tsx`, remove `dueDay` from the objects passed to `createCharges` and `updateCharge`.

- [ ] **Step 6: Fix TypeScript errors**

Run: `pnpm tsc --noEmit`
Fix any remaining references to `dueDay` on `ChargeConfig` or `ChargeInput`.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/p/new/steps/charge-config-sheet.tsx src/app/actions/properties/ src/app/app/p/new/steps/charges-form.tsx src/app/app/p/\[id\]/sections/charges-section.tsx
git commit -m "refactor: remove per-charge dueDay, keep unit-level due day only"
```

### Task 6: Pass due day to RPC in createProperty action

**Files:**
- Modify: `src/app/actions/properties/create-property.ts`
- Modify: `src/app/app/p/new/create-property-flow.tsx`
- Modify: `src/test/supabase.ts`

- [ ] **Step 1: Update createProperty to accept and pass due_day**

In `src/app/actions/properties/create-property.ts`, add `due_day` to the FormData parsing and pass `p_due_day` to the RPC call:

```ts
const dueDay = Number(formData.get('due_day')) || 10

const { data, error } = await supabase.rpc('create_property_with_membership', {
  // ...existing params...
  p_due_day: dueDay,
})
```

- [ ] **Step 2: Update CreatePropertyFlow to pass due day in FormData**

In `src/app/app/p/new/create-property-flow.tsx`, inside `handleChargesComplete`, add `formData.set('due_day', chargeDueDay.current)` before calling `createProperty`.

- [ ] **Step 3: Update test helper**

In `src/test/supabase.ts`, update `createTestProperty` to pass `p_due_day: 10` to the RPC call.

- [ ] **Step 4: Verify**

Run: `pnpm tsc --noEmit && pnpm test:integration`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/properties/create-property.ts src/app/app/p/new/create-property-flow.tsx src/test/supabase.ts
git commit -m "feat: pass due_day to create_property_with_membership RPC"
```

### Task 7: Update ChargeCard and unit-charges query to remove per-charge due day

**Files:**
- Modify: `src/lib/queries/unit-charges.ts`
- Modify: `src/components/charge-card.tsx`

- [ ] **Step 1: Remove dueDay from ChargeDefinition and query**

In `src/lib/queries/unit-charges.ts`:
- Remove `dueDay: number | null` from `ChargeDefinition` interface
- Remove `recurring_rules ( day_of_month )` from the select query
- Remove the `dueDay: rules[0]?.day_of_month ?? null` mapping

- [ ] **Step 2: Update ChargeCard**

In `src/components/charge-card.tsx`:
- Remove `unitDueDay` prop
- Remove the due day comparison from `buildSubtitle` (the `if (charge.dueDay != null && charge.dueDay !== unitDueDay)` block)

- [ ] **Step 3: Update all ChargeCard usages**

Search for `<ChargeCard` and remove the `unitDueDay` prop from all call sites (likely `src/app/app/p/[id]/sections/charges-section.tsx`).

- [ ] **Step 4: Update integration tests if they reference dueDay**

Check and update any integration tests that create charges with `dueDay` — remove the field or replace with a static value that won't break the `createChargesCore` call.

- [ ] **Step 5: Verify**

Run: `pnpm tsc --noEmit && pnpm test:integration`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries/unit-charges.ts src/components/charge-card.tsx src/app/app/p/\[id\]/sections/
git commit -m "refactor: remove per-charge due day from queries and UI"
```

---

## Phase 3: Data Layer — Queries & Server Actions

### Task 8: Statement queries and hooks

**Files:**
- Create: `src/lib/queries/statement.ts`
- Create: `src/lib/queries/statement-charges.ts`
- Create: `src/lib/queries/unit-statements.ts`
- Create: `src/lib/hooks/use-statement.ts`
- Create: `src/lib/hooks/use-statement-charges.ts`
- Create: `src/lib/hooks/use-unit-statements.ts`

- [ ] **Step 1: Create statement query**

`src/lib/queries/statement.ts`:

```ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface Statement {
  id: string
  unitId: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  currency: string
  publishedAt: string | null
  revision: number
  createdAt: string
  updatedAt: string
}

export async function fetchStatement(supabase: TypedSupabaseClient, statementId: string): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, unit_id, period_year, period_month, status, total_amount_minor, currency, published_at, revision, created_at, updated_at')
    .eq('id', statementId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Statement not found')

  return {
    id: data.id,
    unitId: data.unit_id,
    periodYear: data.period_year,
    periodMonth: data.period_month,
    status: data.status as Statement['status'],
    totalAmountMinor: data.total_amount_minor,
    currency: data.currency,
    publishedAt: data.published_at,
    revision: data.revision,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const statementQueryKey = (id: string) => ['statement', id] as const
```

- [ ] **Step 2: Create statement-charges query**

`src/lib/queries/statement-charges.ts`:

```ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface ChargeInstance {
  id: string
  statementId: string
  chargeDefinitionId: string | null
  sourceDocumentId: string | null
  name: string
  amountMinor: number
  currency: string
  chargeSource: 'manual' | 'imported' | 'corrected'
  splitType: 'percentage' | 'fixed_amount'
  landlordPercentage: number | null
  tenantPercentage: number | null
  landlordFixedMinor: number | null
  tenantFixedMinor: number | null
  sourceDocument: { id: string; fileName: string; mimeType: string } | null
}

export async function fetchStatementCharges(
  supabase: TypedSupabaseClient,
  statementId: string,
): Promise<ChargeInstance[]> {
  const { data, error } = await supabase
    .from('charge_instances')
    .select(`
      id, statement_id, charge_definition_id, source_document_id,
      name, amount_minor, currency, charge_source, split_type,
      landlord_percentage, tenant_percentage, landlord_fixed_minor, tenant_fixed_minor,
      source_documents ( id, file_name, mime_type )
    `)
    .eq('statement_id', statementId)
    .order('created_at')

  if (error || !data) return []

  return data.map((row) => {
    const doc = row.source_documents as unknown as { id: string; file_name: string; mime_type: string } | null
    return {
      id: row.id,
      statementId: row.statement_id,
      chargeDefinitionId: row.charge_definition_id,
      sourceDocumentId: row.source_document_id,
      name: row.name,
      amountMinor: row.amount_minor,
      currency: row.currency,
      chargeSource: row.charge_source as ChargeInstance['chargeSource'],
      splitType: row.split_type as ChargeInstance['splitType'],
      landlordPercentage: row.landlord_percentage,
      tenantPercentage: row.tenant_percentage,
      landlordFixedMinor: row.landlord_fixed_minor,
      tenantFixedMinor: row.tenant_fixed_minor,
      sourceDocument: doc ? { id: doc.id, fileName: doc.file_name, mimeType: doc.mime_type } : null,
    }
  })
}

export const statementChargesQueryKey = (statementId: string) => ['statement-charges', statementId] as const
```

- [ ] **Step 3: Create unit-statements query**

`src/lib/queries/unit-statements.ts`:

```ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface UnitStatement {
  id: string
  periodYear: number
  periodMonth: number
  status: 'draft' | 'published'
  totalAmountMinor: number
  currency: string
  createdAt: string
}

export async function fetchUnitStatements(
  supabase: TypedSupabaseClient,
  unitId: string,
): Promise<UnitStatement[]> {
  const { data, error } = await supabase
    .from('statements')
    .select('id, period_year, period_month, status, total_amount_minor, currency, created_at')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    status: row.status as UnitStatement['status'],
    totalAmountMinor: row.total_amount_minor,
    currency: row.currency,
    createdAt: row.created_at,
  }))
}

export const unitStatementsQueryKey = (unitId: string) => ['unit-statements', unitId] as const
```

- [ ] **Step 4: Create the three hooks**

`src/lib/hooks/use-statement.ts`:
```ts
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchStatement, statementQueryKey } from '@/lib/queries/statement'

export type { Statement } from '@/lib/queries/statement'

export function useStatement(statementId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: statementQueryKey(statementId),
    queryFn: () => fetchStatement(supabase, statementId),
  })
}
```

`src/lib/hooks/use-statement-charges.ts`:
```ts
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchStatementCharges, statementChargesQueryKey } from '@/lib/queries/statement-charges'

export type { ChargeInstance } from '@/lib/queries/statement-charges'

export function useStatementCharges(statementId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: statementChargesQueryKey(statementId),
    queryFn: () => fetchStatementCharges(supabase, statementId),
  })
}
```

`src/lib/hooks/use-unit-statements.ts`:
```ts
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchUnitStatements, unitStatementsQueryKey } from '@/lib/queries/unit-statements'

export type { UnitStatement } from '@/lib/queries/unit-statements'

export function useUnitStatements(unitId: string) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: unitStatementsQueryKey(unitId),
    queryFn: () => fetchUnitStatements(supabase, unitId),
  })
}
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries/ src/lib/hooks/
git commit -m "feat: add statement, statement-charges, and unit-statements queries and hooks"
```

### Task 9: Missing charges query and hook

**Files:**
- Create: `src/lib/queries/missing-charges.ts`
- Create: `src/lib/hooks/use-missing-charges.ts`

- [ ] **Step 1: Create missing-charges query**

This fetches active charge definitions for the unit that have no matching charge instance on the given statement. Uses the same `fetchDefinitionsWithRules` pattern from generate-instances.

```ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface MissingCharge {
  definitionId: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
}

export async function fetchMissingCharges(
  supabase: TypedSupabaseClient,
  unitId: string,
  statementId: string,
  periodYear: number,
  periodMonth: number,
): Promise<MissingCharge[]> {
  // Get all active definitions for this unit
  const { data: definitions, error: defError } = await supabase
    .from('charge_definitions')
    .select('id, name, charge_type, amount_minor, recurring_rules ( start_date, end_date )')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (defError || !definitions) return []

  // Get all charge instances on this statement that reference a definition
  const { data: instances, error: instError } = await supabase
    .from('charge_instances')
    .select('charge_definition_id')
    .eq('statement_id', statementId)
    .not('charge_definition_id', 'is', null)

  if (instError) return []

  const coveredIds = new Set((instances ?? []).map((i) => i.charge_definition_id))

  // Filter to definitions not covered and in period
  return definitions
    .filter((def) => !coveredIds.has(def.id))
    .filter((def) => {
      const rules = (def.recurring_rules ?? []) as unknown as { start_date: string; end_date: string | null }[]
      const rule = rules[0]
      if (!rule) return true // no rule = always active
      const periodKey = periodYear * 100 + periodMonth
      const [sy, sm] = rule.start_date.split('-').map(Number)
      if (periodKey < sy * 100 + sm) return false
      if (rule.end_date) {
        const [ey, em] = rule.end_date.split('-').map(Number)
        if (periodKey > ey * 100 + em) return false
      }
      return true
    })
    .map((def) => ({
      definitionId: def.id,
      name: def.name,
      chargeType: def.charge_type as MissingCharge['chargeType'],
      amountMinor: def.amount_minor,
    }))
}

export const missingChargesQueryKey = (unitId: string, statementId: string) =>
  ['missing-charges', unitId, statementId] as const
```

- [ ] **Step 2: Create the hook**

`src/lib/hooks/use-missing-charges.ts`:
```ts
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchMissingCharges, missingChargesQueryKey } from '@/lib/queries/missing-charges'

export type { MissingCharge } from '@/lib/queries/missing-charges'

export function useMissingCharges(unitId: string, statementId: string, periodYear: number, periodMonth: number) {
  const supabase = createClient()
  return useSuspenseQuery({
    queryKey: missingChargesQueryKey(unitId, statementId),
    queryFn: () => fetchMissingCharges(supabase, unitId, statementId, periodYear, periodMonth),
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/missing-charges.ts src/lib/hooks/use-missing-charges.ts
git commit -m "feat: add missing-charges query and hook for completeness warnings"
```

### Task 10: recalculateStatementTotal utility and createStatement server action

**Files:**
- Create: `src/lib/statements/recalculate-total.ts`
- Create: `src/app/actions/statements/create-statement.ts`

- [ ] **Step 1: Create shared recalculate-total utility**

`src/lib/statements/recalculate-total.ts`:
```ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function recalculateStatementTotal(
  supabase: TypedSupabaseClient,
  statementId: string,
): Promise<number> {
  const { data: instances } = await supabase
    .from('charge_instances')
    .select('amount_minor')
    .eq('statement_id', statementId)

  const total = (instances ?? []).reduce((sum, i) => sum + i.amount_minor, 0)

  await supabase
    .from('statements')
    .update({ total_amount_minor: total })
    .eq('id', statementId)

  return total
}
```

- [ ] **Step 2: Write the integration test**

Create `src/app/actions/statements/__tests__/create-statement.integration.test.ts` that:
- Creates a test user and property with charges (rent + variable)
- Calls `createStatementCore`
- Asserts: statement row created with correct period/status, charge instances generated only for rent (not variable), total_amount_minor calculated correctly

- [ ] **Step 3: Write the server action**

`src/app/actions/statements/create-statement.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { generateAndPersistInstancesCore } from './generate-instances'
import { recalculateStatementTotal } from '@/lib/statements/recalculate-total'

export interface CreateStatementResult {
  success: boolean
  statementId?: string
  error?: string
}

export async function createStatementCore(
  supabase: TypedSupabaseClient,
  unitId: string,
  periodYear: number,
  periodMonth: number,
): Promise<CreateStatementResult> {
  // Check for existing statement in this period
  const { data: existing } = await supabase
    .from('statements')
    .select('id')
    .eq('unit_id', unitId)
    .eq('period_year', periodYear)
    .eq('period_month', periodMonth)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Statement already exists for this period' }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Create the statement
  const { data: statement, error: createError } = await supabase
    .from('statements')
    .insert({
      unit_id: unitId,
      period_year: periodYear,
      period_month: periodMonth,
      status: 'draft',
      total_amount_minor: 0,
      currency: 'BRL',
      created_by: user.id,
      revision: 1,
    })
    .select('id')
    .single()

  if (createError || !statement) {
    return { success: false, error: createError?.message ?? 'Failed to create statement' }
  }

  // Generate charge instances from definitions
  await generateAndPersistInstancesCore(
    supabase, unitId, statement.id, periodYear, periodMonth,
  )

  // Recalculate total from generated instances
  await recalculateStatementTotal(supabase, statement.id)

  return { success: true, statementId: statement.id }
}

export async function createStatement(
  unitId: string,
  periodYear: number,
  periodMonth: number,
): Promise<CreateStatementResult> {
  const supabase = await createClient()
  return createStatementCore(supabase, unitId, periodYear, periodMonth)
}
```

- [ ] **Step 3: Run integration test**

Run: `pnpm test:integration -- create-statement`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/statements/
git commit -m "feat: createStatement server action with charge instance generation"
```

### Task 11: addChargeToStatement, updateChargeInstance, removeChargeInstance actions

**Files:**
- Create: `src/app/actions/statements/add-charge.ts`
- Create: `src/app/actions/statements/update-charge-instance.ts`
- Create: `src/app/actions/statements/remove-charge-instance.ts`

Uses `recalculateStatementTotal` from `src/lib/statements/recalculate-total.ts` (created in Task 10).

- [ ] **Step 1: Create addChargeToStatement**

Write `src/app/actions/statements/add-charge.ts` with a `addChargeToStatementCore` function that:
- Accepts `statementId`, `name`, `amountMinor`, optional `chargeDefinitionId`, optional `sourceDocumentId`
- If `chargeDefinitionId` provided, fetches the definition's allocations and copies split fields
- Otherwise defaults to 100% tenant percentage
- Inserts the charge_instance
- Calls `recalculateStatementTotal`
- Returns `{ success: boolean, chargeInstanceId?: string }`

- [ ] **Step 3: Create updateChargeInstance**

Write `src/app/actions/statements/update-charge-instance.ts` with `updateChargeInstanceCore` that:
- Accepts `instanceId`, `amountMinor`, optional `name`, optional `sourceDocumentId` (null to remove)
- Updates the charge_instance row
- Calls `recalculateStatementTotal` using the instance's statement_id
- Returns `{ success: boolean }`

- [ ] **Step 4: Create removeChargeInstance**

Write `src/app/actions/statements/remove-charge-instance.ts` with `removeChargeInstanceCore` that:
- Accepts `instanceId`
- Verifies the instance is on a draft statement and has no `charge_definition_id` (manual only)
- Deletes the charge_instance
- Calls `recalculateStatementTotal`
- Returns `{ success: boolean }`

- [ ] **Step 5: Write integration tests**

Create `src/app/actions/statements/__tests__/statement-charges.integration.test.ts` covering:
- Add a manual charge → total recalculated
- Add a charge with definition → split fields copied
- Update charge amount → total recalculated
- Remove manual charge → total recalculated
- Cannot remove definition-linked charge

- [ ] **Step 6: Run tests**

Run: `pnpm test:integration -- statement-charges`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/statements/ src/lib/statements/
git commit -m "feat: add/update/remove charge instance actions with total recalculation"
```

### Task 12: uploadBillDocument and saveChargeAsDefinition actions

**Files:**
- Create: `src/app/actions/statements/upload-bill.ts`
- Create: `src/app/actions/statements/save-charge-definition.ts`

- [ ] **Step 1: Create uploadBillDocument**

`src/app/actions/statements/upload-bill.ts`:
- Accepts `unitId`, `file: File`, `periodYear`, `periodMonth`
- Generates a storage path: `${unitId}/${periodYear}-${periodMonth}/${crypto.randomUUID()}-${file.name}`
- Uploads to `source-documents` bucket via `supabase.storage`
- Creates a `source_documents` row with `unit_id`, `file_path`, `file_name`, `mime_type`, `file_size_bytes`, `period_year`, `period_month`, `uploaded_by`, `ingestion_status: 'uploaded'`
- Returns `{ success: boolean, documentId?: string }`

- [ ] **Step 2: Create saveChargeAsDefinition**

`src/app/actions/statements/save-charge-definition.ts`:
- Reuses `createChargesCore` from `src/app/actions/properties/create-charges.ts` (since it already creates definition + recurring_rule + allocations)
- Accepts `unitId` and a `SplitInput`-compatible object with `name`, `chargeType`, `amountMinor`
- Calls `createChargesCore` with a single charge
- Returns `{ success: boolean }`

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/statements/
git commit -m "feat: uploadBillDocument and saveChargeAsDefinition actions"
```

---

## Phase 4: Route Group Restructure & Layout

### Task 13: Split app layout into (main) and (focused) route groups

**Files:**
- Modify: `src/app/app/layout.tsx` — strip AppBar/SW/Install, keep auth + PostHog
- Create: `src/app/app/(main)/layout.tsx` — AppBar, SwUpdateNotifier, InstallPrompt
- Create: `src/app/app/(focused)/layout.tsx` — bare wrapper, no chrome
- Move: `src/app/app/page.tsx` → `src/app/app/(main)/page.tsx`
- Move: `src/app/app/p/[id]/` → `src/app/app/(main)/p/[id]/`
- Move: `src/app/app/p/new/` → `src/app/app/(focused)/p/new/`
- Keep: `src/app/app/loading.tsx` in parent (shared by both groups)

- [ ] **Step 1: Refactor AppBar to fetch its own data**

`AppBar` currently accepts `userName` and `avatarUrl` as props from the parent layout. Refactor it to be a client component that uses `useProfile()` to fetch its own data — following the established atomic hooks pattern. Remove the props. This makes it self-contained and independent of the layout hierarchy.

- [ ] **Step 2: Create (main) layout**

`src/app/app/(main)/layout.tsx`:
```tsx
import { AppBar } from '../app-bar'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBar />
      <div className="min-h-0 flex-1">
        {children}
      </div>
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
```

- [ ] **Step 2: Create (focused) layout**

`src/app/app/(focused)/layout.tsx`:
```tsx
export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Update parent app layout**

`src/app/app/layout.tsx` — remove AppBar, SwUpdateNotifier, InstallPrompt. Keep auth checks, PostHogIdentify, and the outer `h-svh flex flex-col` wrapper. Children are now rendered by the route group layouts.

**Performance:** Keep the profile fetch in the parent layout for PostHogIdentify (still needs props). Additionally, prefetch the `['profile']` query key via a QueryClient + HydrationBoundary so that AppBar's `useProfile()` hydrates instantly without a loading flash:

```tsx
const queryClient = new QueryClient()
await queryClient.prefetchQuery({
  queryKey: ['profile'],
  queryFn: async () => ({ id: userId, fullName: profile?.full_name ?? null, ... }),
})
```

Wrap children in `<HydrationBoundary state={dehydrate(queryClient)}>` so the profile is available to AppBar in the (main) layout immediately.

- [ ] **Step 4: Move files**

```bash
# Create route group directories
mkdir -p src/app/app/\(main\)/p
mkdir -p src/app/app/\(focused\)/p

# Move home page
mv src/app/app/page.tsx src/app/app/\(main\)/page.tsx

# Move property detail
mv src/app/app/p/\[id\] src/app/app/\(main\)/p/\[id\]

# Move property onboarding to focused
mv src/app/app/p/new src/app/app/\(focused\)/p/new
```

- [ ] **Step 5: Fix imports**

Update any relative imports in moved files that now have different paths (e.g., `../app-bar` may need to become `../../app-bar`). Run `pnpm tsc --noEmit` to find broken imports.

- [ ] **Step 6: Compile verification**

Run: `pnpm build`
Expected: no build errors. This catches broken imports from file moves.

- [ ] **Step 6b: USER CHECKPOINT — visual review**

Pause for user visual review. Start `pnpm dev` and ask the user to verify:
- Home page (`/app`) — AppBar visible on desktop, same as before
- Property detail (`/app/p/[id]`) — AppBar visible on desktop, same as before
- Property onboarding (`/app/p/new`) — NO AppBar on desktop (focused flow)
- All routes still behind auth

Do not proceed until the user confirms.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/
git commit -m "refactor: split app into (main) and (focused) route groups"
```

### Task 14: Create DetailPageLayout compound component

**Files:**
- Create: `src/components/detail-page-layout.tsx`

- [ ] **Step 1: Build the component**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function DetailPageLayout({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-full flex-col', className)} {...props}>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}

function DetailPageLayoutHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="detail-page-header" className={className} {...props} />
}

function DetailPageLayoutBody({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="detail-page-body" className={cn('mt-8 md:flex md:gap-8', className)} {...props}>
      {children}
    </div>
  )
}

function DetailPageLayoutMain({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="detail-page-main" className={cn('flex-1 space-y-8', className)} {...props} />
}

function DetailPageLayoutSidebar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-page-sidebar"
      className={cn('mt-8 space-y-8 md:mt-0 md:w-96 md:shrink-0', className)}
      {...props}
    />
  )
}

export {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/detail-page-layout.tsx
git commit -m "feat: add DetailPageLayout compound component"
```

### Task 15: Refactor property detail page to use DetailPageLayout

**Files:**
- Modify: `src/app/app/(main)/p/[id]/property-detail.tsx`

- [ ] **Step 1: Replace inline layout with DetailPageLayout**

Replace the manual layout markup in `property-detail.tsx` with the new component:

```tsx
<DetailPageLayout>
  <DetailPageLayoutHeader>
    <PageHeader>...</PageHeader>
    <SetupProgressSection />
  </DetailPageLayoutHeader>
  <DetailPageLayoutBody>
    <DetailPageLayoutMain>
      {property.unitIds.map((unitId) => (
        <UnitSection key={unitId} unitId={unitId} propertyId={propertyId} />
      ))}
    </DetailPageLayoutMain>
    <DetailPageLayoutSidebar>
      <PropertyInfoSection propertyId={propertyId} />
      {property.unitIds.map((unitId) => (
        <TenantsSection key={unitId} propertyId={propertyId} unitId={unitId} />
      ))}
    </DetailPageLayoutSidebar>
  </DetailPageLayoutBody>
</DetailPageLayout>
```

- [ ] **Step 2: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify the property detail page layout is identical to before on mobile and desktop. Do not proceed until the user confirms.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\(main\)/p/\[id\]/property-detail.tsx
git commit -m "refactor: property detail page uses DetailPageLayout"
```

---

## Phase 5: Statement UI

### Task 16: Statement lifecycle section on property detail page

**Files:**
- Create: `src/app/app/(main)/p/[id]/sections/statement-section.tsx`
- Create: `src/lib/statement-urgency.ts`
- Modify: `src/app/app/(main)/p/[id]/sections/unit-section.tsx`
- Modify: `src/app/app/(main)/p/[id]/page.tsx` (prefetch unit-statements)

- [ ] **Step 1: Create urgency utility**

`src/lib/statement-urgency.ts` — pure function that computes urgency state:

```ts
export type UrgencyLevel = 'normal' | 'approaching' | 'overdue'

export function getStatementUrgency(dueDay: number, now: Date = new Date()): UrgencyLevel {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const dueDate = new Date(year, month, dueDay)

  const diffMs = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'approaching'
  return 'normal'
}

export function getDaysUntilDue(dueDay: number, now: Date = new Date()): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  const dueDate = new Date(year, month, dueDay)
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
```

- [ ] **Step 2: Create StatementSection component**

`src/app/app/(main)/p/[id]/sections/statement-section.tsx`:
- Uses `useUnitStatements(unitId)` and `useUnit(unitId)` hooks
- Computes current billing period from client date
- Finds existing statement for current period
- Renders one of:
  - **No statement card:** "Generate [Month] Statement" CTA with urgency styling based on `getStatementUrgency`. Period picker via a Select showing current + previous months without statements.
  - **Draft card:** Summary showing total, charge count, "Draft" badge. Links to `/app/p/${propertyId}/s/${statementId}` via `<Link>` (Next.js auto-prefetches the route's server component on viewport/hover). Urgency messaging if approaching due date.
- The "Generate" button calls `createStatement` action, invalidates queries, then navigates via `router.push`
- **Query invalidation after createStatement:** `unit-statements` (new statement), `home-action-items` (generate reminder disappears), `home-properties` (statement status may feed dashboard)
- Fires `statement_draft_created` PostHog event on generation

- [ ] **Step 3: Add StatementSection to UnitSection (above ChargesSection)**

In `src/app/app/(main)/p/[id]/sections/unit-section.tsx`, add `<StatementSection>` above `<ChargesSection>`:

```tsx
<div>
  {showUnitHeader && <h2 className="mb-4 text-lg font-semibold text-foreground">{unit.name}</h2>}
  <StatementSection unitId={unitId} propertyId={propertyId} />
  <ChargesSection unitId={unitId} propertyId={propertyId} />
</div>
```

- [ ] **Step 4: Prefetch unit-statements in the server component**

In `src/app/app/(main)/p/[id]/page.tsx`, add `unitStatementsQueryKey` and `fetchUnitStatements` to the prefetch Promise.all alongside charges, tenants, and invites.

- [ ] **Step 5: Add i18n keys**

Add translation keys for statement section strings (generate CTA, urgency messages, draft summary) to the relevant locale files.

- [ ] **Step 6: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify: statement section appears above charges on property detail, urgency styling works, generating a statement navigates to the draft. Do not proceed until the user confirms.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/\(main\)/p/\[id\]/ src/lib/statement-urgency.ts src/messages/
git commit -m "feat: statement lifecycle section on property detail page with urgency states"
```

### Task 17: Statement draft page — route and shell

**Files:**
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/page.tsx`
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/statement-draft.tsx`

- [ ] **Step 1: Create the server component page**

`src/app/app/(focused)/p/[id]/s/[statementId]/page.tsx`:
- Prefetches all data the draft view needs via QueryClient + HydrationBoundary:
  - `statement` (by statementId)
  - `statement-charges` (by statementId)
  - `unit` (by unitId, derived from statement)
  - `property` (by propertyId from route params)
  - `missing-charges` (by unitId + statementId + period) — required for completeness warnings
- All prefetches run in parallel via `Promise.all`
- Wraps in HydrationBoundary + FadeIn
- Renders `<StatementDraft statementId={id} propertyId={propertyId} />`

- [ ] **Step 2: Create the client component shell**

`src/app/app/(focused)/p/[id]/s/[statementId]/statement-draft.tsx`:
- Uses `useStatement`, `useStatementCharges`, `useMissingCharges`, `useUnit`, `useProperty`
- Renders using `DetailPageLayout`:
  - Header: PageHeader with back link, title ("[Month] [Year] Statement"), subtitle (unit + address), Draft badge
  - Main: CompletenessWarning (if missing charges), ChargesList
  - Sidebar: SummaryCard (total, due date, status), "Review & Publish" button (disabled/placeholder until PRO-16), audit note
  - Bottom bar (mobile): "Review & Publish" button via StickyBottomBar

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\(focused\)/p/\[id\]/s/
git commit -m "feat: statement draft page shell with DetailPageLayout"
```

### Task 18: Statement draft — charges list and completeness warnings

**Files:**
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/sections/charges-list.tsx`
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/sections/completeness-warning.tsx`
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/sections/summary-card.tsx`

- [ ] **Step 1: Create SummaryCard**

Shows total amount (large, formatted in BRL), due date, status badge. Uses the `Card` component.

- [ ] **Step 2: Create CompletenessWarning**

Uses `useMissingCharges` hook. Renders:
- InfoBox with warning variant: "N expected charge(s) missing" with "Review" CTA
- The "Review" CTA scrolls to the missing items in the charges list (via ref or id scroll)

- [ ] **Step 3: Create ChargesList**

Renders charge instances from `useStatementCharges` plus missing charges from `useMissingCharges`:
- Each charge row: uses `ChargeRow` compound component with icon, name, source badge, split indicator, amount
- Source badge logic: `charge_source === 'manual'` + `sourceDocumentId !== null` → show paperclip; `charge_source === 'manual'` + no doc → "manual"; linked to a recurring definition → "recurring"
- Missing charge rows: dimmed, "missing" badge, "Add" CTA button
- Total row at bottom
- "+Add" button in section header

- [ ] **Step 4: Add i18n keys**

Add translation keys for charges list, completeness warning, summary card.

- [ ] **Step 5: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify: charges list displays correctly, missing charges show as dimmed rows with "Add" CTA, summary card shows total and due date, completeness warning appears when charges are missing. Do not proceed until the user confirms.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/\(focused\)/p/\[id\]/s/ src/messages/
git commit -m "feat: statement draft charges list, completeness warnings, summary card"
```

### Task 19a: Extract shared charge form components

**Files:**
- Create: `src/components/charge-form-fields.tsx`
- Create: `src/components/file-upload.tsx`
- Modify: `src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx`

- [ ] **Step 1: Create FileUpload component**

`src/components/file-upload.tsx`:
- Drop zone or click-to-upload for PDF/image files
- Accepts `onFileSelect: (file: File) => void`, `progress?: number` (0-100), `file?: File | null`, `uploadedUrl?: string | null`, `onClear?: () => void`
- **Image files**: show a small thumbnail via `URL.createObjectURL(file)` during upload, or from `uploadedUrl` after upload
- **PDF files**: show a PDF icon + file name (no thumbnail generation for MVP)
- **Both**: tappable to preview — images open lightbox or new tab, PDFs open in browser viewer via Supabase signed URL
- Shows determinate progress bar during upload (when `progress` is between 0 and 100)
- Shows clear button to remove the attached file
- Accepts `accept="application/pdf,image/*"`
- **Max file size: 10MB** — validate client-side before upload. If exceeded, show inline error: "File is too large. Maximum size is 10MB." Do not start the upload. Accept a `maxSizeMB` prop (default 10) so consumers can override if needed.

- [ ] **Step 2: Extract shared form primitives**

`src/components/charge-form-fields.tsx` — extract from `charge-config-sheet.tsx`:
- `AmountInput` — hero currency input with clear button, enter-to-save, currency symbol prefix
- `PayerToggle` — tenant/landlord/split segmented control
- `SplitSlider` — percentage/amount mode toggle with range input and labels
- `ChargeTypeSwitch` — "or switch to fixed/variable" link
- `VariablePlaceholder` �� dashed upload hint for variable charges

Export all as named exports. Keep the same props/behavior — this is a pure extraction, no logic changes.

- [ ] **Step 3: Refactor ChargeConfigSheet to use shared components**

Update `src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx`:
- Replace inline `AmountInput`, `PayerToggle`, `SplitSlider`, `ChargeTypeSwitch`, `VariablePlaceholder` with imports from `@/components/charge-form-fields`
- Remove the inline component definitions
- No functional changes — the onboarding sheet should behave identically

- [ ] **Step 4: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify the property onboarding charge config sheet still works identically (add/edit charges, split slider, type toggle). Do not proceed until the user confirms.

- [ ] **Step 5: Commit**

```bash
git add src/components/charge-form-fields.tsx src/components/file-upload.tsx src/app/app/\(focused\)/p/new/steps/charge-config-sheet.tsx
git commit -m "refactor: extract shared charge form primitives and create FileUpload component"
```

### Task 19b: Add/edit charge sheet for statement draft

**Files:**
- Create: `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`

- [ ] **Step 1: Create AddChargeSheet**

`src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`:
- **Must match the visual structure of the onboarding `ChargeConfigSheet`** — same `ResponsiveModal` wrapper, same hero `AmountInput` at top, same `PayerToggle` + `SplitSlider` layout below, same button sizing/styling, same spacing. The user should feel like they're in the same product, not a different form.
- Composes from shared components: `AmountInput`, `PayerToggle`, `SplitSlider` (from `@/components/charge-form-fields`), `FileUpload` (from `@/components/file-upload`)
- **Additions beyond the onboarding sheet:** `FileUpload` area below the amount/split section, and a nudge callout for variable charges via InfoBox: "Attaching the bill helps your tenant verify this charge"
- Props: `statementId`, `unitId`, `periodYear`, `periodMonth`, optional `missingCharge` (pre-fills name + chargeDefinitionId, split from definition), optional `existingInstance` (edit mode)
- On save:
  1. If file selected: call `uploadBillDocument` action (track progress via XHR or Supabase upload callback)
  2. Call `addChargeToStatement` or `updateChargeInstance` with the document ID
  3. **Query invalidation after add:** `statement-charges`, `statement` (total changed), `missing-charges` (if filling expected charge)
  4. **Query invalidation after update:** `statement-charges`, `statement` (total changed)
- Edit mode: pre-fills name, amount, shows attached file thumbnail/icon with clear button for removal
- Remove action: calls `removeChargeInstance` (only for manual charges)
  - **Query invalidation after remove:** `statement-charges`, `statement` (total changed), `missing-charges` (removed charge may now be missing again)
- When filling a missing expected charge: payer/split fields hidden (copied from definition)
- When adding ad-hoc: payer/split fields visible (defaults to 100% tenant)

- [ ] **Step 2: Wire the sheet into ChargesList**

In `charges-list.tsx`, manage sheet state (open/closed, selected charge/missing charge). "+Add" and missing charge "Add" CTAs open the sheet.

- [ ] **Step 3: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify: adding a manual charge works, bill upload shows progress bar with thumbnail/icon, editing a charge pre-fills values, bill can be previewed and removed, removing a manual charge works, payer/split appears for ad-hoc charges. Do not proceed until the user confirms.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/\(focused\)/p/\[id\]/s/ src/components/
git commit -m "feat: add/edit charge sheet with bill upload, composed from shared form primitives"
```

### Task 20: "Save for next time" flow

**Files:**
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`

- [ ] **Step 1: Add "save for next time" follow-up after ad-hoc charge save**

After saving an ad-hoc charge (no `chargeDefinitionId`), show a follow-up step inside the sheet before closing:

- Heading: "Save this charge for future statements?"
- **Charge type selector**: ask the landlord to choose:
  - **Recurring** (fixed amount each month) — e.g., condo fee, internet. Saves the entered amount on the definition.
  - **Variable** (amount changes each month) — e.g., gas, electric. Saves `null` as the amount so it shows as a completeness warning in future statements.
- Two actions: "Save" (creates the definition) / "No thanks" (closes the sheet, charge instance is already saved)
- The charge name and payer/split are carried over from what they just entered — no need to re-enter

- [ ] **Step 2: Wire "Save" to saveChargeAsDefinition**

Calls `saveChargeAsDefinition` with:
- `name`: from the charge they just added
- `chargeType`: from their selection (recurring or variable)
- `amountMinor`: the entered amount if recurring, `null` if variable
- `payer`, `splitMode`, `tenantPercent`, `landlordPercent`, etc.: from the charge they just configured

**Query invalidation:** `unit-charges` (new definition), `missing-charges` (new variable definition is immediately "expected"), `property-counts` (charge count changed), `home-action-items` (configure_charges action may change). Shows a brief success confirmation, then closes the sheet.

- [ ] **Step 3: USER CHECKPOINT — visual review**

Run: `pnpm build` to catch compile errors, then start `pnpm dev`. Ask the user to verify: add an ad-hoc charge, "save for next time" prompt appears with charge type choice, selecting recurring saves with amount, selecting variable saves with null amount, the charge appears in the unit's charge definitions on the property detail page. Do not proceed until the user confirms.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/\(focused\)/p/\[id\]/s/
git commit -m "feat: save ad-hoc charges as definitions for future statements"
```

---

## Phase 6: Polish & Finalization

### Task 21: Acquisition channel — migration, send-invite, and signup

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_invitations_source_column.sql`
- Modify: `src/app/actions/send-invite.ts`
- Modify: `src/app/auth/sign-up/page.tsx`

- [ ] **Step 1: Add source column to invitations**

```sql
alter table invitations add column source text;
```

- [ ] **Step 2: Apply migration and regenerate types**

Run: `npx supabase db reset && npx supabase gen types typescript --local > src/lib/types/database.ts`

- [ ] **Step 3: Store source when creating invitations**

In `src/app/actions/send-invite.ts`, add `source` to the insert:

```ts
const { error: dbError } = await supabase.from('invitations').insert({
  code,
  invited_email: email,
  invited_by: invitedBy,
  role: 'landlord',
  status: 'pending',
  source,  // 'waitlist' | 'direct'
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
})
```

- [ ] **Step 4: Set acquisition_channel on PostHog identify at signup**

In `src/app/auth/sign-up/page.tsx`, after successful signup and invite redemption, query the redeemed invitation to get `source`, then set it as a person property:

```ts
posthog.identify(user.id, {
  acquisition_channel: invitationSource, // 'waitlist' | 'direct'
})
```

The invite code is available in the signup form state. Query the invitation by code to get the `source` value before identifying. Alternatively, the `redeem_invite_code` trigger could return the source — but client-side query is simpler for now.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/lib/types/database.ts src/app/actions/send-invite.ts src/app/auth/sign-up/page.tsx
git commit -m "feat: store invitation source and set acquisition_channel on signup"
```

### Task 22: Analytics events — statement_draft_created and statement_viewed

**Files:**
- Modify: `src/app/app/(main)/p/[id]/sections/statement-section.tsx` (statement_draft_created)
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/statement-draft.tsx` (statement_viewed)

- [ ] **Step 1: Fire statement_draft_created on generation**

In `statement-section.tsx`, after successful `createStatement`, fire:
```ts
posthog.capture('statement_draft_created', {
  property_id: propertyId,
  unit_id: unitId,
  period_year: periodYear,
  period_month: periodMonth,
})
```

- [ ] **Step 2: Fire statement_viewed on page load**

In `statement-draft.tsx`, fire on mount:
```ts
useEffect(() => {
  posthog.capture('statement_viewed', {
    statement_id: statementId,
    viewer_role: 'landlord',
  })
}, [statementId])
```

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\(main\)/p/\[id\]/ src/app/app/\(focused\)/p/\[id\]/
git commit -m "feat: add statement_draft_created and statement_viewed analytics events"
```

### Task 23: Create Landlord Activation funnel in PostHog

- [ ] **Step 1: Create the funnel insight**

Use PostHog MCP to create a "Landlord Activation" funnel insight:
`signed_up` → `property_created` → `charge_definition_created` → `tenant_invited` → `statement_draft_created` → `statement_published` → `statement_viewed` → `payment_marked` → `payment_confirmed`

90-day window, ordered funnel. Most later steps won't have data yet — they fill in as features ship.

- [ ] **Step 2: Add to Acquisition & Activation dashboard**

Add the funnel to the existing "Acquisition & Activation" dashboard alongside the Waitlist and Direct Invite funnels.

- [ ] **Step 3: No commit needed** (PostHog-only change)

### Task 24: Update home_action_items view for late generation reminder

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_action_items_statement_reminder.sql`

- [ ] **Step 1: Write the migration**

Add a `generate_statement` action type to `home_action_items` view. This surfaces units that have active charges but no statement for the current billing period when the due date is approaching (≤7 days away):

```sql
-- Add generate_statement reminder to home_action_items
create or replace view home_action_items with (security_invoker = true) as
-- [keep all existing UNION ALL blocks unchanged]

union all

-- Units with charges but no statement for current month, due date approaching
select
  'generate_statement' as action_type,
  p.id as property_id,
  p.name as property_name,
  u.name as detail_name,
  null::text as detail_email,
  null::uuid as detail_id,
  null::timestamptz as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join units u on u.property_id = p.id and u.deleted_at is null
join property_counts pc on pc.property_id = p.id
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null
  and pc.charge_count > 0
  and not exists (
    select 1 from statements s
    where s.unit_id = u.id
      and s.period_year = extract(year from now())::int
      and s.period_month = extract(month from now())::int
      and s.deleted_at is null
  );
```

Note: Check the existing view definition for the `detail_id` column (added in migration `20260401130000_action_items_detail_id.sql`) and ensure the column list matches.

- [ ] **Step 2: Apply locally**

Run: `npx supabase db reset`

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --local > src/lib/types/database.ts`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ src/lib/types/database.ts
git commit -m "feat: add generate_statement reminder to home_action_items view"
```

### Task 25: Update components.md and SetupProgressSection

**Files:**
- Modify: `docs/project/components.md`
- Modify: `src/app/app/(main)/p/[id]/sections/setup-progress-section.tsx`

- [ ] **Step 1: Update components.md**

Add entries for:
- `DetailPageLayout` compound component
- `FileUpload` component
- Statement lifecycle card pattern

- [ ] **Step 2: Update SetupProgressSection**

Replace the hardcoded `firstStatementPublished: false` with a check against `useUnitStatements` — if any statement exists with status `'published'`, mark it true.

- [ ] **Step 3: Commit**

```bash
git add docs/project/components.md src/app/app/\(main\)/p/\[id\]/sections/setup-progress-section.tsx
git commit -m "docs: update components.md with new components, fix setup progress statement check"
```

### Task 26: Version bump, changelog, final verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Update CHANGELOG.md**

Add a new version entry with user-facing notes:
- Generate monthly statements for your properties
- See which charges are included and which are still missing
- Add charges manually with optional bill uploads for transparency
- Bills you upload are visible to tenants for trust

- [ ] **Step 2: Bump version in package.json**

Increment the minor version (this is a new feature).

- [ ] **Step 3: Run full verification**

```bash
pnpm tsc --noEmit
pnpm test:integration
pnpm build
```

All must pass.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md package.json
git commit -m "release: vX.Y.Z — statement generation and completeness warnings"
```

- [ ] **Step 5: Push**

```bash
git push
```

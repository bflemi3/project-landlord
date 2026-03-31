# Server Action Integration Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integration-test all property detail page server actions against a real local Supabase instance.

**Architecture:** Refactor each server action to extract a `*Core` function that accepts a `TypedSupabaseClient` parameter (same pattern as `src/lib/queries/`). The thin `'use server'` wrapper remains a one-liner that calls `createClient()` then delegates. Tests create real users, real data, and assert real database state via the Supabase admin client.

**Tech Stack:** Vitest, @supabase/supabase-js (admin + authenticated clients), local Supabase (`supabase start`)

**Prerequisites:** Local Supabase must be running (`supabase start`). No seed file needed — tests create and clean up their own data.

---

## File Structure

| File | Purpose |
|---|---|
| **Create:** `vitest.integration.config.ts` | Vitest config for integration tests (node env, longer timeout, path aliases) |
| **Create:** `src/test/supabase.ts` | Test helper — admin client, create test user, create test property, cleanup |
| **Create:** `src/test/setup-integration.ts` | Global setup/teardown for the integration suite |
| **Modify:** `src/app/actions/properties/update-property.ts` | Extract `updatePropertyCore` |
| **Modify:** `src/app/actions/properties/create-charges.ts` | Extract `createChargesCore` + export `validateCharge` |
| **Modify:** `src/app/actions/properties/update-charge.ts` | Extract `updateChargeCore` |
| **Modify:** `src/app/actions/properties/remove-charge.ts` | Extract `removeChargeCore` |
| **Modify:** `src/app/actions/properties/invite-tenant.ts` | Extract `inviteTenantCore` |
| **Modify:** `src/app/actions/properties/cancel-invite.ts` | Extract `cancelInviteCore` |
| **Modify:** `src/app/actions/properties/remove-tenant.ts` | Extract `removeTenantCore` |
| **Create:** `src/app/actions/properties/__tests__/update-property.integration.test.ts` | Tests for updateProperty |
| **Create:** `src/app/actions/properties/__tests__/create-charges.integration.test.ts` | Tests for createCharges |
| **Create:** `src/app/actions/properties/__tests__/update-charge.integration.test.ts` | Tests for updateCharge |
| **Create:** `src/app/actions/properties/__tests__/remove-charge.integration.test.ts` | Tests for removeCharge |
| **Create:** `src/app/actions/properties/__tests__/invite-tenant.integration.test.ts` | Tests for inviteTenant |
| **Create:** `src/app/actions/properties/__tests__/cancel-invite.integration.test.ts` | Tests for cancelInvite |
| **Create:** `src/app/actions/properties/__tests__/remove-tenant.integration.test.ts` | Tests for removeTenant |
| **Modify:** `package.json` | Add `test:integration` script |

> **Note:** `resend-invite` is intentionally excluded from integration tests. It depends on the Resend email API and its core value is "send email then update timestamp" — the email part can't be tested without mocking Resend (defeating the purpose), and the timestamp update is trivially similar to `cancelInvite`.

---

## Task 1: Integration test infrastructure

**Files:**
- Create: `vitest.integration.config.ts`
- Create: `src/test/supabase.ts`
- Create: `src/test/setup-integration.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the integration vitest config**

```ts
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    globalSetup: './src/test/setup-integration.ts',
  },
})
```

- [ ] **Step 2: Create the global setup that verifies Supabase is running**

```ts
// src/test/setup-integration.ts
export async function setup() {
  const { execSync } = await import('child_process')
  try {
    const output = execSync('npx supabase status -o json', { encoding: 'utf8' })
    const status = JSON.parse(output)
    process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY
    process.env.SUPABASE_ANON_KEY = status.ANON_KEY
  } catch {
    throw new Error('Local Supabase is not running. Start it with: supabase start')
  }

  // Verify connectivity
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('profiles').select('id').limit(1)
  if (error) throw new Error(`Cannot reach local Supabase: ${error.message}`)
}
```

- [ ] **Step 3: Create the test helper**

```ts
// src/test/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const SUPABASE_URL = 'http://127.0.0.1:54321'

type TypedAdminClient = SupabaseClient<Database>
type TypedClient = SupabaseClient<Database>

/** Admin client — bypasses RLS. Use for seeding and assertions only. */
export function getAdminClient(): TypedAdminClient {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** Create a test user and return an authenticated client. */
export async function createTestUser(
  email?: string,
): Promise<{ client: TypedClient; userId: string; email: string }> {
  const admin = getAdminClient()
  const testEmail = email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`
  const password = 'test-password-123!'

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: testEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test User' },
  })
  if (createError || !userData.user) throw new Error(`Failed to create test user: ${createError?.message}`)

  const client = createClient<Database>(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
  const { error: signInError } = await client.auth.signInWithPassword({ email: testEmail, password })
  if (signInError) throw new Error(`Failed to sign in test user: ${signInError.message}`)

  return { client, userId: userData.user.id, email: testEmail }
}

/** Create a property with a unit via the RPC. */
export async function createTestProperty(
  client: TypedClient,
  name = 'Test Property',
): Promise<{ propertyId: string; unitId: string }> {
  const { data, error } = await client.rpc('create_property_with_membership', {
    p_name: name, p_street: 'Rua Teste', p_number: '123',
    p_city: 'Sao Paulo', p_state: 'SP', p_postal_code: '01310100',
  })
  if (error || !data) throw new Error(`Failed to create test property: ${error?.message}`)
  const result = data as unknown as { property_id: string; unit_id: string }
  return { propertyId: result.property_id, unitId: result.unit_id }
}

/** Delete a test user and all their data. */
export async function cleanupTestUser(userId: string): Promise<void> {
  const admin = getAdminClient()
  await admin.from('properties').delete().eq('created_by', userId)
  await admin.auth.admin.deleteUser(userId)
}
```

- [ ] **Step 4: Add `test:integration` script to package.json**

Add to scripts: `"test:integration": "vitest run --config vitest.integration.config.ts"`

- [ ] **Step 5: Verify infrastructure**

Run: `pnpm test:integration`
Expected: 0 tests found, no errors

- [ ] **Step 6: Commit**

```
git add vitest.integration.config.ts src/test/ package.json
git commit -m "test: add integration test infrastructure for server actions"
```

---

## Task 2: Refactor server actions to extract core functions

Extract the database logic from each server action into a `*Core` function that accepts a `TypedSupabaseClient`. The `'use server'` wrapper becomes a one-liner.

**Files:** All 7 server action files in `src/app/actions/properties/`

The pattern for each file:

```ts
// Before
export async function doThing(input) {
  const supabase = await createClient()
  // ...database logic...
}

// After
export async function doThingCore(supabase: TypedSupabaseClient, input) {
  // ...database logic (unchanged)...
}

export async function doThing(input) {
  const supabase = await createClient()
  return doThingCore(supabase, input)
}
```

- [ ] **Step 1: Refactor `update-property.ts`** — Extract `updatePropertyCore(supabase, input)`
- [ ] **Step 2: Refactor `remove-charge.ts`** — Extract `removeChargeCore(supabase, chargeId)`
- [ ] **Step 3: Refactor `cancel-invite.ts`** — Extract `cancelInviteCore(supabase, inviteId)`
- [ ] **Step 4: Refactor `remove-tenant.ts`** — Extract `removeTenantCore(supabase, membershipId)`
- [ ] **Step 5: Refactor `create-charges.ts`** — Extract `createChargesCore(supabase, unitId, charges)` + export `validateCharge`
- [ ] **Step 6: Refactor `update-charge.ts`** — Extract `updateChargeCore(supabase, input)`
- [ ] **Step 7: Refactor `invite-tenant.ts`** — Extract `inviteTenantCore(supabase, input)` where input has `{ propertyId, unitId, email, tenantName, invitedBy }`. Email sending stays in the wrapper only.
- [ ] **Step 8: Verify build** — Run `pnpm build`, expected: success
- [ ] **Step 9: Commit**

```
git add src/app/actions/properties/
git commit -m "refactor: extract core functions from server actions for testability"
```

---

## Task 3: Test `updateProperty`

**Files:** Create `src/app/actions/properties/__tests__/update-property.integration.test.ts`

**Test cases:**
- [ ] **updates property name and all address fields** — call `updatePropertyCore`, assert DB fields match
- [ ] **no-op for non-existent property** — RLS silently filters, returns success (0 rows updated)

---

## Task 4: Test `createCharges`

**Files:** Create `src/app/actions/properties/__tests__/create-charges.integration.test.ts`

**Test cases for `validateCharge` (pure unit tests, no DB):**
- [ ] rejects due day below 1
- [ ] rejects due day above 28
- [ ] rejects non-positive fixed amount
- [ ] allows null amount for variable charges
- [ ] allows valid fixed charge

**Test cases for `createChargesCore` (integration):**
- [ ] creates charge definition + recurring rule + allocation for a single charge
- [ ] creates split charge with two allocations (tenant + landlord)
- [ ] returns empty success for no charges
- [ ] reports validation failures without stopping other charges

---

## Task 5: Test `updateCharge`

**Files:** Create `src/app/actions/properties/__tests__/update-charge.integration.test.ts`

Seeds a charge via `createChargesCore` in `beforeAll`.

**Test cases:**
- [ ] updates charge name, amount, and due day
- [ ] switches from tenant-pays to split (creates second allocation)
- [ ] switches from split back to single payer (removes extra allocation)

---

## Task 6: Test `removeCharge`

**Files:** Create `src/app/actions/properties/__tests__/remove-charge.integration.test.ts`

**Test cases:**
- [ ] soft-deletes a charge (sets `deleted_at`, row still exists)

---

## Task 7: Test `inviteTenant` and `cancelInvite`

**Files:**
- Create `src/app/actions/properties/__tests__/invite-tenant.integration.test.ts`
- Create `src/app/actions/properties/__tests__/cancel-invite.integration.test.ts`

**inviteTenant test cases:**
- [ ] creates a pending invitation with correct fields
- [ ] rejects duplicate pending invitation for same email
- [ ] rejects empty email
- [ ] rejects missing property/unit context

**cancelInvite test cases:**
- [ ] cancels a pending invitation (status becomes 'cancelled')
- [ ] allows re-inviting after cancellation (no duplicate conflict)

---

## Task 8: Test `removeTenant`

**Files:** Create `src/app/actions/properties/__tests__/remove-tenant.integration.test.ts`

Seeds a tenant membership via admin client in `beforeAll`.

**Test cases:**
- [ ] soft-deletes a membership (sets `deleted_at`, row still exists)

---

## Summary

| Task | What | Tests |
|---|---|---|
| 1 | Infrastructure (config, helpers, npm script) | 0 |
| 2 | Refactor 7 server actions (extract `*Core`) | 0 |
| 3 | `updateProperty` | 2 |
| 4 | `createCharges` + `validateCharge` | 9 |
| 5 | `updateCharge` | 3 |
| 6 | `removeCharge` | 1 |
| 7 | `inviteTenant` + `cancelInvite` | 6 |
| 8 | `removeTenant` | 1 |
| **Total** | | **~22 tests** |

After all tasks: `pnpm test` runs fast unit tests, `pnpm test:integration` runs the integration suite against local Supabase.

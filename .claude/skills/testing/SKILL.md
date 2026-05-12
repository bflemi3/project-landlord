---
name: testing
description: Testing patterns, priorities, and integration test setup. Use when writing or modifying tests.
paths:
  - "**/*.test.*"
  - "**/vitest.*"
  - "src/test/**"
---

# Testing Rules

## What to Test

**Test logic, not components.** The unit-test target is pure functions: utilities in `src/lib/`, data transforms in `src/data/<domain>/shared.ts`, server actions (via the `*Core` pattern below), reducers, derivations, validators, store/state logic.

**Do not unit-test feature/page components.** Pages, sections, and feature components are verified by running them in a browser and confirming behavior end-to-end. They are too coupled to layout, design, and product flow for unit tests to be worth the maintenance.

**Design-system primitives are the exception.** Components in `src/components/ui/` (Badge, Button, Input, etc.) may be unit-tested when their variant logic or interaction surface is complex enough to regress silently. Keep these tests behavior-focused (rendered class names, ARIA, disabled state) — never assert against internal markup that isn't part of the public contract.

**If a feature component contains non-trivial logic, extract it.** Pull the logic into a pure function in `src/lib/` (or a colocated `*-logic.ts` / custom hook), unit-test the function, and have the component call it. The component stays a thin shell of JSX + hook calls; the logic gets isolated coverage.

## Priority Areas

Prioritize tests around: permissions/access control, money calculations, responsibility allocation, statement generation/revision, extraction validation, dispute flow, payment mark/confirm/reject, localization-sensitive logic, mobile UX regressions caught by browser smoke tests.

Not every module needs exhaustive testing. The sensitive workflow logic does.

## Test File Location

Place test files in a `__tests__/` directory colocated with the module they test. For example:

- `src/data/profiles/actions/__tests__/redeem-invite-rpc.integration.test.ts` tests the `redeem_invite` RPC
- `src/lib/__tests__/validation.test.ts` tests `src/lib/validation.ts`
- `src/app/actions/properties/__tests__/invite-tenant.test.ts` tests `src/app/actions/properties/invite-tenant.ts`

Unit tests use the suffix `.test.ts`. Integration tests use `.integration.test.ts`.

## Integration Tests

Run against a real local Supabase instance with actual DB operations, RLS policies, and constraints.

**Setup:** `pnpm test:integration` (requires `supabase start`). Config: `vitest.integration.config.ts` with `node` environment. Helpers: `src/test/supabase.ts`.

## Server Action Pattern

Every server action exports a `*Core` function accepting `TypedSupabaseClient` as first parameter. The `'use server'` wrapper is a thin shell. Tests call the core function with an authenticated test client.

```ts
// Core — testable
export async function updatePropertyCore(supabase: TypedSupabaseClient, input) { ... }

// Wrapper — thin shell
export async function updateProperty(input) {
  const supabase = await createClient()
  return updatePropertyCore(supabase, input)
}
```

## Test Helpers

- `createTestUser()` — creates auth user, returns authenticated client + userId
- `createTestProperty(client)` — creates property + unit via RPC
- `cleanupTestUser(userId)` — deletes user and all their data
- `getAdminClient()` — bypasses RLS, for assertions only

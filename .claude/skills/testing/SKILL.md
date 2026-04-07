---
name: testing
description: Testing patterns, priorities, and integration test setup. Use when writing or modifying tests.
paths:
  - "**/*.test.*"
  - "**/vitest.*"
  - "src/test/**"
---

# Testing Rules

## Priority Areas

Prioritize tests around: permissions/access control, money calculations, responsibility allocation, statement generation/revision, extraction validation, dispute flow, payment mark/confirm/reject, localization-sensitive UI, critical mobile UX regressions.

Not every component needs exhaustive testing. The sensitive workflow logic does.

## Test File Location

Place test files in a `__tests__/` directory colocated with the module they test. For example:

- `src/lib/invitations/__tests__/accept-tenant-invite.integration.test.ts` tests `src/lib/invitations/accept-tenant-invite.ts`
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

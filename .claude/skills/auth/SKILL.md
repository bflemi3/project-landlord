---
name: auth
description: Authentication, sign-up gating, and invite redemption. Use when touching /auth/* routes, supabase middleware, the redemption core, or migrations on auth.users/profiles/invitations/memberships.
paths:
  - "src/app/auth/**"
  - "src/lib/supabase/middleware.ts"
  - "src/lib/supabase/server.ts"
  - "src/lib/supabase/client.ts"
  - "src/app/actions/redeem-invite.ts"
  - "src/app/actions/validate-invite.ts"
  - "src/app/actions/send-invite.ts"
  - "src/data/profiles/actions/redeem-invite-by-code.ts"
  - "src/data/properties/actions/invite-tenant.ts"
  - "supabase/migrations/*invite*.sql"
  - "supabase/migrations/*profile*.sql"
  - "supabase/migrations/*redeem*.sql"
  - "supabase/migrations/*claim*.sql"
  - "supabase/migrations/*redeem_invite*.sql"
---

# Auth

**Before writing a single line of code in this area, read `docs/project/architecture-auth.md` end-to-end.** Auth regressions in this project come from partial understanding. The architecture doc is the source of truth.

## TL;DR

- Access is gated by the JWT claim `app_metadata.has_redeemed_invite = true`. Middleware (`src/lib/supabase/middleware.ts`) reads it on every `/app/*` request. Not redeemed → `/auth/enter-code`.
- Invites come from two sources: waitlist/manual (landlord) and LL-issued tenant invites tied to `(property_id, unit_id)`.
- **All redemption logic lives in the `redeem_invite` SECURITY DEFINER RPC** (migration `20260420154115`). `redeemInviteByCodeCore` is a thin TS wrapper. The RPC atomically updates `invitations`, updates `profiles`, inserts `memberships` (for tenant invites), and rolls back on any failure.
- There are **seven entry paths** that produce an authenticated session. Each has subtly different code-handling. The architecture doc enumerates them.

## Invariants

1. **JWT claim is the only gate.** Don't add parallel checks on `profiles.has_redeemed_invite`.
2. **All redemption logic lives in the RPC.** `redeemInviteByCodeCore` must stay a thin wrapper — do not re-add TS-side mutations of `invitations`, `profiles`, or `memberships` that duplicate what the RPC does.
3. **Every redemption call site must `refreshSession()` before redirecting to `/app`** — and MUST NOT call it on failure. A refresh on a failed redemption mints a JWT claiming state the DB doesn't hold.
4. **Every redirect from a route that touched Supabase must copy `supabaseResponse.cookies`** via `redirectWithCookies`. Missing cookie propagation = stale JWT in the browser.
5. **Server Components cannot set cookies.** If redemption must happen from a Server Component, redirect to `/auth/redeem`.
6. **Invitation emails must be lowercased on creation.** The RPC is case-insensitive via `lower()`, but creation-side lowercasing keeps data clean.
7. **Any DB op the user's RLS doesn't permit must live in a SECURITY DEFINER RPC.** Do not add service-role admin calls from TS code.
8. **RPC returns structured `{ success, reason }`. Callers must differentiate reasons.** Trust `success: true` means the transaction completed — it's atomic. On failure, distinguish user-input reasons (`invalid_or_mismatch`) from server/infra reasons (`rpc_error`, `rpc_empty`, `profile_missing`): the latter MUST be logged and MUST surface distinct UI copy. Do not collapse every failure to a generic invalid-code message.
9. **`AUTH_PASSTHROUGH_PATHS` in middleware is load-bearing.** New `/auth/*` routes that must be reachable by authenticated users need to be added.
10. **Don't bypass the redemption path.** New entry routes must plug into `redeemInviteByCodeCore` (→ RPC) + `refreshSession` + `redirectWithCookies`.

## Known good shape (do not regress)

The three historical silent-failure bugs are fixed:

- Tenant membership insert now succeeds via SECURITY DEFINER (was denied by RLS).
- Email case mismatch is tolerated by the RPC (was exact-match via RLS).
- `/auth/sign-in?code=XXX` email path now redirects successful sign-in through `/auth/redeem?code=...&next=/app` (was silently dropping the code).

Migration `20260420154115` also includes a one-time backfill that repairs historical orphaned tenant memberships (accepted tenant invitations with no matching `memberships` row).

Full details and test coverage references are in `docs/project/architecture-auth.md`.

## Outstanding work

Caller-side handling of RPC failure reasons is half-finished. The RPC returns structured `{ success, reason }`, but today every call site collapses every failure to a generic invalid-code outcome — no distinct logging, no distinct UI, no code preservation on retry. RED tests pin the desired behavior (`src/app/actions/__tests__/redeem-invite-rpc-error.test.ts`).

- Read this before making changes in `src/app/auth/redeem/route.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/enter-code/page.tsx`, or the wrapper — the in-flight work may affect your change.

## When changing anything here

1. Re-read `docs/project/architecture-auth.md`. Don't rely on memory.
2. Map the change against the seven entry paths. Ask: does this path still redeem? Does the JWT still refresh? Do cookies still propagate?
3. Prefer fixing outstanding issues over working around them.
4. Run the test suite and add realistic integration tests (don't bypass auth layers in tests for this area).

## Related

- `data-modeling` — `invitations`, `memberships`, `profiles` schema and RLS
- `email-templates` — invite-code and tenant-invite emails
- `testing` — integration test setup against real local Supabase
- `.claude/rules/security-lgpd.md` — tracking and consent rules
- `.claude/rules/database-migrations.md` — backfill rule (especially for columns that app code depends on, e.g. `has_redeemed_invite`)

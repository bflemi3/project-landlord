# Auth Architecture

**Status:** Implemented. Redemption now runs through the `redeem_invite` SECURITY DEFINER RPC (migration `20260420154115`). All three historical silent-failure bugs (tenant membership never created, email-case mismatch, Path #3 gap) are fixed.

This document is the single source of truth for how authentication, sign-up gating, and invite redemption work. **Read it end-to-end before changing anything in `src/app/auth/**`, `src/lib/supabase/middleware.ts`, `src/data/profiles/actions/redeem-invite-by-code.ts`, the `redeem_invite` RPC, or any migration that touches `auth.users`, `profiles`, `invitations`, or `memberships`.**

Changes to auth have historically introduced silent regressions because implementors fixed one symptom without understanding the full system. Every path below is load-bearing.

---

## Product Requirements

The product gates access behind an invite code. Codes come from two sources:

1. **Waitlist / manual invites** — `invitations.source = 'waitlist' | 'manual'`, `role = 'landlord'`. No `property_id` / `unit_id`. Recipient becomes a landlord on sign-up.
2. **Tenant invites** — LL invites a tenant to a specific `(property_id, unit_id)` from the property page. `invitations.source = 'direct'`, `role = 'tenant'`. Redemption must create a `memberships` row so the tenant shows as active on the property.

An authenticated user without a redeemed invite is not a real user — they can only see `/auth/enter-code`. The JWT claim `app_metadata.has_redeemed_invite = true` is the gate. Middleware reads it on every `/app/*` request.

---

## The Gate

```
src/lib/supabase/middleware.ts
```

Every request hits `updateSession`, which calls `supabase.auth.getClaims()` and then:

- `/eng/*` — requires authenticated user + `engineer_allowlist` row. Else redirect to `/auth/sign-in` or `/app`.
- `/app/*` with no user → `/auth/sign-in`
- `/app/*` with user but `app_metadata.has_redeemed_invite !== true` → `/auth/enter-code`
- `/auth/*` with an authenticated, redeemed user → `/app` (drops the `code` query param so it doesn't leak)

`AUTH_PASSTHROUGH_PATHS` escapes the last rule for routes that must run while authenticated: `/auth/callback`, `/auth/redeem`, `/auth/reset-password`, `/auth/verified`, `/auth/enter-code`.

**Invariant:** the JWT claim is the only gate. Do not rely on `profiles.has_redeemed_invite` for access control — it is a mirror, not the source.

---

## Entry Paths

There are seven paths that produce an authenticated session. The invite-code handling differs across them. Every path must end with the JWT carrying `has_redeemed_invite: true` before the user hits `/app`.

| # | Path | Where invite code comes from | Who redeems it | Where `refreshSession` runs |
|---|---|---|---|---|
| 1 | Email sign-up (no code) — landing on `/auth/sign-up` without `?code=` | User types it in form step 1 | `user_metadata.invite_code` → picked up by `/auth/callback?type=signup` | `/auth/callback` |
| 2 | Email sign-up with code link — `/auth/sign-up?code=XXX` (tenant invite email) | URL `?code=` | Same as #1 (form carries code through to `signUp`) | `/auth/callback` |
| 3 | Email sign-in (existing account, with code) — `/auth/sign-in?code=XXX` | URL `?code=` | On sign-in success, client redirects to `/auth/redeem?code=...&next=/app` → RPC | `/auth/redeem` route handler |
| 4 | Google OAuth sign-up or sign-in with code | `pending_invite_code` cookie set before `signInWithOAuth` | `/auth/callback` reads cookie → `redeemInviteByCodeCore` → RPC | `/auth/callback` |
| 5 | Already-authenticated user visiting `/auth/sign-up?code=XXX` | URL `?code=` | Server Component redirects to `/auth/redeem?code=...` → RPC | `/auth/redeem` route handler |
| 6 | `/auth/enter-code` form (manual code entry) | Form input | Server action `redeemInviteCode` → RPC | Server action |
| 7 | Password reset — `/auth/callback?type=recovery` | No code | No redemption | — (user already redeemed previously) |

### Why `/auth/redeem` exists

Server Components cannot write cookies. Path #5 lands on a Server Component (`src/app/auth/sign-up/page.tsx`). If it tried to call `redeemInviteByCodeCore` + `refreshSession` directly, the refreshed JWT cookie would never reach the browser — the user would land on `/app` with a stale JWT and bounce back to `/auth/enter-code`. The route handler at `/auth/redeem` runs in a request context that can set cookies, so the refreshed session survives the redirect.

### Why `refreshSession` is scattered

Supabase mints JWTs using `auth.users.raw_app_meta_data` at the moment the token is issued. The DB trigger `sync_invite_redeemed_claim` (migration `20260409120000`) copies `profiles.has_redeemed_invite = true` into `auth.users.raw_app_meta_data.has_redeemed_invite`, but the currently-issued JWT cookie doesn't know about it until refreshed. Every redemption call site must `refreshSession()` before redirecting to `/app`, or middleware will see the stale claim and bounce the user back.

---

## Data Flow: Redeeming an Invite

Redemption is one atomic RPC call. `redeemInviteByCodeCore` is a thin wrapper that calls `supabase.rpc('redeem_invite', { invite_code })`. The `_userId` parameter is preserved for call-site compatibility but is ignored — the RPC identifies the caller via `auth.uid()` on the JWT.

```
supabase.rpc('redeem_invite', { invite_code })
  ↓ SECURITY DEFINER — runs with function owner privileges, bypasses RLS
  ↓ grant execute only to `authenticated` — anon gets permission denied (42501)
1. Resolve caller via auth.uid() — reject if null (unauthenticated)
2. SELECT profiles.email (lowercased) for caller
3. UPDATE invitations
     SET status='accepted', accepted_by=auth.uid(), accepted_at=now()
     WHERE upper(trim(code)) = upper(trim(:invite_code))
       AND status='pending'
       AND (expires_at IS NULL OR expires_at > now())
       AND lower(invited_email) = :caller_email_lower
   — case-insensitive match on both code and email. Returns invite row.
4. If no row matched → return { success:false, reason:'invalid_or_mismatch' } — rolls back.
5. UPDATE profiles SET has_redeemed_invite=true, acquisition_channel=COALESCE(..., invite.source)
   ↓ DB trigger sync_invite_redeemed_claim copies to auth.users.raw_app_meta_data
6. If invite.role='tenant' AND property_id AND unit_id:
     INSERT INTO memberships (user_id, property_id, unit_id, role='tenant')
     ON CONFLICT (user_id, property_id, unit_id) DO NOTHING
7. Return { success:true, source: invite.source }
  ↓ any error above rolls back the whole transaction
  ↓
Caller (route handler / server action / sign-in client):
  8. refreshSession() — mints new JWT cookie carrying the claim
  9. redirect to /app (with response-bound cookies via redirectWithCookies)
```

Every call site must perform steps 8 and 9. If either is skipped, the user bounces to `/auth/enter-code` despite having redeemed. The RPC itself is atomic: any failure (RLS violation inside, conflicts, etc.) rolls back everything — no partial state possible.

### Failure branch

On `{ success: false, reason }` the call site must NOT call `refreshSession` (that would mint a JWT claiming state the DB doesn't hold). Failure handling splits by category:

- **User-input reasons** (`invalid_or_mismatch`): expected error. No log. Redirect to `/auth/enter-code?error=invalid&code=<original>` so the form can show the invalid-code message and pre-populate the input.
- **Server/infra reasons** (`rpc_error`, `rpc_empty`, `profile_missing`): unexpected. `console.error` with the reason. Redirect to `/auth/enter-code?error=server&code=<original>` so the page can surface distinct "server error, try again" copy and the user can retry without re-typing.

Caller-side handling is currently incomplete; see **Outstanding work** below.

---

## Cookie Propagation (Supabase SSR)

The Supabase SSR pattern is fragile. Every route handler and middleware that calls Supabase must follow the response-bound cookie pattern exactly:

```ts
let supabaseResponse = NextResponse.next({ request })
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() { return request.cookies.getAll() },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      supabaseResponse = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options))
    },
  },
})
```

When returning a redirect (not `supabaseResponse` itself), you **must** copy `supabaseResponse.cookies` onto the redirect response:

```ts
function redirectWithCookies(url, supabaseResponse) {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value, c))
  return redirect
}
```

**Invariant:** if you `redirect()` from a route that has called `refreshSession()` or any `supabase.auth.*` mutation, and you don't copy cookies, the browser never sees the new JWT.

---

## RLS Contract

The redemption flow runs inside the `redeem_invite` SECURITY DEFINER RPC, which bypasses RLS entirely. The RPC enforces its own identity check (`auth.uid()` must equal the row being mutated) and its own email match (case-insensitive). This is why the three silent-failure bugs went away: RLS no longer gates the membership insert, and email case is no longer exact-match.

RLS still matters for direct table access outside the RPC:

| Table | Operation | Policy | Enforced by |
|---|---|---|---|
| `invitations` | SELECT | Inviter (`invited_by = auth.uid()`) or invitee (`lower(invited_email) = lower(profile.email)`) | RLS |
| `invitations` | UPDATE | Same | RLS (redemption bypasses via RPC) |
| `profiles` | UPDATE (own row) | User owns row | RLS (redemption bypasses via RPC) |
| `memberships` | INSERT | `is_property_landlord(property_id)` — landlord only | RLS (tenant inserts go through RPC) |

**Rule:** any mutation a non-landlord user must perform on `memberships` (or any other table they don't have RLS write access to) belongs in a SECURITY DEFINER RPC, not in TS code running under the user's client.

---

## Invite Code Sources (Who Issues Them)

- **`src/app/actions/send-invite.ts`** — programmatic creation of landlord/waitlist invites. Not wired to any UI yet; called manually or from future admin tools.
- **`src/data/properties/actions/invite-tenant.ts`** — LL invites a tenant from the property page. Writes `invitations` row with `role='tenant'`, `property_id`, `unit_id`, lowercased `invited_email`. Sends email with `signUpUrl = /auth/sign-up?code=XXX`.
- **Waitlist sign-up** (`src/app/actions/waitlist.ts`) — does NOT create an invitation. Adds the email to Resend and sends a welcome email. Invitation creation happens separately.

---

## Resolved Issues (Historical Context)

All five bugs below were fixed by migration `20260420154115` (RPC consolidation) and the accompanying call-site changes. Keep this section — future changes in this area need the context to avoid reintroducing them.

### 1. Tenant membership never created on redemption (RLS failure) — FIXED

Redemption used to call `INSERT INTO memberships` under the user's RLS-scoped client. RLS requires `is_property_landlord(property_id)`; the redeeming tenant isn't a landlord, so the insert was denied silently. Tenants landed on `/app` but the LL's property page kept showing them as "pending".

**Fixed by:** `redeem_invite` RPC runs as `SECURITY DEFINER` and inserts the membership with owner privileges. Test coverage: `redeem-invite-rpc.integration.test.ts` T1.

**Backfill:** migration `20260420154115` includes an additive INSERT (`ON CONFLICT DO NOTHING`) that repairs existing orphaned tenant memberships — invitations where `status='accepted'`, `role='tenant'`, with both `property_id` and `unit_id` set, but no matching row in `memberships`.

### 2. Invitation UPDATE failed when emails didn't match exactly — FIXED

RLS required `invited_email = profiles.email` byte-for-byte. `User@Gmail.com` vs `user@gmail.com` silently denied the UPDATE.

**Fixed by:** RPC uses `lower(invited_email) = lower(profiles.email)`. `inviteTenantCore` also lowercases on creation (belt-and-suspenders). Test coverage: T2, T11, T12.

### 3. Path #3 never redeemed — FIXED

`/auth/sign-in?code=XXX` used to set `pending_invite_code` cookie and redirect to `/app`. The cookie was only read by `/auth/callback`, which password sign-ins skip. User bounced to `/auth/enter-code`.

**Fixed by:** `src/app/auth/sign-in/page.tsx` now redirects successful password sign-in to `/auth/redeem?code=XXX&next=/app` when `?code=` is present. The `pending_invite_code` cookie is no longer used on the email path (still used for Google OAuth, which must round-trip through Google).

### 4. Redemption complexity was accreted, not designed — FIXED

Previously used four redundant mechanisms to sync the JWT claim (DB trigger, service-role admin call, scattered `refreshSession`, `/auth/redeem` route). Each was added to fix a bug without removing the prior patch.

**Fixed by:** consolidated into one RPC. Kept the `sync_invite_redeemed_claim` trigger as the claim-sync path. Removed the service-role admin call (RPC's profile update fires the trigger). Kept `refreshSession` at call sites (still required for cookie propagation). Kept `/auth/redeem` (still required for Server Component entry path).

### 5. Silent failures — PARTIALLY FIXED

Previous implementation only checked the invitation UPDATE error. Membership insert and profile update errors were invisible.

**Fixed at the RPC layer:** RPC is a single transaction — any step's failure rolls back everything and the function returns `{ success: false, reason: ... }`. No partial state possible. The wrapper distinguishes `invalid_or_mismatch`, `unauthenticated`, `profile_missing`, `rpc_error`, `rpc_empty`.

**Not yet fixed at the caller layer:** every call site (`/auth/redeem`, `/auth/callback`, the server action) currently collapses every failure reason into a single generic outcome — no distinct logging, no distinct UI copy, no code preservation. Tracked in Outstanding work below.

---

## Outstanding work

Caller-side handling of the RPC's structured failure reasons is still incomplete. 18 RED unit tests pin the desired behavior; implementation is tracked in `docs/superpowers/plans/2026-04-20-invite-redemption-rpc-error-ux.md`.

Summary of gaps:

- Wrapper does not catch thrown exceptions from `supabase.rpc()` — an unhandled rejection propagates instead of returning `reason: 'rpc_error'`.
- `/auth/redeem` and `/auth/callback` do not log server/infra failures, so production regressions are invisible.
- `/auth/callback` falls through to `/app` / `/auth/verified` on `rpc_error`, and the user silently bounces to `/auth/enter-code` with no explanation.
- `/auth/enter-code` never reads the `?error=` query param, so even a correct upstream redirect wouldn't render a server-error message.
- The form on `/auth/enter-code` shows `invalidInviteCode` regardless of `reason` — a real server failure reads to the user as "your code is wrong".
- No call site preserves the invite code in the error redirect, so the user re-types a code they already submitted.
- Translation key `serverErrorInviteCode` does not exist in `messages/{en,pt-BR,es}.json`.

Not in scope for that plan (explicitly deferred): PostHog `invite_redemption_failed` event for observability beyond `console.error`, and alerting on rpc_error spikes.

---

## Invariants (Do Not Violate)

1. **The JWT `app_metadata.has_redeemed_invite` claim is the only access gate.** Don't add parallel checks against `profiles.has_redeemed_invite` in middleware or page-level guards.
2. **All redemption logic lives in the `redeem_invite` RPC.** `redeemInviteByCodeCore` is a thin wrapper — do not re-add TS-side mutations of `invitations`, `profiles`, or `memberships` that duplicate the RPC's work.
3. **Every redemption call site must call `refreshSession()` before redirecting to `/app` — and MUST NOT call it on failure.** Without it on success, the cookie carries a stale claim and middleware bounces the user back to `/auth/enter-code`. Calling it on failure would mint a JWT claiming state the DB doesn't hold.
4. **Every redirect from a route that touched Supabase must copy `supabaseResponse.cookies`.** Use `redirectWithCookies`.
5. **Server Components cannot set cookies.** If redemption must happen from a Server Component, redirect to a route handler (`/auth/redeem`).
6. **Invitation emails must be lowercased on creation.** The RPC is case-insensitive (via `lower()`), but creation-side lowercasing keeps the data clean and prevents surprises when other code reads `invited_email` directly.
7. **Any DB operation that the user's RLS doesn't permit must move into a SECURITY DEFINER function.** Do not add service-role admin calls from TS code.
8. **RPC failures return structured reasons; do not return `success: true` on partial success.** The RPC is atomic — any step failing rolls back everything. Callers can trust `{ success: true }` means every step completed.
9. **Callers must differentiate failure reasons.** `invalid_or_mismatch` is user-input error — no log, invalid-code copy in the UI. `rpc_error`, `rpc_empty`, `profile_missing` are server/infra failures — must be logged via `console.error` with the reason, must present distinct "try again" UI copy (`serverErrorInviteCode`), and must preserve the invite code in the error redirect so the user can retry with a single click.
10. **`AUTH_PASSTHROUGH_PATHS` is load-bearing.** Adding a new `/auth/*` route that should be reachable by authenticated users requires adding it to the list, or middleware will redirect to `/app`.
11. **Do not bypass the redemption path.** Every new entry route that produces a session must plug into the same `redeemInviteByCodeCore` (→ RPC) + `refreshSession` + `redirectWithCookies` pattern.
12. **Before changing anything, re-read this document.** Auth regressions come from partial understanding.

---

## Files

- `src/lib/supabase/middleware.ts` — the gate
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` — client factories
- `src/app/auth/callback/route.ts` — OAuth + email verification redirect handler
- `src/app/auth/redeem/route.ts` — server-side redemption for already-authenticated users
- `src/app/auth/sign-up/page.tsx` + `sign-up-form.tsx` — email + Google sign-up
- `src/app/auth/sign-in/page.tsx` — email + Google sign-in
- `src/app/auth/enter-code/page.tsx` — manual code entry for authenticated users
- `src/app/auth/verified/page.tsx` — post-email-verification landing
- `src/app/actions/redeem-invite.ts` — server action wrapping `redeemInviteByCodeCore`
- `src/app/actions/validate-invite.ts` — `validate_invite_code` + `validate_invite_with_context` RPC wrappers
- `src/data/profiles/actions/redeem-invite-by-code.ts` — the redemption core
- `src/data/properties/actions/invite-tenant.ts` — LL → tenant invite
- `src/app/actions/send-invite.ts` — landlord/waitlist invite creation
- `supabase/migrations/20260318120000_data_model_foundation.sql` — `memberships`, `invitations`, RLS policies
- `supabase/migrations/20260319170000_add_invite_code.sql` — `validate_invite_code` RPC
- `supabase/migrations/20260408130000_validate_invite_with_context_rpc.sql` — `validate_invite_with_context` RPC
- `supabase/migrations/20260409120000_sync_invite_redeemed_claim.sql` — trigger that syncs profile → JWT claim
- `supabase/migrations/20260420154115_redeem_invite_rpc.sql` — the `redeem_invite` SECURITY DEFINER RPC + tenant-membership backfill
- `src/data/profiles/actions/__tests__/redeem-invite-rpc.integration.test.ts` — RPC coverage (18 tests: happy path, email case, auth, security, idempotency, status/expiry, edge cases)

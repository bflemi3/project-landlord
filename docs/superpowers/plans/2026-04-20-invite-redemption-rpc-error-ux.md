# Invite Redemption — rpc_error Observability & UX — Implementation Plan

> Standalone follow-up plan to `2026-04-18-invite-redemption-jwt-sync.md`. Self-contained — no prior conversation context required.

**Goal:** When the `redeem_invite` RPC fails server-side, the failure must be (a) observable in production logs so regressions aren't invisible, (b) distinguishable in the UI from user-input errors so a real server outage doesn't read as "your code is wrong", and (c) recoverable without forcing the user to re-type a code they already submitted.

**Status:** 18 RED tests already exist across 5 files pinning the desired behavior. This plan is the implementation roadmap for turning them green.

**Branch:** `brandon/fix-invite-redemption-rpc-error-ux` off `main`. Create draft PR on start per `.claude/rules/linear-github.md`. No Linear issue yet — descriptive branch name without PRO- prefix is acceptable, or create a PRO- issue first.

**Do not touch:** The `redeem_invite` RPC itself (migration `20260420154115`), the `redeemInviteByCodeCore` wrapper's structured return shape, middleware, or the JWT claim sync. Those are correct. This plan fixes only the *callers* of `redeemInviteByCodeCore` and the UX downstream.

---

## Background

The `redeem_invite` SECURITY DEFINER RPC (migration `supabase/migrations/20260420154115_redeem_invite_rpc.sql`) returns a structured `{ success, reason }` payload. The wrapper `src/data/profiles/actions/redeem-invite-by-code.ts` normalizes outcomes:

| RPC outcome | Wrapper returns |
|---|---|
| `.rpc()` returns `{ error: … }` | `{ success: false, reason: 'rpc_error' }` |
| `.rpc()` returns `{ data: null }` | `{ success: false, reason: 'rpc_empty' }` |
| `.rpc()` throws | *uncaught exception propagates* ← gap |
| RPC returns `{ success: false, reason: 'invalid_or_mismatch' }` | pass-through |
| RPC returns `{ success: false, reason: 'profile_missing' }` | pass-through |
| RPC returns `{ success: true, source: … }` | pass-through |

Four call sites consume this wrapper:

1. `src/app/actions/redeem-invite.ts` — server action used by the `/auth/enter-code` form
2. `src/app/auth/redeem/route.ts` — magic-link handler for `?code=` URLs
3. `src/app/auth/callback/route.ts` — OAuth / email-signup callback, both the `pending_invite_code` cookie path and the `user_metadata.invite_code` path
4. (tests only — not a runtime caller)

**Every caller currently collapses every failure reason into the same outcome.** Specifically:

- `/auth/redeem` redirects all failures to `/auth/enter-code?error=invalid`, silently — no log line distinguishes a real server outage from "user typed a wrong code".
- `/auth/callback` discards the result entirely on both the OAuth and signup paths. On `rpc_error` the user lands at `/app` (OAuth) or `/auth/verified` (signup) without the `has_redeemed_invite` JWT claim, middleware bounces them to `/auth/enter-code`, and they see no error message at all.
- The server action returns `reason` to the client correctly, but `src/app/auth/enter-code/page.tsx` discards it via `const { success } = …` and shows `t('invalidInviteCode')` unconditionally — so a real server failure is presented to the user as "your code is wrong".
- The `/auth/enter-code` page never reads the `?error=` query param, so even if the upstream routes were fixed to redirect with a server-error flag, the page wouldn't show it.
- The wrapper does not catch thrown exceptions from `supabase.rpc()`, so a Supabase client network failure surfaces as an unhandled rejection with no structured reason and no place to branch.

This plan closes all five gaps and adds the small UX niceties (preserve the invite code across an error redirect; surface distinct copy).

---

## Existing RED tests (what to turn green)

All tests below are already written and currently fail against main. Each row corresponds to behavior that must hold after this plan lands.

### `src/data/profiles/actions/__tests__/redeem-invite-by-code.test.ts`

| Test | Pins |
|---|---|
| normalizes thrown exceptions from .rpc() to rpc_error | Wrapper must `try/catch` around `.rpc()` and return `{ success: false, reason: 'rpc_error' }` on exception |

The other 6 tests in this file already pass — they pin the existing shape so the refactor can't silently drop a code path.

### `src/app/auth/redeem/__tests__/route.test.ts`

| Test | Pins |
|---|---|
| logs rpc_error with the reason so production regressions are observable | `console.error` must be called with a message containing `rpc_error` |
| redirects rpc_error to a distinct error state (not ?error=invalid) | Redirect location must match `error=server` (or `reason=rpc_error`), not `error=invalid` |
| logs profile_missing — indicates a broken signup trigger, not user error | `console.error` must fire with `profile_missing` |
| preserves the invite code in the error redirect on rpc_error | Redirect location must contain `code=<original>` |
| preserves the invite code in the error redirect on rpc_empty | Same, for `rpc_empty` |

The 5 already-passing tests in this file pin the `refreshSession` invariant: must NOT fire on any failure reason; must fire exactly once on success.

### `src/app/auth/callback/__tests__/route.test.ts`

| Test | Pins |
|---|---|
| logs rpc_error on pending_invite_code (OAuth) redemption failure | Log with `rpc_error` for OAuth path |
| logs rpc_error on signup user_metadata.invite_code redemption failure | Log with `rpc_error` for signup path |
| logs rpc_empty with the reason for OAuth redemption failure | Log with `rpc_empty` for OAuth path |
| redirects to /auth/enter-code?error=server on rpc_error (OAuth path) | Redirect to enter-code, not `/app` |
| redirects to /auth/enter-code?error=server on rpc_error (signup path) | Redirect to enter-code, not `/auth/verified` |
| redirects to /auth/enter-code?error=server on rpc_empty (OAuth path) | Redirect to enter-code on rpc_empty |
| preserves invite code in OAuth rpc_error redirect | `code=<original>` preserved |
| preserves invite code in signup rpc_error redirect | `code=<original>` preserved |

Already-green: cookie cleared even on rpc_error; no log for `invalid_or_mismatch`; happy path still redirects to `/app`.

### `src/app/auth/enter-code/__tests__/page.test.tsx`

| Test | Pins |
|---|---|
| shows a distinct server-error message when URL has ?error=server | Page reads `?error=server` and renders `t('serverErrorInviteCode')` |
| shows server-error message when the action returns reason=rpc_error | Form branches on `reason` from the server action |
| shows server-error message when the action returns reason=rpc_empty | Same, for `rpc_empty` |
| pre-populates the invite code input from ?code= query param | Input's initial value must be seeded from the URL |

Already-green: no error for clean URL; `invalid_or_mismatch` still shows invalid-code copy.

### `src/app/actions/__tests__/redeem-invite-rpc-error.test.ts`

All 9 tests already pass. Pin the action's contract (propagate `reason`, don't refreshSession on failure, pass through `source` on success) so the refactor can't regress it.

---

## Implementation, file by file

### 1. `src/data/profiles/actions/redeem-invite-by-code.ts`

Wrap the `.rpc()` call in `try/catch`:

```ts
try {
  const { data, error } = await supabase.rpc('redeem_invite', { invite_code: inviteCode })
  if (error) return { success: false, reason: 'rpc_error' }
  if (!data) return { success: false, reason: 'rpc_empty' }
  return data as { success: boolean; source?: string | null; reason?: string }
} catch {
  return { success: false, reason: 'rpc_error' }
}
```

Do not log here — logging is the caller's responsibility. Wrapper stays thin.

### 2. `src/app/auth/redeem/route.ts`

On failure, branch on `result.reason`:

- `invalid_or_mismatch` → redirect to `/auth/enter-code?error=invalid&code=<original>`, no log.
- anything else (`rpc_error`, `rpc_empty`, `profile_missing`, unknown) → `console.error('[auth/redeem] redemption failed', { reason: result.reason })` and redirect to `/auth/enter-code?error=server&code=<original>`.

Preserve the original `code` query param in both branches via `encodeURIComponent`.

### 3. `src/app/auth/callback/route.ts`

Capture the redeem result on both paths. On failure:

- OAuth path (`pending_invite_code` cookie present): clear the cookie as today, then redirect to `/auth/enter-code?error=server&code=<inviteCode>` instead of `/app`. Log with `console.error('[auth/callback:oauth] redemption failed', { reason })` for anything other than `invalid_or_mismatch`.
- Signup path (`user_metadata.invite_code`): redirect to `/auth/enter-code?error=server&code=<inviteCode>` instead of `/auth/verified`. Same logging rule.

Do not call `refreshSession()` on failure in either branch — there's no claim to refresh toward.

### 4. `src/app/auth/enter-code/page.tsx`

Read the URL on mount:

```ts
const searchParams = useSearchParams()
const urlError = searchParams.get('error')
const urlCode = searchParams.get('code') ?? ''
const [code, setCode] = useState(urlCode)
const [error, setError] = useState(urlError === 'server' ? t('serverErrorInviteCode') : '')
```

On form submit, branch on `reason`:

```ts
const result = await redeemInviteCode(code)
if (!result.success) {
  const reason = (result as { reason?: string }).reason
  const isServerError = reason === 'rpc_error' || reason === 'rpc_empty' || reason === 'profile_missing'
  setError(isServerError ? t('serverErrorInviteCode') : t('invalidInviteCode'))
  setLoading(false)
  return
}
```

Wrap the component body in a `<Suspense>` boundary because `useSearchParams` requires it (see `sign-in/page.tsx` for the existing pattern).

### 5. Translation keys

Add `serverErrorInviteCode` to all three locale files:

- `messages/en.json`: `"serverErrorInviteCode": "We couldn't redeem your code right now. Please try again in a moment."`
- `messages/pt-BR.json`: equivalent translation
- `messages/es.json`: equivalent translation

Copy must not blame the user and should suggest a retry (unlike `invalidInviteCode`, which tells the user to check their code).

---

## Explicitly out of scope

- **PostHog `invite_redemption_failed` event.** Production observability beyond `console.error` would be valuable, but is a separate product decision. The logging added here is sufficient to make regressions visible in server logs and Sentry/Vercel dashboards. Revisit when PostHog funnels are wired up for the signup flow per the `analytics` skill.
- **Alerting on rpc_error spikes.** Same story — depends on analytics infra.
- **Changing the RPC itself.** The RPC is correct. Do not modify `supabase/migrations/20260420154115_redeem_invite_rpc.sql` or add a follow-up migration.
- **Retry/backoff on rpc_error.** A manual retry (the user clicking "Continue" again) is sufficient. Automatic retry would risk double-writes.
- **Extending logging to include the `user.id` or `inviteCode`.** Sensitive — logs can end up in third-party pipelines. The reason alone is enough to dashboard the failure rate; correlating to a specific user/code should require a targeted investigation, not default log output.

---

## Verification

Before merging:

1. `pnpm vitest run` — the 18 RED tests listed above must all pass. Total unit count should be 731 passing / 0 failing (from the current 713 passing / 18 failing baseline).
2. `pnpm test:integration` — should still pass unchanged; integration coverage for the RPC is not affected by this plan.
3. Manual smoke test of all three redemption paths (form submit, `/auth/redeem?code=…` magic link, OAuth signup with `pending_invite_code` cookie). On each, force a server failure (e.g., by temporarily revoking `execute` on the RPC) and confirm the user lands at `/auth/enter-code?error=server&code=…` with the invite-code input pre-populated and the server-error copy visible.

---

## Files touched

| File | Change |
|---|---|
| `src/data/profiles/actions/redeem-invite-by-code.ts` | try/catch around `.rpc()` |
| `src/app/auth/redeem/route.ts` | branch on reason; log non-user failures; preserve code |
| `src/app/auth/callback/route.ts` | capture result on both paths; log; redirect to enter-code on failure; preserve code |
| `src/app/auth/enter-code/page.tsx` | read `?error=` and `?code=`; branch on action's `reason`; add Suspense boundary |
| `messages/en.json` | add `serverErrorInviteCode` |
| `messages/pt-BR.json` | add `serverErrorInviteCode` |
| `messages/es.json` | add `serverErrorInviteCode` |

No migrations. No new dependencies. No new components.

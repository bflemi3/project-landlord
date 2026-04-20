# Invite Redemption → JWT Cookie Sync — Implementation Plan

> Standalone bug-fix plan. Self-contained — no prior conversation context required.

**Goal:** Ensure a user's JWT cookies always reflect `app_metadata.has_redeemed_invite = true` immediately after redeeming an invite, regardless of sign-up path (email, Google OAuth, manual code entry). Today, the JWT cookie is not refreshed reliably after redemption, so the middleware redirects the user back to `/auth/enter-code` even though the redemption succeeded server-side. This produces an infinite loop: `/auth/enter-code` sees a profile with `has_redeemed_invite = true` and `router.replace('/app')`; middleware reads the stale JWT cookie on `/app`, redirects back to `/auth/enter-code`; repeat.

**Branch:** `brandon/fix-invite-redemption-jwt-sync` off `main`. Create a draft PR immediately per `.claude/rules/linear-github.md`. No Linear issue exists — use descriptive branch name without PRO- prefix.

**Do not touch:** DB triggers, `redeemInviteByCodeCore`, middleware. This plan only fixes callers that redeem invites for an already-authenticated user.

---

## Background

The app gates access behind `/auth/enter-code`. The gate is enforced in `src/lib/supabase/middleware.ts` — any authenticated user hitting `/app/*` without `app_metadata.has_redeemed_invite === true` on the JWT claims is redirected to `/auth/enter-code`.

Invite redemption updates `auth.users.raw_app_meta_data` (via a service-role client inside `redeemInviteByCodeCore`), which is correct. The problem is that the user's JWT cookie, set by Supabase SSR, doesn't automatically refresh when the DB row changes — the cookie holds the JWT that was minted *before* redemption.

For email sign-up the DB trigger `redeem_invite_code` runs during the `auth.users` INSERT (migration `supabase/migrations/20260415120600_fix_invite_redeem_claim_sync.sql`), so the very first JWT minted after sign-up already has the claim. No refresh needed — ✅ already works.

For every other redemption path the user is already authenticated when redemption happens, so their existing JWT cookie must be explicitly refreshed post-redemption. That's where the bugs live.

---

## Entry points to `/auth/enter-code`

Only one path redirects TO `/auth/enter-code`: the middleware check at `src/lib/supabase/middleware.ts:84-92`. So "fix the loop" = "make sure the JWT cookie has `has_redeemed_invite = true` before any `/app` navigation after redemption."

---

## Redemption paths and their current state

| # | Path | How redemption happens | Status |
|---|---|---|---|
| A | Email sign-up (code in `user_metadata`) | DB trigger `redeem_invite_code` fires on `auth.users` INSERT; sets `raw_app_meta_data.has_redeemed_invite = true` directly | ✅ Works |
| B | Google OAuth sign-up (code in `pending_invite_code` cookie) | `/auth/callback` route handler → `redeemInviteByCodeCore` → `refreshSession()` | ❌ Buggy |
| C | Already-authenticated user clicks email-invite link (`/auth/sign-up?code=XXX`) | `src/app/auth/sign-up/page.tsx` server component → `redeemInviteByCodeCore` → `redirect('/app')` | ❌ Buggy — no `refreshSession()` at all |
| D | User types/pastes code on `/auth/enter-code` | `redeemInviteCode` server action (`src/app/actions/redeem-invite.ts`) → `redeemInviteByCodeCore` → client `window.location.href = '/app'` | ❌ Buggy — no `refreshSession()` at all |

### Why B fails

`/auth/callback/route.ts` creates the SSR Supabase client via `@/lib/supabase/server`, which writes cookies via `next/headers.cookies()`. The handler calls `redeemInviteByCodeCore` then `supabase.auth.refreshSession()`. The refresh correctly obtains a new JWT and writes it via `setAll` to the `next/headers` cookie store.

But the handler then constructs a fresh `NextResponse.redirect(buildUrl(next))` and only manually sets `pending_invite_code=''` on it. The refreshed-session cookies written during `refreshSession()` don't reliably merge onto that new `NextResponse` object. The browser follows the redirect with the stale JWT → middleware sees no claim → `/auth/enter-code`.

### Why C fails

No `refreshSession()` call at all. `redeemInviteByCodeCore` updates the DB; `redirect('/app')` throws; middleware reads the same stale JWT cookie and bounces.

### Why D fails

No `refreshSession()` in the server action. Action returns `{ success: true }`; client does `window.location.href = '/app'`; the browser's cookies still hold the pre-redemption JWT.

---

## Fix plan (three files)

### File 1 — `src/app/auth/callback/route.ts` (path B)

Restructure to the response-bound cookie pattern used by `src/lib/supabase/middleware.ts`.

- Do **not** import `createClient` from `@/lib/supabase/server`. Instead, build an SSR client inline with `createServerClient` from `@supabase/ssr`.
- Maintain a mutable `response` variable initialised as `NextResponse.next({ request })`.
- The SSR client's `setAll` writes to **both** `request.cookies` (so subsequent reads inside the handler see the fresh cookies) **and** `response.cookies`.
- At each `return`, construct the final `NextResponse.redirect(url)` via a helper that copies `response.cookies.getAll()` onto the redirect response — same pattern as `redirectWithCookies` in middleware.ts.
- Drop the `await supabase.auth.refreshSession()` in the `type === 'signup' || type === 'email'` branch — it's redundant (DB trigger already set the claim for email sign-up) and was masking the real bug.
- Keep `await supabase.auth.refreshSession()` after `redeemInviteByCodeCore` in the OAuth cookie branch. It will now actually propagate to the returned redirect response.

Reference pattern, from `src/lib/supabase/middleware.ts` lines 13-19 and 22-42:

```ts
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirect
}

// ...

let supabaseResponse = NextResponse.next({ request })
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  },
)
```

Preserve all existing callback behaviour:
- OAuth avatar sync from `user_metadata.avatar_url` / `picture` into profile
- Reading `pending_invite_code` cookie and clearing it via `maxAge: 0` on the final redirect
- `type === 'recovery'` → `/auth/reset-password`
- `type === 'signup' || type === 'email'` with `invite_code` in `user_metadata` → `/auth/verified`
- Default → `next` (default `/app`)
- Error surfaces → `/auth/sign-in?error=...`
- `forwardedHost` handling for non-local env

### File 2 — `src/app/actions/redeem-invite.ts` (path D)

After `redeemInviteByCodeCore` returns `{ success: true }`, call `await supabase.auth.refreshSession()` on the same SSR client before returning. Server-action cookie mutations via `next/headers.cookies()` propagate back to the browser as Set-Cookie headers on the action response. By the time the client code runs `window.location.href = '/app'`, the browser's cookies already hold the refreshed JWT.

Current file is 14 lines — just add a refresh call after a successful redemption. Do nothing on `{ success: false }`.

### File 3 — `src/app/auth/sign-up/page.tsx` (path C)

In the authenticated-visit branch (around line 23-27):

```ts
if (user) {
  await redeemInviteByCodeCore(supabase, user.id, code)
  redirect('/app')
}
```

Add `await supabase.auth.refreshSession()` between the redeem and redirect calls. Server component `next/headers.cookies()` writes propagate on the redirect response.

Only take the refresh path when redemption actually succeeded — read the return value of `redeemInviteByCodeCore` (`{ success: boolean, source?: string | null }`) and skip the refresh if `success === false`. If it failed, the existing `validateAndFetchInviteContext` path below will render a `codeError` — but in the current code that path is unreachable for authenticated users because we `redirect('/app')` unconditionally. Preserve the unconditional redirect, but only refresh when success.

---

## Verification scenarios (manual QA)

Dev server: `pnpm dev` on port 3000. Local Supabase must be running (`npx supabase status` to confirm).

Before testing: create a pending invite code in the DB. Example SQL on local Supabase (port 54322, user `postgres`, password `postgres`, db `postgres`):

```sql
insert into invitations (invited_by, invited_email, role, status, code)
values (
  '<some-existing-profile-uuid>',
  '<test-email>',
  'landlord',
  'pending',
  'MABENN-TEST01'
);
```

Scenarios:
1. **OAuth sign-up with code.** Visit `/auth/sign-up?code=MABENN-TEST01`, click "Continue with Google", complete Google auth. **Expected:** land on `/app` directly. **Must not** bounce through `/auth/enter-code`.
2. **Email sign-up with code.** Visit `/auth/sign-up?code=MABENN-TEST01`, fill form, click sign up, click the email verification link. **Expected:** land on `/auth/verified` → click "Continue" → `/app`. No enter-code bounce.
3. **Authenticated user clicks email invite link.** Sign in as an existing authenticated user who hasn't redeemed any invite, then visit `/auth/sign-up?code=MABENN-TEST01` directly. **Expected:** immediate redirect to `/app`, no bounce.
4. **Manual enter-code submit.** Get into a state where the user is authenticated but `has_redeemed_invite = false` (e.g., by manually nulling `raw_app_meta_data` in the DB, then signing in). Land on `/auth/enter-code`, type a valid code, submit. **Expected:** land on `/app` directly.
5. **Invalid code on enter-code.** Type `INVALID-CODE` and submit. **Expected:** stay on `/auth/enter-code` with the error message shown. No loop, no blank page.

All five scenarios must pass before merging.

---

## Automated tests

Existing integration tests likely cover the redemption logic but not the cookie-refresh behaviour (hard to test without a browser). Review but don't expand:

- `src/data/profiles/actions/__tests__/redeem-invite-trigger.integration.test.ts`
- `src/app/actions/__tests__/invite-flows.integration.test.ts`
- `src/data/invitations/__tests__/accept-tenant-invite.integration.test.ts`

Run `pnpm test` and `pnpm test:integration` before opening the PR. No new tests required for this fix — cookie propagation is a framework concern that manual QA covers.

---

## Risk & blast radius

- **Auth is sensitive.** Every change is additive (add `refreshSession()`; restructure cookie writes) — no behaviour is being removed except the redundant email-path `refreshSession()` that was masking the bug.
- **Middleware untouched.** Gate logic unchanged.
- **`redeemInviteByCodeCore` untouched.** Shared core logic is identical — callers own the refresh responsibility.
- **DB trigger untouched.** Email sign-up path remains pre-trigger-mint semantics (JWT has claim at first mint).

If the fix regresses any redemption path, the symptom is the same infinite loop as before — a new PR can revert these three files in isolation.

---

## Workflow

1. `git checkout main && git pull`
2. `git checkout -b brandon/fix-invite-redemption-jwt-sync`
3. `git push -u origin brandon/fix-invite-redemption-jwt-sync`
4. `gh pr create --draft --title "Fix: invite redemption must refresh JWT cookies for OAuth and server-action paths" --body "..."` (draft PR moves Linear to "In Progress" — skip this step because no Linear issue exists)
5. Implement the three-file fix.
6. Run: `pnpm lint && pnpm format:check && pnpm test && pnpm build` (build to catch type errors).
7. Manual QA all five scenarios above.
8. Dispatch `superpowers:code-reviewer` on the diff.
9. Address review findings, if any.
10. Update `CHANGELOG.md` with a user-facing bullet under a new patch version (next after current `0.11.0`), and bump `version` in `package.json` (per `.claude/rules/versioning-releases.md`).
11. Push, mark PR ready for review, hand back to user for final review and merge approval.

## Definition of done

- [ ] Three files edited as specified
- [ ] `pnpm lint`, `pnpm test`, `pnpm build` all pass
- [ ] All five manual QA scenarios pass
- [ ] Code reviewer dispatched and findings addressed
- [ ] CHANGELOG + version bump included
- [ ] Draft PR ready for user review

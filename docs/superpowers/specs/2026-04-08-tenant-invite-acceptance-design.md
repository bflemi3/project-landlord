# Tenant Invite Acceptance Flow

## Summary

Allow tenants to accept an invite through the email they receive, sign up (or sign in), and land on the home page with a membership to their property/unit. This unblocks the landlord's onboarding checklist by completing the "tenant accepted" step.

## Approach

Unify tenant invites into the existing code-based invite flow. Generate a `MABENN-XXXX` code for tenant invites (same as landlord invites), include it in the email link, and reuse the existing sign-up validation and redemption infrastructure. Extend the `redeem_invite_code` DB trigger to create a tenant membership on redemption.

## Changes

### 1. Invite Creation (`inviteTenantCore`)

**File:** `src/app/actions/properties/invite-tenant.ts`

- Generate a `MABENN-XXXX` code using the existing `generateInviteCode()` pattern
- Set `expires_at` to 30 days from now (matching landlord invites)
- Store code in the invitation's `code` field

**Also fix:** `generateInviteCode()` in `src/app/actions/send-invite.ts` — change prefix from `MABEN` to `MABENN`.

### 2. Tenant Invite Email

**File:** `src/app/actions/properties/invite-tenant.ts` (`buildTenantInviteEmail`)

- CTA button links to `/auth/sign-up?code=MABENN-XXXX` instead of generic `/auth/sign-up`
- Add expiration date text (e.g., "This invite expires on April 30, 2026")
- Add fallback code display below CTA (e.g., "Or enter this code manually: MABENN-A9K2")
- Update all three locales (EN, PT-BR, ES) with new copy for expiration and manual code

### 3. Resend Invite

**File:** `src/app/actions/properties/resend-invite.ts`

- Generate a new code on resend
- Refresh `expires_at` to 30 days from now
- Send new email with the new code/link

### 4. Sign-up Page — Server Component Split

**Current:** `src/app/auth/sign-up/page.tsx` (single `'use client'` file)

**New structure:**
- `src/app/auth/sign-up/page.tsx` — server component that:
  - Reads `searchParams.code`
  - If code present: validates via `validateInviteCode`, fetches invitation context (invited email, property name)
  - If user already logged in with a valid code: redeems immediately, creates membership, redirects to `/app`
  - Passes props to client form
- `src/app/auth/sign-up/sign-up-form.tsx` — existing client component, receives:
  - `prevalidatedCode?: string` — skip step 1 if present
  - `invitedEmail?: string` — pre-fill email (editable)
  - `propertyName?: string` — display context
  - `codeError?: 'invalid' | 'expired'` — show error instead of form

**Behavior with `?code=`:**
- Valid code → render form at step 2 with email pre-filled (editable)
- Invalid/expired → show error message with suggestion to ask landlord to resend
- Already logged in → redeem + redirect to `/app`

**Behavior without `?code=`:** unchanged (step 1: enter code manually)

### 5. Sign-in Page — Code Passthrough

**File:** `src/app/auth/sign-in/page.tsx`

- Read `?code=` from URL
- Store in `pending_invite_code` cookie before auth (same pattern as Google OAuth on sign-up)
- Auth callback already reads this cookie and redeems

**Sign-up form update:** "Already have an account?" link preserves the code: `/auth/sign-in?code=XXXX`

### 6. Membership Creation on Redemption (DB Trigger)

**New migration:** Extend `redeem_invite_code` trigger function.

When the redeemed invitation has `role = 'tenant'` and `property_id` + `unit_id` are set:
- Insert a membership with `role = 'tenant'`, scoped to the property and unit
- Use `ON CONFLICT (user_id, property_id, unit_id) DO NOTHING` for idempotency

This handles both email sign-up (trigger fires on profile creation) and Google OAuth (callback calls `redeemInviteByCodeCore`).

**Also update:** `redeemInviteByCodeCore` in `src/app/actions/redeem-invite-by-code.ts` to create the membership for tenant codes, matching the trigger behavior.

### 7. Onboarding Checklist

No changes. The checklist already tracks `tenantsAccepted = activeTenants > 0` by counting memberships. Once the trigger creates the membership, the checklist reflects it automatically.

## What We're Not Building

- Tenant-specific welcome page (separate story)
- Tenant dashboard/home page (separate story)
- Role-based home page branching (separate story)

## Testing

### Integration Tests (new)

- Tenant invite creation generates a code and sets `expires_at`
- Sign-up with tenant invite code creates a membership via trigger
- Resend invite generates a new code and refreshes `expires_at`
- Cancelled invite code fails validation
- Two tenants invited to the same unit each get their own membership
- Trigger membership creation is idempotent (no error if membership already exists)
- Google OAuth cookie flow redeems tenant code and creates membership
- Existing authenticated user clicking invite link redeems and redirects
- Existing user signing in with `?code=` redeems via callback

### Integration Tests (update)

- `acceptTenantInvite` tests — account for code field now being populated on tenant invites

### Unit Tests

- Sign-up server component passes correct props for valid/invalid/expired/missing codes
- Sign-up server component detects logged-in user and redirects
- Invite email includes expiration date and manual code text
- Sign-in page stores code in cookie when `?code=` present

### Existing Tests

- Run full suite to verify no regressions

## Key Files

| File | Change |
|------|--------|
| `src/app/actions/properties/invite-tenant.ts` | Add code generation, `expires_at`, update email template |
| `src/app/actions/send-invite.ts` | Fix prefix `MABEN` → `MABENN` |
| `src/app/actions/properties/resend-invite.ts` | New code + refresh expiry |
| `src/app/auth/sign-up/page.tsx` | Convert to server component wrapper |
| `src/app/auth/sign-up/sign-up-form.tsx` | New client component (extracted from current page) |
| `src/app/auth/sign-in/page.tsx` | Read `?code=`, store in cookie |
| `src/app/actions/redeem-invite-by-code.ts` | Add membership creation for tenant codes |
| `supabase/migrations/` | Extend `redeem_invite_code` trigger for membership creation |
| `messages/en.json`, `messages/pt-BR.json`, `messages/es.json` | Expiration and manual code copy |

## Analytics

- `signed_up` event already captures `invite_code` — no changes needed
- PostHog identifies by Supabase user ID, not email — allowing email changes is safe
- Consider adding `invited_email` as a property on `signed_up` event when it differs from signup email (nice-to-have)

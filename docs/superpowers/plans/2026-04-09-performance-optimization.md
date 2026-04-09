# Performance Optimization Implementation Plan

> **For agentic workers:** This plan is designed for execution by an **agent team**. Each phase contains independent tasks that can be parallelized across team members. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all navigation near-instant by stripping the blocking app layout, streaming server components, centralizing the data layer with `'use cache'`, lazy-loading Framer Motion, and adding loading states everywhere.

**Architecture:** Static app layout shell + middleware auth/invite gate + streaming server components per page section + domain-organized data layer (`src/data/`) with shared fetch functions, `'use cache'` server wrappers, and React Query client hooks via factory. Framer Motion dynamically imported with top-level preload.

**Tech Stack:** Next.js 16, React 19, Supabase, React Query, Tailwind CSS, `'use cache'` + `cacheLife`, `cacheComponents`, CSS keyframe animations

**Spec:** `docs/superpowers/specs/2026-04-09-performance-optimization-design.md`

---

## Phase 1: Foundation (no dependencies — all tasks parallelizable)

These tasks have zero dependencies on each other and can all run simultaneously.

---

### Task 1.1: CSS Animation Keyframes + FadeIn Refactor

**Model:** Sonnet
**Spec sections:** 6 (CSS Replacements)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/fade-in.tsx`

- [ ] **Step 1: Add CSS keyframes to globals.css**

Add after the existing `section-flash` keyframe block in `src/app/globals.css`:

```css
/* Streaming component fade-in */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out both;
}

/* Staggered fade-up for grouped entrance animations */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  animation: fade-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both;
}
```

- [ ] **Step 2: Refactor FadeIn to CSS server component**

Replace `src/components/fade-in.tsx` entirely:

```tsx
import { cn } from '@/lib/utils'

export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
```

Remove the `'use client'` directive and the `motion/react` import. This is now a server component with zero JS.

- [ ] **Step 3: Verify FadeIn still works on all pages that use it**

Run: `pnpm dev`

Visit each page that uses `<FadeIn>`: home (`/app`), property detail (`/app/p/<id>`), statement draft, property creation. Confirm the fade-in animation looks identical — same duration (0.5s), same easing (ease-out). No visual regression.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/fade-in.tsx
git commit -m "refactor: replace Framer Motion FadeIn with CSS server component"
```

---

### Task 1.2: FadeUp + FadeUpGroup CSS Refactor

**Model:** Sonnet
**Spec sections:** 6 (CSS Replacements)

**Files:**
- Modify: `src/components/fade-up.tsx`
- Create: `src/components/fade-up-group.tsx`
- Modify: `src/app/app/(focused)/p/new/steps/setup-complete.tsx` (update imports)

- [ ] **Step 1: Replace fade-up.tsx with CSS server component**

Replace `src/components/fade-up.tsx` entirely:

```tsx
import { cn } from '@/lib/utils'

interface FadeUpProps {
  children: React.ReactNode
  delay?: number
  index?: number
  className?: string
}

export function FadeUp({ children, delay, index, className }: FadeUpProps) {
  const resolvedDelay = delay ?? 0
  return (
    <div
      className={cn('animate-fade-up', className)}
      style={{
        animationDelay: index !== undefined
          ? `calc(var(--base-delay, 0s) + ${index} * var(--stagger, 0.08s))`
          : `${resolvedDelay}s`,
      }}
    >
      {children}
    </div>
  )
}
```

No `'use client'`, no `motion/react`, no React context. Server component.

- [ ] **Step 2: Create FadeUpGroup client component**

Create `src/components/fade-up-group.tsx`:

```tsx
'use client'

import { Children, cloneElement, isValidElement } from 'react'
import { FadeUp } from './fade-up'

export function FadeUpGroup({
  children,
  baseDelay = 0,
  stagger = 0.08,
  className,
}: {
  children: React.ReactNode
  baseDelay?: number
  stagger?: number
  className?: string
}) {
  let index = 0
  const indexed = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === FadeUp) {
      return cloneElement(child, { index: index++ } as Record<string, unknown>)
    }
    return child
  })

  return (
    <div
      className={className}
      style={{
        '--base-delay': `${baseDelay}s`,
        '--stagger': `${stagger}s`,
      } as React.CSSProperties}
    >
      {indexed}
    </div>
  )
}
```

- [ ] **Step 3: Update setup-complete.tsx imports**

In `src/app/app/(focused)/p/new/steps/setup-complete.tsx`, change:

```tsx
// OLD
import { FadeUp } from '@/components/fade-up'

// Use as: <FadeUp.Group stagger={0.1}>
```

to:

```tsx
// NEW
import { FadeUp } from '@/components/fade-up'
import { FadeUpGroup } from '@/components/fade-up-group'

// Use as: <FadeUpGroup stagger={0.1}>
```

Replace all `<FadeUp.Group` with `<FadeUpGroup` and `</FadeUp.Group>` with `</FadeUpGroup>` in the file.

- [ ] **Step 4: Verify setup-complete page**

Run: `pnpm dev`

Navigate to `/app/p/new`, complete the wizard to step 4 (setup complete). Confirm the staggered fade-up animation on the completion screen looks identical — same stagger timing, same translateY distance, same easing curve.

- [ ] **Step 5: Commit**

```bash
git add src/components/fade-up.tsx src/components/fade-up-group.tsx src/app/app/(focused)/p/new/steps/setup-complete.tsx
git commit -m "refactor: replace Framer Motion FadeUp with CSS server components"
```

---

### Task 1.3: Landing Page — Replace Framer Motion with CSS FadeUp

**Model:** Opus 4.6 — animation timing must match exactly, no visual regression allowed
**Spec sections:** 6 (Landing page)

**Files:**
- Modify: `src/app/(public)/landing.tsx`

- [ ] **Step 1: Read the current landing.tsx to understand the exact animation values**

Read `src/app/(public)/landing.tsx` fully. Note the `fadeUp` variants object:
- `hidden: { opacity: 0, transform: 'translateY(12px)' }`
- `visible: (delay) => ({ opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] } })`
- Three elements with custom delays: 0.1, 0.2, 0.35

Note: the landing page uses `translateY(12px)` not `translateY(16px)`. The CSS `animate-fade-up` uses `16px`. We need to match the landing page exactly, so use the `delay` prop on `FadeUp` with explicit values rather than the group auto-index.

- [ ] **Step 2: Replace motion imports and usage**

In `src/app/(public)/landing.tsx`:

Remove:
```tsx
import { motion } from 'motion/react'
```
and the `fadeUp` variants object.

Add:
```tsx
import { FadeUp } from '@/components/fade-up'
```

Replace the hero section's `motion.h1`, `motion.p`, `motion.div` with `FadeUp` using explicit delays:

```tsx
<FadeUp delay={0.1}>
  <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
    {t('heroTitle')}
  </h1>
</FadeUp>
<FadeUp delay={0.2}>
  <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-xl">
    {t('heroSubtitle')}
  </p>
</FadeUp>
<FadeUp delay={0.35}>
  <div className="mt-10">
    <WaitlistForm />
    <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {t('heroNote')}
    </p>
  </div>
</FadeUp>
```

**CRITICAL:** The landing page's `fadeUp` uses `translateY(12px)` not `16px`. Since the CSS class uses `16px`, the `FadeUp` component's CSS may need a `--translate-y` custom property, OR we accept the 4px difference as imperceptible. Visually verify this is acceptable — if not, add a CSS custom property override via `style` on the FadeUp elements.

- [ ] **Step 3: Remove 'use client' if no other client-side code remains**

Check if `landing.tsx` still needs `'use client'` after removing `motion`. If `WaitlistForm` and `WaitlistProvider` are imported as components (not hooks used directly), the landing page may be convertible to a server component. If `useTranslations` is used directly, it stays client.

- [ ] **Step 4: Visual verification — CRITICAL no regression**

Run: `pnpm dev`

Visit the landing page (`/`). Compare the hero entrance animation side-by-side with the current version:
- Same staggered timing (h1 at 0.1s, subtitle at 0.2s, CTA at 0.35s)
- Same translateY distance (visually indistinguishable)
- Same easing curve
- Same duration (0.5s)

**This must look identical.** If there is any visible difference, adjust the CSS or use inline styles to match exactly.

- [ ] **Step 5: Commit**

```bash
git add src/app/(public)/landing.tsx
git commit -m "refactor: replace Framer Motion on landing page with CSS FadeUp"
```

---

### Task 1.4: Add Missing loading.tsx Files

**Model:** Sonnet
**Spec sections:** 2

**Files:**
- Create: `src/app/app/(main)/loading.tsx`
- Create: `src/app/app/(focused)/p/new/loading.tsx`

- [ ] **Step 1: Create home page loading state**

Create `src/app/app/(main)/loading.tsx`:

```tsx
import { PageLoader } from '@/components/page-loader'

export default function Loading() {
  return <PageLoader />
}
```

- [ ] **Step 2: Create property creation loading state**

Create `src/app/app/(focused)/p/new/loading.tsx`:

```tsx
import { PageLoader } from '@/components/page-loader'

export default function Loading() {
  return <PageLoader />
}
```

- [ ] **Step 3: Verify loading states appear during navigation**

Run: `pnpm build && pnpm start` (loading.tsx prefetching only works in production mode)

Navigate between pages and confirm the PageLoader spinner appears briefly during transitions to the home page and property creation page.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/(main)/loading.tsx src/app/app/(focused)/p/new/loading.tsx
git commit -m "feat: add loading.tsx to home and property creation routes"
```

---

### Task 1.5: Enable cacheComponents in next.config.ts

**Model:** Sonnet
**Spec sections:** 12

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add cacheComponents to next config**

In `next.config.ts`, add `cacheComponents: true` to the `nextConfig` object:

```tsx
const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_RELEASE_NOTES: releaseNotes,
  },
  // ... rest of config
}
```

- [ ] **Step 2: Verify app builds and runs**

Run: `pnpm build`

Confirm no build errors. Run `pnpm dev` and verify the app works normally.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "perf: enable cacheComponents for server component caching"
```

---

### Task 1.6: Middleware Invite-Code Gate via JWT Custom Claim

**Model:** Opus 4.6 — security-critical auth logic + DB migration + middleware modification
**Spec sections:** 8

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_sync_invite_redeemed_claim.sql`
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/<timestamp>_sync_invite_redeemed_claim.sql`. Check existing migrations for the latest timestamp and use a later one:

```sql
-- Sync has_redeemed_invite to JWT custom claims via raw_app_meta_data.
-- This allows middleware to check invite status without a DB query.

-- Function: sync the claim whenever has_redeemed_invite changes
CREATE OR REPLACE FUNCTION public.sync_invite_redeemed_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('has_redeemed_invite', NEW.has_redeemed_invite)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger: fire on INSERT or UPDATE of has_redeemed_invite
DROP TRIGGER IF EXISTS on_profile_invite_redeemed ON public.profiles;
CREATE TRIGGER on_profile_invite_redeemed
  AFTER INSERT OR UPDATE OF has_redeemed_invite ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invite_redeemed_claim();

-- Backfill: sync existing profiles so current users get the claim on next token refresh
UPDATE public.profiles SET has_redeemed_invite = has_redeemed_invite WHERE true;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase migration up`

Verify no errors.

- [ ] **Step 3: Add invite check to middleware**

In `src/lib/supabase/middleware.ts`, after the existing auth redirect logic (line 54), add the invite gate:

```tsx
// Authenticated users on /app who haven't redeemed invite → redirect to enter-code
if (user && pathname.startsWith('/app')) {
  const appMetadata = (user as Record<string, unknown>).app_metadata as Record<string, unknown> | undefined
  const hasRedeemedInvite = appMetadata?.has_redeemed_invite === true
  if (!hasRedeemedInvite) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/enter-code'
    return redirectWithCookies(url, supabaseResponse)
  }
}
```

This must go AFTER the unauthenticated redirect check and BEFORE the authenticated-on-auth redirect check.

- [ ] **Step 4: Verify middleware redirects work**

Run: `pnpm dev`

Test:
1. Sign in with a user who has redeemed invite → should reach `/app` normally
2. If possible, test with a user who hasn't redeemed → should redirect to `/auth/enter-code`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*sync_invite_redeemed_claim.sql src/lib/supabase/middleware.ts
git commit -m "feat: move invite-code gate to middleware via JWT custom claim"
```

---

### Task 1.7: AnimatedSplitSection Component

**Model:** Sonnet
**Spec sections:** 6 (Dynamic Import with Preload)

**Files:**
- Create: `src/components/animated-split-section.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/animated-split-section.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'

export function AnimatedSplitSection({
  show,
  children,
}: {
  show: boolean
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

Read the existing expand/collapse animation in `charge-config-sheet.tsx` (around lines 204-225) to match the exact transition values (duration, easing). Adjust the above if they differ.

- [ ] **Step 2: Commit**

```bash
git add src/components/animated-split-section.tsx
git commit -m "feat: extract AnimatedSplitSection for lazy Framer Motion loading"
```

---

### Task 1.8: Convert Property Creation Page to Server Component

**Model:** Sonnet
**Spec sections:** 11

**Files:**
- Modify: `src/app/app/(focused)/p/new/page.tsx`

- [ ] **Step 1: Read the current page**

Read `src/app/app/(focused)/p/new/page.tsx` to confirm it's just wrapping `<CreatePropertyFlow>` in `<FadeIn>`.

- [ ] **Step 2: Convert to server component**

Replace `src/app/app/(focused)/p/new/page.tsx`:

```tsx
import { CreatePropertyFlow } from './create-property-flow'

export default function NewPropertyPage() {
  return <CreatePropertyFlow />
}
```

Remove `'use client'` and the `<FadeIn>` wrapper. The wizard has its own UI — no page-level fade needed.

- [ ] **Step 3: Verify the wizard still works**

Run: `pnpm dev`

Navigate to `/app/p/new`. Walk through all 4 steps of the property creation wizard. Confirm everything works — form validation, step transitions, submission.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/(focused)/p/new/page.tsx
git commit -m "refactor: convert property creation page to server component"
```

---

## Phase 2: Framer Motion Dynamic Imports

Depends on: Task 1.7 (AnimatedSplitSection component exists)

---

### Task 2.1: Dynamic Import Framer Motion in charge-config-sheet.tsx

**Model:** Sonnet
**Spec sections:** 6 (charge-config-sheet)

**Files:**
- Modify: `src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx` fully. Identify exactly where `motion` and `AnimatePresence` are used (the expand/collapse for the split configuration section).

- [ ] **Step 2: Replace direct Framer Motion imports with lazy AnimatedSplitSection**

Remove:
```tsx
import { motion, AnimatePresence } from 'motion/react'
```

Add at the top of the file (before the component):
```tsx
import { lazy, Suspense } from 'react'

const animatedSplitPromise = import('@/components/animated-split-section')
const AnimatedSplitSection = lazy(() =>
  animatedSplitPromise.then(m => ({ default: m.AnimatedSplitSection }))
)
```

Replace the `<AnimatePresence>` / `<motion.div>` block that wraps the split configuration UI with:

```tsx
<Suspense fallback={payer === 'split' ? <div>{/* split config content */}</div> : null}>
  <AnimatedSplitSection show={payer === 'split'}>
    {/* existing split config content */}
  </AnimatedSplitSection>
</Suspense>
```

Match the exact `show` condition to whatever currently controls the `AnimatePresence` visibility.

- [ ] **Step 3: Verify the split config animation works**

Run: `pnpm dev`

Navigate to property creation → step 3 (charges) → open charge config sheet → select "Split" payer. Confirm the split configuration section expands/collapses with animation. Verify it's identical to the current behavior.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/(focused)/p/new/steps/charge-config-sheet.tsx
git commit -m "perf: lazy-load Framer Motion in charge-config-sheet"
```

---

### Task 2.2: Dynamic Import Framer Motion in add-charge-sheet.tsx

**Model:** Sonnet
**Spec sections:** 6 (add-charge-sheet)

**Files:**
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx` fully. Identify where `motion` and `AnimatePresence` are used.

- [ ] **Step 2: Replace direct Framer Motion imports with lazy AnimatedSplitSection**

Same pattern as Task 2.1. Remove direct `motion/react` imports, add lazy import of `AnimatedSplitSection` with top-level preload, replace the AnimatePresence block.

- [ ] **Step 3: Verify the animation works on statement draft page**

Navigate to a statement draft → click a charge or add charge → confirm split expand/collapse animation works identically.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/(focused)/p/[id]/s/[statementId]/add-charge-sheet.tsx
git commit -m "perf: lazy-load Framer Motion in add-charge-sheet"
```

---

### Task 2.3: Dynamic Import SlideIn in Property Wizard

**Model:** Sonnet
**Spec sections:** 6 (create-property-flow)

**Files:**
- Modify: `src/app/app/(focused)/p/new/create-property-flow.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/app/(focused)/p/new/create-property-flow.tsx`. Confirm `SlideIn` is imported at top and used only for steps 2-4 (line 193).

- [ ] **Step 2: Replace static import with lazy + top-level preload**

Remove:
```tsx
import { SlideIn } from '@/components/slide-in'
```

Add:
```tsx
import { lazy, Suspense } from 'react'

const slideInPromise = import('@/components/slide-in')
const SlideIn = lazy(() =>
  slideInPromise.then(m => ({ default: m.SlideIn }))
)
```

Wrap the `<SlideIn>` usage (around line 193) in `<Suspense>`:

```tsx
<Suspense fallback={null}>
  <SlideIn activeKey={step} className="flex flex-1 flex-col">
    {/* ... existing step content ... */}
  </SlideIn>
</Suspense>
```

The `fallback={null}` is fine because Framer Motion is preloaded on module parse — by step 2, the chunk is already resolved.

- [ ] **Step 3: Verify step transitions work**

Run: `pnpm dev`

Navigate to `/app/p/new`. Walk through all steps. Confirm:
- Step 1 renders without delay
- Step 1→2 transition slides correctly
- Step 2→3 and 3→4 transitions work
- Back button transitions work

- [ ] **Step 4: Commit**

```bash
git add src/app/app/(focused)/p/new/create-property-flow.tsx
git commit -m "perf: lazy-load SlideIn with top-level preload in property wizard"
```

---

### Task 2.4: Dynamic Import Framer Motion in Sign-Up Form

**Model:** Opus 4.6 — complex AnimatePresence step transition, needs careful extraction to preserve exact behavior
**Spec sections:** 6 (sign-up-form)

**Files:**
- Modify: `src/app/auth/sign-up/sign-up-form.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/auth/sign-up/sign-up-form.tsx`. Identify the `AnimatePresence` usage for the invite-code → sign-up form step transition.

- [ ] **Step 2: Extract step transition into a lazy-loaded component**

Create a small wrapper component in a separate file or inline. The key change: replace direct `import { AnimatePresence, motion } from 'motion/react'` with a top-level preload + lazy pattern.

Since the step transition is more complex than the split section (it uses `mode="wait"`, `exit` animations on both steps), extract it as:

```tsx
// At top of sign-up-form.tsx
const motionPromise = import('motion/react')
```

Then use `motionPromise` to lazily access `AnimatePresence` and `motion.div`. The exact implementation depends on the current usage — read the file first, then implement the minimal change that lazy-loads the import while preserving identical behavior.

- [ ] **Step 3: Verify sign-up flow**

Run: `pnpm dev`

Navigate to `/auth/sign-up`. Enter an invite code. Confirm the transition from code input to sign-up form animates identically — same slide direction, timing, easing.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/sign-up/sign-up-form.tsx
git commit -m "perf: lazy-load Framer Motion in sign-up form with top-level preload"
```

---

## Phase 3: Data Layer Centralization

No dependencies on Phases 1-2 (can run in parallel). This is the largest phase.

---

### Task 3.1: Create Data Layer Scaffolding + Hook Factory

**Model:** Opus 4.6 — foundational abstraction that all other data tasks depend on, must get types right
**Spec sections:** 9

**Files:**
- Create: `src/data/shared/create-hook.ts`
- Create: `src/data/shared/supabase.ts`

- [ ] **Step 1: Create the hook factory**

Create `src/data/shared/create-hook.ts`:

```tsx
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

export function createSuspenseHook<TData, TArgs extends unknown[]>(
  keyFn: (...args: TArgs) => readonly unknown[],
  fetchFn: (supabase: TypedSupabaseClient, ...args: TArgs) => Promise<TData>,
) {
  return (...args: TArgs) => {
    return useSuspenseQuery({
      queryKey: keyFn(...args),
      queryFn: () => fetchFn(createClient(), ...args),
    })
  }
}
```

- [ ] **Step 2: Create supabase re-exports**

Create `src/data/shared/supabase.ts`:

```tsx
export { createClient as createServerClient } from '@/lib/supabase/server'
export { createClient as createBrowserClient } from '@/lib/supabase/client'
export type { TypedSupabaseClient } from '@/lib/supabase/types'
```

- [ ] **Step 3: Commit**

```bash
git add src/data/shared/
git commit -m "feat: add data layer scaffolding with hook factory"
```

---

### Task 3.2: Migrate Home Domain

**Model:** Opus 4.6 — first domain migration, establishes the pattern all others follow
**Spec sections:** 9

**Files:**
- Create: `src/data/home/shared.ts`
- Create: `src/data/home/server.ts`
- Create: `src/data/home/client.ts`
- Create: `src/data/home/__tests__/shared.test.ts`
- Delete (after migration): `src/lib/queries/home-properties.ts`, `src/lib/queries/home-actions.ts`, `src/lib/hooks/use-home-properties.ts`, `src/lib/hooks/use-home-actions.ts`

- [ ] **Step 1: Create shared.ts**

Create `src/data/home/shared.ts` by combining the contents of `src/lib/queries/home-properties.ts` and `src/lib/queries/home-actions.ts`:

```tsx
import type { TypedSupabaseClient } from '@/lib/supabase/types'

// --- Home Properties ---

export interface HomeProperty {
  propertyId: string
  name: string
  city: string | null
  state: string | null
  role: 'landlord' | 'tenant'
  unitCount: number
  tenantCount: number
  chargeCount: number
  pendingInviteCount: number
}

export async function fetchHomeProperties(supabase: TypedSupabaseClient): Promise<HomeProperty[]> {
  const { data, error } = await supabase
    .from('home_properties')
    .select('property_id, name, city, state, role, unit_count, tenant_count, charge_count, pending_invite_count')

  if (error || !data) return []

  return data.map((row) => ({
    propertyId: row.property_id!,
    name: row.name!,
    city: row.city,
    state: row.state,
    role: row.role as 'landlord' | 'tenant',
    unitCount: row.unit_count ?? 0,
    tenantCount: row.tenant_count ?? 0,
    chargeCount: row.charge_count ?? 0,
    pendingInviteCount: row.pending_invite_count ?? 0,
  }))
}

export const homePropertiesQueryKey = () => ['home-properties'] as const

// --- Home Actions ---

export interface HomeAction {
  actionType: 'invite_tenants' | 'configure_charges' | 'pending_invite' | 'generate_statement'
  propertyId: string
  propertyName: string
  detailId: string | null
  detailName: string | null
  detailEmail: string | null
  detailDate: string | null
}

export async function fetchHomeActions(supabase: TypedSupabaseClient): Promise<HomeAction[]> {
  const { data, error } = await supabase
    .from('home_action_items')
    .select('action_type, property_id, property_name, detail_id, detail_name, detail_email, detail_date')

  if (error || !data) return []

  return data.map((row) => ({
    actionType: row.action_type as HomeAction['actionType'],
    propertyId: row.property_id ?? '',
    propertyName: row.property_name ?? '',
    detailId: (row as Record<string, unknown>).detail_id as string | null,
    detailName: row.detail_name,
    detailEmail: row.detail_email,
    detailDate: row.detail_date,
  }))
}

export const homeActionsQueryKey = () => ['home-actions'] as const
```

- [ ] **Step 2: Create server.ts**

Create `src/data/home/server.ts`:

```tsx
import { cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchHomeProperties, fetchHomeActions } from './shared'
import type { HomeProperty, HomeAction } from './shared'

export async function getHomeProperties(): Promise<HomeProperty[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchHomeProperties(supabase)
}

export async function getHomeActions(): Promise<HomeAction[]> {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchHomeActions(supabase)
}
```

- [ ] **Step 3: Create client.ts**

Create `src/data/home/client.ts`:

```tsx
'use client'

import { createSuspenseHook } from '../shared/create-hook'
import {
  fetchHomeProperties, homePropertiesQueryKey,
  fetchHomeActions, homeActionsQueryKey,
  type HomeProperty, type HomeAction,
} from './shared'

export const useHomeProperties = createSuspenseHook<HomeProperty[], []>(
  homePropertiesQueryKey,
  fetchHomeProperties,
)

export const useHomeActions = createSuspenseHook<HomeAction[], []>(
  homeActionsQueryKey,
  fetchHomeActions,
)

export type { HomeProperty, HomeAction } from './shared'
```

- [ ] **Step 4: Update all import paths across the codebase**

Search for all imports from the old paths and update them:

- `@/lib/queries/home-properties` → `@/data/home/shared` (for types/query keys) or `@/data/home/client` (for hooks)
- `@/lib/queries/home-actions` → `@/data/home/shared` or `@/data/home/client`
- `@/lib/hooks/use-home-properties` → `@/data/home/client`
- `@/lib/hooks/use-home-actions` → `@/data/home/client`

Files that import these include: `src/app/app/(main)/page.tsx`, `src/app/app/(main)/home-content.tsx`, `src/app/app/(main)/p/[id]/sections/billing-summary-card.tsx`, and possibly others.

- [ ] **Step 5: Delete old files**

Delete:
- `src/lib/queries/home-properties.ts`
- `src/lib/queries/home-actions.ts`
- `src/lib/hooks/use-home-properties.ts`
- `src/lib/hooks/use-home-actions.ts`

- [ ] **Step 6: Write unit tests for shared.ts**

Create `src/data/home/__tests__/shared.test.ts` — mock the Supabase client, verify `fetchHomeProperties` and `fetchHomeActions` return correctly shaped data, handle errors gracefully.

- [ ] **Step 7: Run all tests**

Run: `pnpm test`

Confirm all existing tests pass with updated import paths. Confirm new unit tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/data/home/ && git add -u
git commit -m "refactor: migrate home queries and hooks to src/data/home"
```

---

### Task 3.3: Migrate Properties Domain

**Model:** Sonnet — follows established pattern from Task 3.2
**Spec sections:** 9

Same pattern as Task 3.2 but for the properties domain.

**Files:**
- Create: `src/data/properties/shared.ts` (from `src/lib/queries/property.ts`)
- Create: `src/data/properties/server.ts`
- Create: `src/data/properties/client.ts`
- Create: `src/data/properties/__tests__/shared.test.ts`
- Move: `src/app/actions/properties/*.ts` → `src/data/properties/actions/`
- Move: `src/app/actions/properties/__tests__/` → `src/data/properties/actions/__tests__/`
- Delete old query/hook files after migration

- [ ] **Step 1: Create shared.ts from existing property.ts**
- [ ] **Step 2: Create server.ts with 'use cache' wrapper**
- [ ] **Step 3: Create client.ts with hook factory**
- [ ] **Step 4: Move action files to src/data/properties/actions/**
- [ ] **Step 5: Move action tests to src/data/properties/actions/__tests__/**
- [ ] **Step 6: Update all import paths across the codebase**
- [ ] **Step 7: Delete old files**
- [ ] **Step 8: Write unit tests for shared.ts**
- [ ] **Step 9: Run all tests — confirm all pass**
- [ ] **Step 10: Commit**

```bash
git add src/data/properties/ && git add -u
git commit -m "refactor: migrate properties queries, hooks, and actions to src/data/properties"
```

---

### Task 3.4: Migrate Units Domain

**Model:** Sonnet — follows established pattern, most files but mechanical
**Spec sections:** 9

Same pattern. The units domain has the most query files: `fetchUnit`, `fetchUnitCharges`, `fetchUnitTenants`, `fetchUnitInvites`, `fetchUnitStatements`.

**Files:**
- Create: `src/data/units/shared.ts` (combine from `unit.ts`, `unit-charges.ts`, `unit-tenants.ts`, `unit-invites.ts`, `unit-statements.ts`)
- Create: `src/data/units/server.ts`
- Create: `src/data/units/client.ts`
- Create: `src/data/units/__tests__/shared.test.ts`
- Move: unit-related actions (`add-unit.ts`, `create-charges.ts`, `update-charge.ts`, `remove-charge.ts`, `toggle-charge-active.ts`) to `src/data/units/actions/`
- Delete old files after migration

- [ ] **Step 1-10: Follow same pattern as Task 3.3**
- [ ] **Step 11: Commit**

```bash
git add src/data/units/ && git add -u
git commit -m "refactor: migrate units queries, hooks, and actions to src/data/units"
```

---

### Task 3.5: Migrate Statements Domain

**Model:** Sonnet — follows established pattern
**Spec sections:** 9

**Files:**
- Create: `src/data/statements/shared.ts` (combine from `statement.ts`, `statement-charges.ts`, `missing-charges.ts`)
- Create: `src/data/statements/server.ts`
- Create: `src/data/statements/client.ts`
- Create: `src/data/statements/__tests__/shared.test.ts`
- Move: statement actions + their tests to `src/data/statements/actions/`
- Delete old files

- [ ] **Step 1-10: Follow same pattern as Task 3.3**
- [ ] **Step 11: Commit**

```bash
git add src/data/statements/ && git add -u
git commit -m "refactor: migrate statements queries, hooks, and actions to src/data/statements"
```

---

### Task 3.6: Migrate Profiles Domain

**Model:** Opus 4.6 — inline fetch logic needs extraction, profile is used by PostHogIdentify + AppBar + greeting
**Spec sections:** 9

**Files:**
- Create: `src/data/profiles/shared.ts` (from `use-profile.ts` fetch logic)
- Create: `src/data/profiles/server.ts`
- Create: `src/data/profiles/client.ts`
- Create: `src/data/profiles/__tests__/shared.test.ts`
- Move: `redeem-invite-by-code.ts` to `src/data/profiles/actions/`
- Delete old `use-profile.ts`

Note: `use-profile.ts` currently has an inline fetch function (not in `src/lib/queries/`). Extract the fetch logic into `shared.ts`.

- [ ] **Step 1-9: Follow same pattern**
- [ ] **Step 10: Commit**

```bash
git add src/data/profiles/ && git add -u
git commit -m "refactor: migrate profiles query, hook, and actions to src/data/profiles"
```

---

### Task 3.7: Migrate Invitations Domain + Storage Domain

**Model:** Sonnet — follows established pattern
**Spec sections:** 9

**Files:**
- Create: `src/data/invitations/shared.ts`
- Create: `src/data/invitations/__tests__/shared.test.ts`
- Move: invitation actions + tests
- Create: `src/data/storage/actions/` + move storage actions + tests

- [ ] **Step 1-8: Migrate invitations following same pattern**
- [ ] **Step 9: Move storage actions**

Move `src/app/actions/storage/delete-storage-file.ts` to `src/data/storage/actions/delete-storage-file.ts`.
Move tests to `src/data/storage/actions/__tests__/`.

- [ ] **Step 10: Delete old src/lib/queries/server.ts**

This file (`getProperty`, `getStatement`, `getUnit` with `React.cache`) is now replaced by domain `server.ts` files.

- [ ] **Step 11: Run all tests — confirm everything passes**

Run: `pnpm test`

All tests (moved and new) must pass.

- [ ] **Step 12: Commit**

```bash
git add src/data/invitations/ src/data/storage/ && git add -u
git commit -m "refactor: migrate invitations and storage to src/data"
```

---

### Task 3.8: Clean Up Old Directories

**Model:** Sonnet

After all domains are migrated.

- [ ] **Step 1: Delete empty old directories**

Remove if empty:
- `src/lib/queries/` (should be empty — all files moved)
- `src/lib/hooks/use-home-*.ts`, `use-property.ts`, `use-unit*.ts`, `use-statement*.ts`, `use-missing-charges.ts`, `use-profile.ts` (data hooks — should already be deleted)
- `src/app/actions/properties/`, `src/app/actions/statements/`, `src/app/actions/storage/`, `src/app/actions/__tests__/`

Keep:
- `src/lib/hooks/` (still has utility hooks: `use-media-query.ts`, `use-install-prompt.ts`, etc.)
- `src/app/actions/waitlist.ts` (not a data domain action)

- [ ] **Step 2: Verify app builds and all tests pass**

Run: `pnpm build && pnpm test`

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: remove old query, hook, and action directories after migration"
```

---

## Phase 4: Strip App Layout + PostHogIdentify

Depends on: Phase 1 Task 1.6 (middleware invite gate), Phase 3 (data layer — for `useProfile()` import path)

---

### Task 4.1: Strip App Layout to Static Shell

**Model:** Opus 4.6 — critical architectural change, must preserve auth flow and PostHog identification
**Spec sections:** 1, 1b, 7

**Files:**
- Modify: `src/app/app/layout.tsx`
- Modify: `src/components/posthog-identify.tsx`

- [ ] **Step 1: Refactor PostHogIdentify to use useProfile()**

Replace `src/components/posthog-identify.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { useProfile } from '@/data/profiles/client'

export function PostHogIdentify() {
  const { data: profile } = useProfile()

  useEffect(() => {
    if (profile?.id) {
      posthog.identify(profile.id, {
        ...(profile.email && { email: profile.email }),
        ...(profile.fullName && { name: profile.fullName }),
      })
    }
  }, [profile])

  return null
}
```

- [ ] **Step 2: Strip the app layout**

Replace `src/app/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PostHogIdentify } from '@/components/posthog-identify'

export const metadata: Metadata = {
  title: {
    absolute: 'mabenn',
    template: '%s | mabenn',
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col">
      <Suspense fallback={null}>
        <PostHogIdentify />
      </Suspense>
      {children}
    </div>
  )
}
```

All Supabase queries, cookie reads, invite logic, HydrationBoundary, and QueryClient prefetch are removed. `PostHogIdentify` wraps in Suspense because it uses `useSuspenseQuery` via `useProfile()`.

- [ ] **Step 3: Verify the app works**

Run: `pnpm dev`

Test:
1. Sign in → should reach `/app` (middleware handles auth + invite gate)
2. Navigate to property detail and back
3. Check browser console for PostHog identify call
4. Confirm no errors, no blank screens

- [ ] **Step 4: Commit**

```bash
git add src/app/app/layout.tsx src/components/posthog-identify.tsx
git commit -m "perf: strip app layout to static shell, PostHogIdentify uses useProfile()"
```

---

## Phase 5: Server Component Extraction + Streaming

Depends on: Phase 3 (data layer with `server.ts` cached fetchers), Phase 4 (stripped layout)

These tasks are large and sequential within each page but the three page refactors (home, property detail, statement) can run in parallel.

---

### Task 5.1: Stream Home Page

**Model:** Opus 4.6 — decomposing 378-line client component into server/client pairs, multiple states (empty/populated/tenant)
**Spec sections:** 3, 1b

**Files:**
- Modify: `src/app/app/(main)/page.tsx`
- Modify: `src/app/app/(main)/home-content.tsx` (decompose into server/client parts)
- Modify: `src/app/app/(main)/tenant-home-content.tsx`
- Create skeleton components as needed

This is a large refactor. The key steps:

- [ ] **Step 1: Read all current home page files thoroughly**

Read `page.tsx`, `home-content.tsx`, `tenant-home-content.tsx` to understand the full structure.

- [ ] **Step 2: Create skeleton components**

Create skeletons that structurally match the resolved content for property cards and actions sections. Match the card shapes, spacing, grid layout.

- [ ] **Step 3: Refactor page.tsx to streaming server component**

Remove HydrationBoundary/QueryClient boilerplate. The page becomes a server component that:
1. Fetches profile (via `getProfile()` from `src/data/profiles/server.ts`) for greeting
2. Fetches home properties (via `getHomeProperties()` from `src/data/home/server.ts`) for role check
3. Renders Greeting server component (no Suspense — instant)
4. Renders PropertyCards in Suspense with skeleton fallback
5. Renders UrgentActions in Suspense with skeleton fallback
6. Renders StickyBottomBar (client)

- [ ] **Step 4: Extract server components from home-content.tsx**

Split the 378-line client component into:
- Server: Greeting, PropertyCardsList, UrgentActionsList
- Client: individual PropertyCard (click handlers), ActionRow (click handlers), MobileHeader, EmptyState role choice buttons, StickyBottomBar

Each server section wrapped in `<FadeIn>`.

- [ ] **Step 5: Handle tenant vs landlord branching**

The server component checks roles from cached data and renders the appropriate view.

- [ ] **Step 6: Visual verification — CRITICAL**

Run: `pnpm dev`

Compare every state of the home page against current:
- Empty state (no properties) — role choice cards
- Populated state (with properties) — property cards + actions
- Tenant-only state
- Mobile and desktop layouts
- All click targets work
- Property cards link to correct pages

**No visual regression allowed.**

- [ ] **Step 7: Commit**

```bash
git add src/app/app/(main)/ && git add -u
git commit -m "perf: stream home page with server components and Suspense"
```

---

### Task 5.2: Stream Property Detail Page

**Model:** Opus 4.6 — most complex page, 10+ queries, per-unit loops, highlight/search params, DetailPageLayout
**Spec sections:** 4, 1b

**Files:**
- Modify: `src/app/app/(main)/p/[id]/page.tsx`
- Modify: `src/app/app/(main)/p/[id]/property-detail.tsx` (decompose)
- Modify section components as needed
- Create skeleton components

This is the most complex page refactor — 10+ queries, multiple sections, per-unit loops.

- [ ] **Step 1: Read all property detail files thoroughly**

Read `page.tsx`, `property-detail.tsx`, and all section components.

- [ ] **Step 2: Create skeleton components**

Skeletons for: BillingSummaryCard, UnitSection (charges), TenantsSection. Must match the resolved layout structurally.

- [ ] **Step 3: Refactor page.tsx**

Remove HydrationBoundary/QueryClient boilerplate. The page becomes a server component that:
1. Fetches property (via `getProperty()`) to get `unitIds`
2. Renders PropertyHeader (server, from cached property data)
3. Renders DetailPageLayout with:
   - Main: BillingSummaryCard per unit in Suspense, SetupProgressSection, UnitSection per unit in Suspense
   - Sidebar: SetupProgressSection, PropertyInfoSection, TenantsSection per unit in Suspense

- [ ] **Step 4: Convert sections to server/client pairs**

Each section that currently uses React Query hooks (`useUnit`, `useUnitCharges`, etc.) becomes a server component that calls the cached `server.ts` fetchers. Interactive parts (buttons, sheets, modals) remain client components.

Sections wrapped in `<FadeIn>` individually.

- [ ] **Step 5: Preserve highlight/search params functionality**

The current `PropertyDetail` uses `useSearchParams` for highlight targets. This client-side behavior needs to be preserved — likely via a client wrapper component that reads search params and provides the HighlightProvider context.

- [ ] **Step 6: Visual verification — CRITICAL**

Test every state: single unit, property info display, charges list, tenants list, invites, setup progress, highlight scrolling, all click targets, mobile and desktop.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/(main)/p/[id]/ && git add -u
git commit -m "perf: stream property detail page with server components and Suspense"
```

---

### Task 5.3: Stream Statement Draft Page

**Model:** Opus 4.6 — complex sheet state extraction, server/client communication via context, DetailPageLayout
**Spec sections:** 5, 1b

**Files:**
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/page.tsx`
- Modify: `src/app/app/(focused)/p/[id]/s/[statementId]/statement-draft.tsx` (decompose)
- Create: `StatementSheetController` client component
- Create skeleton components

- [ ] **Step 1: Read all statement draft files thoroughly**

Read `page.tsx`, `statement-draft.tsx`, `summary-card.tsx`, `completeness-warning.tsx`, `charges-list.tsx`, `add-charge-sheet.tsx`.

- [ ] **Step 2: Create skeleton components**

Skeletons for: SummaryCard, CompletenessWarning, ChargesList. Match resolved layout.

- [ ] **Step 3: Create StatementSheetController**

Extract the sheet state management (`sheetOpen`, `editingInstance`, `fillingMissing`) and callbacks into a client component that wraps the page content and provides callbacks via context.

- [ ] **Step 4: Refactor page.tsx**

Remove HydrationBoundary/QueryClient boilerplate. Server component that fetches statement, property, unit (for title/subtitle metadata) and streams sections via Suspense.

- [ ] **Step 5: Convert sections to server components**

SummaryCard, CompletenessWarning, ChargesList become server components with `'use cache'` fetchers. Charge row click handlers are client components that communicate with StatementSheetController.

Sections wrapped in `<FadeIn>` individually.

- [ ] **Step 6: Visual verification — CRITICAL**

Test: close button, title/badge, summary card (mobile + desktop), completeness warning, charges list, add/edit charge sheet, all interactions.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/(focused)/p/[id]/s/[statementId]/ && git add -u
git commit -m "perf: stream statement draft page with server components and Suspense"
```

---

## Phase 6: AppBar + Cache Invalidation + Performance Rule

Depends on: Phase 3 (profiles server.ts), Phase 4 (stripped layout)

---

### Task 6.1: Refactor AppBar to Server/Client Split

**Model:** Sonnet
**Spec sections:** 10

**Files:**
- Modify: `src/app/app/app-bar.tsx`
- Modify: `src/app/app/(main)/layout.tsx`

- [ ] **Step 1: Read current AppBar and main layout**

Read `src/app/app/app-bar.tsx` and `src/app/app/(main)/layout.tsx`.

- [ ] **Step 2: Split AppBar into static Wordmark + streamed UserAvatarMenu**

The Wordmark renders instantly (server, no data). The UserAvatarMenu becomes a server component that reads from `getProfile()` (cached), wrapped in `<FadeIn>`. The `(main)` layout wraps `UserAvatarMenu` in `<Suspense fallback={null}>`.

```tsx
// src/app/app/(main)/layout.tsx
import { Suspense } from 'react'
import { Wordmark } from '@/components/wordmark'
import { UserAvatarMenu } from './user-avatar-menu'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="h-6" href="/app" />
      </div>
      <Suspense fallback={null}>
        <UserAvatarMenu />
      </Suspense>
      <div className="min-h-0 flex-1">
        {children}
      </div>
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
```

- [ ] **Step 3: Create UserAvatarMenu server component**

```tsx
// src/app/app/(main)/user-avatar-menu.tsx
import { FadeIn } from '@/components/fade-in'
import { UserMenuTrigger } from '@/components/user-menu'
import { getProfile } from '@/data/profiles/server'

export async function UserAvatarMenu() {
  const profile = await getProfile()

  return (
    <FadeIn>
      <div id="app-avatar" className="fixed top-4 right-8 z-30 hidden md:block">
        <UserMenuTrigger
          userName={profile?.fullName ?? undefined}
          avatarUrl={profile?.avatarUrl ?? undefined}
        />
      </div>
    </FadeIn>
  )
}
```

- [ ] **Step 4: Verify AppBar works**

Run: `pnpm dev`

Confirm: logo appears instantly, avatar fades in smoothly, user menu works on click. Test on both mobile and desktop.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/app-bar.tsx src/app/app/(main)/layout.tsx src/app/app/(main)/user-avatar-menu.tsx
git commit -m "perf: split AppBar into static Wordmark + streamed UserAvatarMenu"
```

---

### Task 6.2: Add Cache Invalidation to Server Actions

**Model:** Sonnet
**Spec sections:** 12

**Files:**
- Modify: various server actions in `src/data/*/actions/`

- [ ] **Step 1: Identify which actions need invalidation**

Each mutation action that changes data displayed by cached server components needs to call `revalidatePath()` or `revalidateTag()`:

- `create-property` → `revalidatePath('/app')` (home page)
- `update-property` → `revalidatePath('/app/p/[id]')` for the specific property
- `create-charges`, `update-charge`, `remove-charge`, `toggle-charge-active` → revalidate property detail
- `invite-tenant`, `cancel-invite`, `remove-tenant` → revalidate property detail
- `create-statement`, `add-charge`, `remove-charge-instance`, `update-charge-instance` → revalidate statement page
- `generate-instances` → revalidate statement page

- [ ] **Step 2: Add revalidation calls**

Add `import { revalidatePath } from 'next/cache'` and appropriate `revalidatePath()` calls at the end of each mutation action, after the successful database operation.

- [ ] **Step 3: Verify mutations still work**

Test key mutations: create a property, add a charge, invite a tenant. Confirm the UI updates after each mutation (cache is busted, fresh data appears).

- [ ] **Step 4: Commit**

```bash
git add src/data/*/actions/
git commit -m "feat: add cache invalidation to server actions for streaming components"
```

---

### Task 6.3: Update Existing Rules & Skills with Performance Patterns

**Model:** Opus 4.6 — needs to understand existing rule/skill structure and integrate without duplication

Rather than creating a standalone rule, update the existing places where developers already look for guidance:

**Files:**
- Modify: `.claude/skills/frontend-patterns/SKILL.md`

- [ ] **Step 1: Update frontend-patterns skill — Data Fetching section**

In `.claude/skills/frontend-patterns/SKILL.md`, replace/update the "Data Fetching" section to reflect the new architecture:

- All data fetching code lives in `src/data/<domain>/` with `shared.ts` (pure fetch functions), `server.ts` (`'use cache'` wrappers), `client.ts` (React Query hooks via `createSuspenseHook` factory)
- Never use `HydrationBoundary` / `dehydrate` / server-side `QueryClient` — streaming replaces this pattern
- Never fetch your own API routes from server components — call the data function directly
- Server actions that mutate cached data must call `revalidatePath()` or `revalidateTag()`

- [ ] **Step 2: Update frontend-patterns skill — add Server vs Client Components section**

Add a section covering:
- Keep layouts and page shells as server components — never add `'use client'` to layouts
- Push `'use client'` down the tree — only interactive leaf components should be client
- Use server components for data fetching with `'use cache'` + `cacheLife()`
- Client components are for: click handlers, form state, hooks, browser APIs
- Auth redirects happen in middleware, not in layouts — never add async auth checks to layouts

- [ ] **Step 3: Update frontend-patterns skill — add Streaming & Suspense section**

Add a section covering:
- Every meaningful route must have a `loading.tsx` returning `<PageLoader />`
- Wrap independent data-fetching sections in `<Suspense>` with structurally-matching skeleton fallbacks
- Wrap each streamed section in `<FadeIn>` for smooth appearance
- Static parts of the page render immediately outside Suspense

- [ ] **Step 4: Update frontend-patterns skill — add Framer Motion section**

Add a section covering:
- Never import `motion/react` directly at the top of a file — always use dynamic import
- Use CSS animations (`animate-fade-in`, `animate-fade-up`) for simple transitions
- For `AnimatePresence`: extract to separate file, lazy-load with `React.lazy` + top-level `import()` preload
- Pattern: `const promise = import('./component'); const Component = lazy(() => promise.then(...))`

- [ ] **Step 5: Verify no duplication or contradiction with CLAUDE.md**

Read CLAUDE.md's Performance section. Ensure the frontend-patterns skill adds detail without contradicting it. CLAUDE.md stays as-is — it already references frontend-patterns in its Rules & Skills Reference section.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/frontend-patterns/SKILL.md
git commit -m "docs: update frontend-patterns skill with performance patterns"
```

---

## Phase 7: Final Verification

Depends on: All previous phases complete

---

### Task 7.1: Full Regression Test

**Model:** Opus 4.6

- [ ] **Step 1: Run all tests**

Run: `pnpm test`

All tests must pass. No skipped tests.

- [ ] **Step 2: Production build**

Run: `pnpm build`

No build errors, no type errors, no warnings about missing modules.

- [ ] **Step 3: Full visual regression check**

Run: `pnpm start` (production mode)

Walk through every page and interaction:

| Page | Check |
|---|---|
| Landing (`/`) | Hero fade-up animation identical, all sections render |
| Sign-up (`/auth/sign-up`) | Invite code → sign-up transition works |
| Home (empty) | Role choice cards, "coming soon" animation |
| Home (populated) | Greeting, property cards, actions, sticky bar |
| Home (tenant) | Tenant view renders correctly |
| Property detail | Header, billing summary, charges, tenants, sidebar |
| Property detail (highlight) | `?highlight=` scroll + glow works |
| Statement draft | Title, summary card (mobile + desktop), charges, completeness warning |
| Statement draft (add charge) | Add/edit charge sheet opens, split expand/collapse animates |
| Property creation | All 4 wizard steps, step transitions, form validation |
| Back/close buttons | All feel instant, no dead time |

- [ ] **Step 4: Check Framer Motion is not in default bundles**

Open browser DevTools → Network tab. Navigate to the home page. Confirm `motion` chunk is NOT loaded. Navigate to property detail — confirm `motion` chunk is NOT loaded. Open a charge config sheet with split — confirm `motion` chunk loads then.

- [ ] **Step 5: Commit any final fixes if needed**

---

### Task 7.2: Code Review

**Model:** Opus 4.6

Use the `superpowers:code-reviewer` agent to perform a thorough code review of all changes against the spec and plan. The review must check:

- [ ] **Step 1: Review against spec goals**

Verify each spec goal is met:
- Navigation between authenticated pages feels near-instant (static layout, no server roundtrip blocking)
- Back/close buttons respond immediately (loading.tsx + client cache + static layout)
- First paint shows meaningful content within ~100ms (streaming + skeletons)
- Framer Motion loads on zero pages by default (check all dynamic imports are correct)
- Data layer is centralized in `src/data/` with `shared.ts` / `server.ts` / `client.ts` per domain
- No visual regressions on landing page animations

- [ ] **Step 2: Bug audit**

Check for common issues introduced by this type of refactor:
- Missing imports after file moves (grep for old import paths that weren't updated)
- Broken test imports (all test files reference new paths)
- Server/client boundary violations (`'use client'` components imported into server components incorrectly)
- Missing `'use cache'` directives on server fetchers
- Missing `revalidatePath()` / `revalidateTag()` calls in mutation actions
- Suspense boundaries missing fallbacks or wrapping the wrong scope
- React Query hooks still used in components that should now be server components
- `HydrationBoundary` / `dehydrate` / `QueryClient` still referenced anywhere

- [ ] **Step 3: Performance audit**

Verify the architecture actually delivers the performance goals:
- App layout (`src/app/app/layout.tsx`) has ZERO async operations — no `await`, no `createClient()`, no DB queries
- Middleware handles auth + invite gate via JWT claims only — no DB queries
- Every route under `/app/*` has a `loading.tsx`
- Framer Motion is not in any page's default bundle (only lazy-loaded)
- `cacheComponents: true` is set in `next.config.ts`
- All `server.ts` files use `'use cache'` + `cacheLife()`

- [ ] **Step 4: Regression audit**

Verify zero UI/UX regression by checking:
- All skeletons structurally match their resolved content (same card shapes, grid columns, spacing)
- `FadeIn` wraps each streamed section (not raw CSS classes)
- Landing page CSS animation values match the original Framer Motion values (duration, easing, delays)
- `FadeUpGroup` auto-indexes correctly (no manual `index` props at call sites)
- `AnimatedSplitSection` matches the original expand/collapse behavior in charge config sheets
- `StatementSheetController` preserves all sheet state and callbacks from original `StatementDraft`
- Property detail `HighlightProvider` and search params behavior preserved
- Mobile headers (MobileHeader in home, inline headers elsewhere) still render correctly
- Desktop AppBar Wordmark + avatar positioning unchanged

- [ ] **Step 5: Rule completeness check**

Verify `.claude/rules/nextjs-performance.md` captures all patterns established by this refactor. Check it's referenced in `CLAUDE.md`.

- [ ] **Step 6: File any issues found and fix before merging**

Any bugs, regressions, or spec violations found in steps 1-5 must be fixed. Re-run tests after fixes.

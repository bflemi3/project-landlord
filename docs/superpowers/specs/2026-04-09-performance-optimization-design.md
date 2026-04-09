# Performance Optimization — Design Spec

## Problem

The app feels slow everywhere: initial load after sign-in, navigating to property detail, opening statements, and going back. The root cause is that `src/app/app/layout.tsx` runs 2-3 Supabase queries + cookie reads on every navigation, blocking all child routes from rendering before the server roundtrip completes. Secondary issues include missing `loading.tsx` files, heavy client bundles (Framer Motion on every page), no server-side caching, and large client components that could be streamed as server components.

## Goals

- Navigation between authenticated pages feels near-instant
- Back/close buttons respond immediately
- First paint on every route shows meaningful content (skeleton or cached data) within ~100ms
- Framer Motion loads on zero pages by default — only loads lazily when needed
- Data layer is centralized, domain-organized, and testable
- No visual regressions on landing page animations

## Non-Goals

- Rewriting React Query out of the app (it stays for client-side cache + mutations)
- Changing the auth provider or Supabase setup
- Adding Vercel Speed Insights (can be done separately)
- Optimizing public pages beyond landing hero animations

---

## Section 1: Strip App Layout to Static Shell

### Current

`src/app/app/layout.tsx` is a server component that on every request:
1. Creates a Supabase client and calls `getClaims()`
2. Queries `profiles` table for auth gate + PostHog + AppBar data
3. Reads cookies for pending invite codes
4. Conditionally redeems invites (additional profile re-fetch)
5. Prefetches profile into a `QueryClient` for hydration

This blocks every `/app/*` route from rendering until all of the above completes.

### Change

The middleware (`src/middleware.ts`) already handles auth redirects — unauthenticated users on `/app/*` are redirected to `/auth/sign-in`. The layout's `getClaims()` check is redundant for that purpose.

**New layout:**

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col">
      {children}
    </div>
  )
}
```

- Remove all Supabase queries, cookie reads, and invite logic from the layout
- Remove `PostHogIdentify` server props — it reads from `useProfile()` client-side instead (Section 7)
- Remove `HydrationBoundary` / `QueryClient` prefetch — `useProfile()` fetches client-side, AppBar is already wrapped in `<Suspense>` in the `(main)` layout
- The invite-code gate moves to middleware (Section 8)

**Result:** Layout renders instantly. No server roundtrip before children start rendering.

---

## Section 1b: Remove HydrationBoundary Pattern Entirely

### Current

Four files use the `QueryClient` → `prefetchQuery()` → `dehydrate()` → `<HydrationBoundary>` pattern to hand server-fetched data to React Query on the client:

1. `src/app/app/layout.tsx` — profile
2. `src/app/app/(main)/page.tsx` — home properties + actions
3. `src/app/app/(main)/p/[id]/page.tsx` — property + units + charges + tenants + invites + statements
4. `src/app/app/(focused)/p/[id]/s/[statementId]/page.tsx` — statement + charges + missing charges

### Why it's no longer needed

With streaming server components, the server renders the actual UI and streams it to the browser. The user sees content immediately — before React even hydrates. There's no gap where a client component needs pre-populated React Query data to avoid a refetch flash.

Client components that still use React Query (for mutations, optimistic updates, background refetching) fetch client-side via `useSuspenseQuery`. This is how the hooks already work — `HydrationBoundary` was just pre-warming the cache. Since the server-streamed content is already visible, the client-side fetch is invisible to the user.

### Change

Remove from all four files:
- `QueryClient` instantiation
- All `prefetchQuery()` / `setQueryData()` calls
- `dehydrate()` calls
- `<HydrationBoundary>` wrapper

The `QueryProvider` in root layout stays — React Query is still used for mutations and client-side cache. Only the server-to-client data handoff via dehydration is removed.

---

## Section 2: Add `loading.tsx` to Missing Routes

### Current

4 of ~10 meaningful routes have `loading.tsx`:
- `app/app/loading.tsx`
- `app/auth/loading.tsx`
- `app/app/(main)/p/[id]/loading.tsx`
- `app/app/(focused)/p/[id]/s/[statementId]/loading.tsx`

### Change

Add `loading.tsx` returning `<PageLoader />` to:

| Route | File |
|---|---|
| Home page | `src/app/app/(main)/loading.tsx` |
| Property creation | `src/app/app/(focused)/p/new/loading.tsx` |

Public pages (`(public)/`, `(public)/changelog/`) are static and don't need loading states.

Each `loading.tsx` is identical:

```tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

This gives Next.js permission to partially prefetch these routes and show instant feedback on navigation.

---

## Section 3: Stream Home Page with Server Components

### Current

`src/app/app/(main)/page.tsx` is a server component that:
1. Creates Supabase client, fetches profile (redundant — layout already does this)
2. Prefetches home properties and home actions via `QueryClient`
3. Renders `<HomeContent>` — a 378-line `'use client'` component that renders everything: greeting, avatar, property cards, urgent actions, empty state

The entire page waits for all prefetches before sending anything.

### Change

Split into streaming server components:

```
HomePage (server)
├── Greeting (server, cached)                    -> renders instantly
│   reads profile name + time of day via 'use cache'
├── Suspense fallback={<CardsSkeleton />}
│   └── PropertyCards (server, cached)           -> streams when ready
│       └── PropertyCard (client)                -> click handlers only
├── Suspense fallback={<ActionsSkeleton />}
│   └── UrgentActions (server, cached)           -> streams when ready
│       └── ActionItem (client)                  -> click handlers only
└── StickyBottomBar (client)                     -> "Add property" button
```

**Key decisions:**
- `Greeting` does not need Suspense — it reads from a cached profile fetch that resolves near-instantly. If cache is cold, the query is fast enough (single row by PK) to not need a skeleton.
- Each streamed section is wrapped in the refactored `<FadeIn>` component (CSS-based server component, no Framer Motion) so it fades in as it resolves. No page-level `<FadeIn>` wrapper — each section gets its own.
- Property cards and action items are client components only for click handlers and navigation — the list rendering is server-side.
- Remove the top-level `<FadeIn>` wrapper from the home page since individual sections fade in independently.
- The redundant profile query on the home page is eliminated — greeting reads from the same cached profile fetcher used by the avatar menu.
- Tenant vs landlord branching remains — the server component checks the role and renders the appropriate view.

---

## Section 4: Stream Property Detail Page

### Current

`src/app/app/(main)/p/[id]/page.tsx` runs 10+ prefetch queries via `QueryClient` (`Promise.all` over all unit data: unit, charges, tenants, invites, statements, missing charges) and waits for all before rendering a single `<PropertyDetail>` client component.

### Change

Decompose into streaming server components, keeping the current section structure intact. The page uses `DetailPageLayout` with a main column and sidebar. Each section currently fetches its own data via React Query hooks — after refactoring, the page becomes a server component that streams each section independently via Suspense.

The current structure loops `property.unitIds` for BillingSummaryCard, UnitSection (charges), and TenantsSection. This multi-unit loop stays as-is — we are not reorganizing around units.

```
PropertyPage (server, fetches property to get unitIds)
├── PropertyHeader (server, cached)              -> streams immediately (name, address, back button)
│
├── DetailPageLayout
│   ├── Main column:
│   │   ├── Suspense fallback={<BillingSummarySkeleton />}  (per unitId)
│   │   │   └── BillingSummaryCard (server, cached per unit)
│   │   │       └── GenerateStatementButton (client) -> mutation handler
│   │   ├── SetupProgressSection (mobile only, server)
│   │   └── Suspense fallback={<UnitSectionSkeleton />}  (per unitId)
│   │       └── UnitSection (server, cached per unit) -> charges list
│   │           └── ChargeConfigSheet (client) -> dynamic-imports motion/react internally
│   │
│   └── Sidebar:
│       ├── SetupProgressSection (desktop only, server)
│       ├── PropertyInfoSection (server, cached)
│       └── Suspense fallback={<TenantsSkeleton />}  (per unitId)
│           └── TenantsSection (server, cached per unit)
```

Note: There is no standalone "Statements section" — statement data (current period drafts, financial summaries) lives inside `BillingSummaryCard`.

- Each section fetches its own data via `'use cache'` server fetchers.
- Interactive parts (edit buttons, modals, sheets) remain client components within each section.
- Remove the top-level `<FadeIn>` wrapper — individual sections are each wrapped in `<FadeIn>` independently.
- The existing `PropertyDetail` client component is decomposed into these server/client pairs.
- React Query stays for mutations (adding charges, inviting tenants, etc.) and client-side cache for back-navigation.

---

## Section 5: Stream Statement Draft Page

### Current

`src/app/app/(focused)/p/[id]/s/[statementId]/page.tsx` runs 5 prefetch queries and waits for all before rendering `<StatementDraft>` client component.

### Change

```
StatementPage (server)
├── StatementHeader (server, cached)             -> streams immediately
├── Suspense fallback={<SummarySkeleton />}
│   └── SummaryCard (server, cached)             -> streams when ready
├── Suspense fallback={<ChargesSkeleton />}
│   └── ChargesList (server, cached)             -> streams when ready
│       └── AddChargeSheet (client)              -> dynamic-imports motion/react internally
└── Suspense fallback={<WarningSkeleton />}
    └── CompletenessWarning (server, cached)     -> streams when ready
```

Same pattern as property detail. Remove top-level `<FadeIn>`.

---

## Section 6: Framer Motion — Dynamic Import Everywhere

### Current

`motion/react` (~50KB gzipped) is imported directly in 8 production files. It loads on every authenticated page because `FadeIn` wraps every page.

### Strategy

Every Framer Motion consumer dynamic-imports `motion/react` internally with a preload strategy. No component is itself dynamic-imported. Framer Motion loads on zero pages by default.

### CSS Replacements

**`FadeIn` component** — refactor to CSS server component:

```tsx
// src/components/fade-in.tsx (server component, zero JS)
import { cn } from '@/lib/utils'

export function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
```

Tailwind keyframe in `globals.css`:
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out both;
}
```

**`FadeUp` + `FadeUp.Group`** — refactor to CSS server components:

```tsx
// src/components/fade-up.tsx (server component, zero JS)
function FadeUp({ children, delay, index, className }: {
  children: React.ReactNode
  delay?: number
  index?: number
  className?: string
}) {
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

function FadeUpGroup({ children, baseDelay = 0, stagger = 0.08, className }: {
  children: React.ReactNode
  baseDelay?: number
  stagger?: number
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        '--base-delay': `${baseDelay}s`,
        '--stagger': `${stagger}s`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

Tailwind keyframe in `globals.css`:
```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  animation: fade-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both;
}
```

The `FadeUp.Group` API shape stays the same. The `index` prop replaces the React context-based auto-indexing (callers pass `index={0}`, `index={1}`, etc.). This eliminates ~100 lines of Framer Motion + context code.

**Landing page:** Replace `motion.h1`, `motion.p`, `motion.div` with `FadeUp` components using explicit delays (0.1, 0.2, 0.35) matching the current `custom` values. The animation curve and timing must match exactly — no visual regression. The `fadeUp` variants object in `landing.tsx` uses `duration: 0.5` and `ease: [0.25, 0.1, 0.25, 1]` which maps directly to the CSS `cubic-bezier(0.25, 0.1, 0.25, 1)`.

**`home-content.tsx`:** The single `motion.p` opacity fade is removed entirely — home page is refactored to streaming server components (Section 3) and no longer needs this.

### Dynamic Import with Preload — Per Component

**`charge-config-sheet.tsx`** and **`add-charge-sheet.tsx`:**
- Internally dynamic-import `motion/react` (specifically `motion` and `AnimatePresence`)
- Preload triggered when the sheet opens (the expand/collapse section isn't visible until user picks "Split" payer)
- Static UI (form fields, labels, slider) renders immediately; animated section loads lazily

Pattern:
```tsx
// Inside the component file
import { lazy, Suspense, useEffect, useState } from 'react'

// Preload function — call when sheet opens
const motionPromise = () => import('motion/react')

function AnimatedSplitSection({ show, children }: { show: boolean; children: React.ReactNode }) {
  const [Motion, setMotion] = useState<typeof import('motion/react') | null>(null)

  useEffect(() => {
    motionPromise().then(setMotion)
  }, [])

  if (!Motion) return show ? <div>{children}</div> : null

  return (
    <Motion.AnimatePresence>
      {show && (
        <Motion.motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          {children}
        </Motion.motion.div>
      )}
    </Motion.AnimatePresence>
  )
}
```

**`create-property-flow.tsx` (property wizard):**
- Dynamic-import `SlideIn` component (which uses `motion/react`)
- Preload `motion/react` on mount via `useEffect(() => { import('motion/react') }, [])` — fires during step 1 while user fills the property form
- By step 2 (first `SlideIn` usage), Framer Motion chunk is already downloaded
- `FadeUp` in `setup-complete.tsx` (step 4) replaced with CSS `FadeUp.Group` — no Framer Motion needed

**`sign-up-form.tsx`:**
- Dynamic-import `motion/react` with preload on mount
- The invite code form (step 1) renders without animation
- By the time the user submits the code and the `AnimatePresence` transition fires, Framer Motion is loaded

### Final Framer Motion Map

| Route | Framer Motion loads? | When? |
|---|---|---|
| Home page | No | — |
| Property detail | Only if user opens split config | Preloaded when ChargeConfigSheet opens |
| Statement draft | Only if user opens split config | Preloaded when AddChargeSheet opens |
| Property wizard | Background during step 1 | Preloaded on mount, ready by step 2 |
| Sign-up form | Background on mount | Preloaded, ready for code→form transition |
| Landing page | No | CSS only |

---

## Section 7: PostHogIdentify Reads from useProfile()

### Current

`PostHogIdentify` receives server-fetched profile data as props from the app layout.

### Change

`PostHogIdentify` calls `useProfile()` internally to get profile data. It's already a client component and renders `null`. Once profile loads client-side, it calls `posthog.identify()`.

```tsx
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

Move `PostHogIdentify` from the app layout into the `(main)` layout (which already has Suspense for AppBar). It renders inside the same Suspense boundary — no additional loading state needed.

---

## Section 8: Middleware Handles Invite-Code Gate Permanently

### Current

App layout checks `has_redeemed_invite` on every navigation and redirects to `/auth/enter-code` if false. This requires a DB query on every request.

### Change

**Option A (chosen): Add `has_redeemed_invite` as a custom claim in the Supabase JWT.**

1. **Migration:** Create a Postgres function + trigger on the `profiles` table that syncs `has_redeemed_invite` into the user's JWT custom claims via `auth.users.raw_app_meta_data` whenever the column changes.
2. **Middleware:** After `getClaims()` (which already runs), check the custom claim. If `has_redeemed_invite` is not true and the path starts with `/app`, redirect to `/auth/enter-code`.
3. **Permanent:** Once redeemed, the JWT claim persists across all future sessions. Zero DB queries for this check, ever.

The pending invite code redemption logic (currently lines 38-51 in app layout) moves to the `/auth/enter-code` page as a server action — that's the only page where it's relevant.

---

## Section 9: Data Layer Centralization

### Current Structure

- `src/lib/queries/` — 12 files: fetch functions + query keys + types (server-compatible, accept Supabase client)
- `src/lib/hooks/` — 12 data hooks (1:1 boilerplate wrappers) + 5 utility hooks
- `src/lib/queries/server.ts` — React.cache wrappers (`getProperty`, `getStatement`, `getUnit`)
- `src/app/actions/` — 27 server action files in subdirectories
- Page-level inline prefetching in 4 page.tsx files

Each hook is ~10 lines of boilerplate: create client, call `useSuspenseQuery` with query key + fetch function. 12 files doing the same thing.

### New Structure

```
src/data/
├── properties/
│   ├── shared.ts           # Types, query keys, fetch functions (pure)
│   ├── server.ts           # 'use cache' + cacheLife wrappers
│   ├── client.ts           # React Query hooks (useSuspenseQuery)
│   └── actions/
│       ├── create-property.ts
│       ├── update-property.ts
│       ├── invite-tenant.ts
│       ├── resend-invite.ts
│       ├── cancel-invite.ts
│       ├── remove-tenant.ts
│       └── validate-property.ts
├── units/
│   ├── shared.ts           # fetchUnit, fetchUnitCharges, fetchUnitTenants,
│   │                       # fetchUnitInvites, fetchUnitStatements, types, keys
│   ├── server.ts
│   ├── client.ts
│   └── actions/
│       ├── add-unit.ts
│       ├── create-charges.ts
│       ├── update-charge.ts
│       ├── remove-charge.ts
│       └── toggle-charge-active.ts
├── statements/
│   ├── shared.ts           # fetchStatement, fetchStatementCharges,
│   │                       # fetchMissingCharges, types, keys
│   ├── server.ts
│   ├── client.ts
│   └── actions/
│       ├── create-statement.ts
│       ├── add-charge.ts
│       ├── generate-instances.ts
│       ├── remove-charge-instance.ts
│       ├── update-charge-instance.ts
│       ├── save-charge-definition.ts
│       ├── create-source-document-record.ts
│       ├── delete-bill-document.ts
│       └── get-source-document-url.ts
├── profiles/
│   ├── shared.ts           # fetchProfile, UserProfile type, query key
│   ├── server.ts           # cached profile for server components (greeting, avatar)
│   ├── client.ts           # useProfile hook
│   └── actions/
│       └── redeem-invite-by-code.ts
├── invitations/
│   ├── shared.ts
│   └── actions/
│       ├── send-invite.ts
│       ├── validate-invite.ts
│       └── redeem-invite.ts
├── home/
│   ├── shared.ts           # fetchHomeProperties, fetchHomeActions, types, keys
│   ├── server.ts
│   └── client.ts
├── shared/
│   ├── create-hook.ts      # Factory: createSuspenseHook(queryKey, fetchFn)
│   └── supabase.ts         # Re-export client/server Supabase creators
└── __tests__/
    ├── properties/
    │   └── queries.test.ts
    ├── units/
    │   └── queries.test.ts
    ├── statements/
    │   └── queries.test.ts
    ├── profiles/
    │   └── queries.test.ts
    └── home/
        └── queries.test.ts
```

### File Responsibilities

**`shared.ts`** — defines fetch functions once, exports types and query keys. Pure functions: take a `TypedSupabaseClient`, return typed data. Used by both `server.ts` and `client.ts`.

**`server.ts`** — imports from `shared.ts`, wraps with `'use cache'` + `cacheLife()` for streaming server components. Creates its own Supabase server client internally.

```tsx
// src/data/properties/server.ts
import { cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchProperty } from './shared'

export async function getProperty(id: string) {
  'use cache'
  cacheLife('minutes')
  const supabase = await createClient()
  return fetchProperty(supabase, id)
}
```

**`client.ts`** — imports from `shared.ts`, wraps with `useSuspenseQuery` for client components. Uses the hook factory to eliminate boilerplate.

```tsx
// src/data/properties/client.ts
'use client'
import { createSuspenseHook } from '../shared/create-hook'
import { fetchProperty, propertyQueryKey, type Property } from './shared'

export const useProperty = createSuspenseHook<Property, [string]>(
  (id) => propertyQueryKey(id),
  fetchProperty,
)

// Re-export types for consumer convenience
export type { Property } from './shared'
```

**`create-hook.ts`** — factory that eliminates the boilerplate pattern:

```tsx
// src/data/shared/create-hook.ts
'use client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function createSuspenseHook<TData, TArgs extends unknown[]>(
  keyFn: (...args: TArgs) => unknown[],
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

### Migration

- Move existing fetch functions from `src/lib/queries/*.ts` into domain `shared.ts` files
- Move existing hooks from `src/lib/hooks/use-*.ts` (data hooks only) into domain `client.ts` files using the factory
- Move server actions from `src/app/actions/` into domain `actions/` directories
- Utility hooks (`use-media-query`, `use-install-prompt`, etc.) stay in `src/lib/hooks/` — they're not data hooks
- `src/lib/queries/server.ts` (`getProperty`, `getStatement`, `getUnit` with React.cache) merges into domain `server.ts` files, replacing `React.cache` with `'use cache'`
- Update all import paths across the codebase
- Existing action integration tests move with their actions; test import paths update accordingly

### Tests

Add unit tests for:
- Each `shared.ts` fetch function (mock Supabase client, verify query shape and return types)
- Each `server.ts` cache function (verify caching behavior)

Existing action integration tests (20+ files) move to `src/data/<domain>/actions/__tests__/` with updated import paths.

---

## Section 10: Server Component Extraction — AppBar & Layouts

### (main) Layout Purpose

The `(main)` layout group provides the AppBar (desktop logo + user avatar), `SwUpdateNotifier`, and `InstallPrompt` for dashboard pages (home, property detail). The `(focused)` layout group (property creation, statement editing) intentionally omits the AppBar for a distraction-free experience.

### AppBar Refactor

**Current:** `AppBar` is a client component that calls `useProfile()` via React Query for the avatar. The `(main)` layout wraps it in `<Suspense>` with no fallback.

**Change:** Split AppBar into static + streamed parts:

```
MainLayout (server)
├── AppBar (server, static)
│   ├── Wordmark (server, no data)                -> renders instantly
│   └── Suspense fallback={null}
│       └── UserAvatarMenu (server, cached)       -> fades in via CSS when ready
├── PostHogIdentify (client, inside Suspense)     -> reads useProfile(), renders null
├── {children}
├── SwUpdateNotifier (client)
└── InstallPrompt (client)
```

`UserAvatarMenu` becomes a server component that reads from the cached profile fetcher (`src/data/profiles/server.ts`), wrapped in `<FadeIn>`. The logo renders instantly. The avatar fades in once the cached profile resolves. On subsequent navigations with a warm cache, both appear together.

`PostHogIdentify` moves here from the app layout, inside the same Suspense boundary.

---

## Section 11: Convert Property Creation Page to Server Component

### Current

`src/app/app/(focused)/p/new/page.tsx` is marked `'use client'` — it just wraps `<CreatePropertyFlow />` in `<FadeIn>`.

### Change

Make it a server component:

```tsx
import { CreatePropertyFlow } from './create-property-flow'

export default function NewPropertyPage() {
  return <CreatePropertyFlow />
}
```

Remove the `<FadeIn>` wrapper — the wizard has its own internal UI that doesn't need a page-level fade. `CreatePropertyFlow` stays `'use client'` (it manages step state).

---

## Section 12: Enable `cacheComponents` + `'use cache'` on Data Fetchers

### next.config.ts

Add `cacheComponents: true`:

```tsx
const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  env: { ... },
  ...
}
```

This lets Next.js cache server component render results across requests.

### Data Fetchers

All `server.ts` files in `src/data/` use `'use cache'` + `cacheLife('minutes')` (see Section 9). This means:
- Repeated navigations to the same property/statement serve cached data
- Back navigation is near-instant (client cache via React Query + server cache via `'use cache'`)
- Cache invalidation happens via `revalidateTag()` or `revalidatePath()` in server actions after mutations

### Cache Invalidation

Server actions that mutate data call `revalidateTag()` or `revalidatePath()` to bust relevant caches:
- `create-property` -> revalidate home properties
- `update-property` -> revalidate property detail
- `add-charge`, `update-charge-instance` -> revalidate statement charges
- etc.

The specific invalidation strategy per action is an implementation detail — the principle is that mutations bust the cache for affected server components.

---

## Summary of All Changes

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | Strip app layout to static shell | Unblocks all navigation | Medium |
| 1b | Remove HydrationBoundary pattern from all pages | Simpler pages, no server prefetch boilerplate | Low |
| 2 | Add `loading.tsx` to missing routes | Instant navigation feedback | Low |
| 3 | Stream home page (greeting, cards, actions as server components) | Instant first paint, cached sections | High |
| 4 | Stream property detail page | Independent section loading | High |
| 5 | Stream statement draft page | Independent section loading | Medium |
| 6 | Framer Motion — CSS replacements + dynamic import everywhere | ~50KB off default bundle, zero-load pages | Medium |
| 7 | `PostHogIdentify` uses `useProfile()` | Decouples from server layout | Low |
| 8 | Middleware invite gate via JWT custom claim | Permanent, zero-cost auth check | Low |
| 9 | Data layer centralization (`src/data/`) | Cleaner codebase, testable, cacheable | High |
| 10 | Server component extraction (AppBar, avatar) | Cached, streamed shell | Medium |
| 11 | Convert `p/new/page.tsx` to server component | Better prefetching | Low |
| 12 | `cacheComponents` + `'use cache'` on data fetchers | Faster repeated visits | Medium |

## Dependencies Between Sections

- Section 1 (strip layout) depends on Section 8 (middleware invite gate) — can't remove invite check from layout until middleware handles it
- Section 1b (remove HydrationBoundary) happens naturally as part of Sections 1, 3, 4, 5 — each page drops its prefetch/dehydrate boilerplate when refactored to streaming
- Section 3, 4, 5 (streaming) depend on Section 9 (data centralization) — streaming server components need the `server.ts` cached fetchers
- Section 6 (Framer Motion) is independent — can be done in any order
- Section 7 (PostHogIdentify) depends on Section 1 (strip layout) — moves out of layout
- Section 10 (AppBar) depends on Section 9 (data centralization) — avatar menu reads from cached profile
- Section 12 (cacheComponents) is independent but most valuable after Sections 3-5 and 9

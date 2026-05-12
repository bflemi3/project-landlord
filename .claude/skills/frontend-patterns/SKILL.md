---
name: frontend-patterns
description: Use when adding 'use client', wrapping a section in Suspense, writing a server fetcher, configuring React Query, adding a form, or noticing a slow navigation.
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# Frontend Patterns

The app must feel fast. Click → content visible within tens of milliseconds. Every rule in this skill serves that goal, or the goal of keeping the UI consistent as the product grows.

## Red flags — stop if you're thinking this

| Thought | Reality |
|---|---|
| "I'll just put `'use client'` at the page level for now" | Defeats streaming and prefetching. Push `'use client'` to leaves; only interactive components get it. |
| "One Suspense at the top of the page is simpler" | The whole page waits on the slowest query. Wrap each independent section in its own `<SuspenseFadeIn>`. |
| "I'll await these two in sequence, the second is fast anyway" | Adds a network round trip. Use `Promise.all`. |
| "Framer Motion at the top of the file, I'll optimize later" | Blocks first paint. Lazy-load via top-level `import()` + `React.lazy`. |
| "I'll skip `staleTime` for now" | Forces a loading state on every back-nav. Always set explicit `staleTime` (default 30s). |
| "This page needs a useEffect to fetch data" | Server-render or use `useSuspenseQuery` + `HydrationBoundary`. `useEffect` for data is a defeat. |

## Performance — The App Must Feel Fast

These rules govern how navigations and initial paints work. Violating any one of them noticeably slows the app.

### Navigation feels instant via three mechanisms combined

1. **`loading.tsx` on every route.** Returns `<PageLoader />`. This enables Next.js `<Link>` prefetching on hover and shows *something* the instant the user clicks.
2. **Client boundaries pushed to the leaves.** Pages and sections are server components by default. Only interactive leaves (buttons with handlers, form inputs, modals) get `'use client'`. A page-level client component defeats streaming and prefetching.
3. **Per-section skeletons that match final layout.** Each server-rendered section is wrapped in `<SuspenseFadeIn fallback={<SectionSkeleton />}>`. Sections stream independently. Skeletons structurally match the final content (same card shapes, grid columns, heights, spacing) so there is zero layout shift when content resolves.

The goal: the user sees the page shell immediately, then real content streams in section by section within tens of ms.

### Always use `<SuspenseFadeIn>`, never raw `<Suspense>`

`src/components/suspense-fade-in.tsx` wraps `Suspense + FadeIn`. Content fades in when data resolves instead of popping in. Do NOT use raw `<Suspense>` + `<FadeIn>` separately — use the composed component.

### Fetch in parallel — never in sequence

Inside a single server component, never chain awaits that don't depend on each other. Every sequential await adds a round trip.

Wrong: `const a = await getA(); const b = await getB()` (two sequential trips).
Right: `const [a, b] = await Promise.all([getA(), getB()])`.

Applies equally to server wrappers prefetching multiple datasets for `HydrationBoundary`.

### No data waterfalls across components

A waterfall is: parent fetches data, passes result to child, child fetches more data *that could have been fetched in parallel at the parent*. This serializes network time.

Rule: fetch sibling data in parallel at the page/wrapper level, then pass IDs (or full results) down. Children receive IDs as props and fetch their own details — but those child fetches should all *start* in parallel because each child suspends independently.

### `React.cache()` on every server fetcher

Canonical example: `src/data/properties/server.ts` (search for `cache(`). Server fetchers in `src/data/<domain>/server.ts` MUST wrap their fetch function in `React.cache()` for per-request deduplication. Without it, a page that reads the property in three sections does three DB trips.

### React Query `staleTime` for back-nav feeling instant

React Query hooks MUST set explicit `staleTime`. Anti-pattern: `useSuspenseQuery({ queryKey, queryFn })` without `staleTime` in the same options object — forces a loading state on every back-nav. NEVER use `staleTime: 0`. Default to 30s; 5min for slowly-changing data.

### Dynamic import anything heavy and below-the-fold

Framer Motion, charts, editors, bottom-sheet content, anything the user doesn't see on first paint — lazy load via `React.lazy` + top-level `import()` preload:

```tsx
const promise = import('./heavy-thing')
const HeavyThing = lazy(() => promise.then(...))
```

The top-level `import()` fires when the parent module is parsed — not on render, not on interaction. The asset downloads in the background while the user interacts with static UI.

For Framer Motion specifically: never import `motion/react` at the top of a file. Always lazy-load. Use CSS animations (`animate-fade-in`, `animate-fade-up`) for simple opacity/transform transitions that don't need JS.

### Layouts must have zero async operations

No `await`, no `createClient()`, no DB queries, no `cookies()` in layouts. A blocking layout blocks every child route on every navigation. Auth redirects and access checks go in middleware via JWT claims, not in layouts.

### Suspense boundary placement

Wrap `<SuspenseFadeIn>` around *slow* sections, not the whole page. A single page-level boundary defeats streaming — the whole page waits on the slowest query. Each independently-fetched section gets its own boundary so fast sections paint immediately.

## Server vs Client Components (Next.js App Router)

- Pages and layouts are server components. Push `'use client'` down to leaf interactive components (buttons with handlers, form inputs, modals, hook-using components).
- Client components with `useSuspenseQuery` require an `HydrationBoundary` parent. The browser Supabase client (`createBrowserClient`) has no auth during SSR, so queries fail unless data is prefetched server-side and dehydrated.

**SSR hydration pattern:**

```tsx
// Server wrapper
export async function SectionWrapper({ unitId }: { unitId: string }) {
  const queryClient = new QueryClient()
  const [unit, charges] = await Promise.all([getUnit(unitId), getUnitCharges(unitId)])
  queryClient.setQueryData(unitQueryKey(unitId), unit)
  queryClient.setQueryData(unitChargesQueryKey(unitId), charges)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientSection unitId={unitId} />
    </HydrationBoundary>
  )
}
```

Only needed for client components using `useSuspenseQuery`. Pure server components don't need it. The server wrapper calls `server.ts` fetchers (authenticated, `React.cache()` dedupes).

## Data Layer (`src/data/<domain>/`)

All data fetching code is domain-organized:

| File | Purpose |
|---|---|
| `shared.ts` | Pure fetch functions, TypeScript types, query keys |
| `server.ts` | Server-side fetch wrappers wrapped in `React.cache()` |
| `client.ts` | React Query hooks via `createSuspenseHook` factory |
| `actions/` | Server actions (mutations with `revalidatePath` / `revalidateTag`) |

Rules:

- Server fetchers call `createClient()` (Supabase server client with cookies) and delegate to `shared.ts`
- Never fetch your own API routes from server components — call the data function directly
- Server actions that mutate data MUST call `revalidatePath()` or `revalidateTag()` to bust caches
- Prefer `useSuspenseQuery` over `useQuery`, wrap with `<SuspenseFadeIn>` boundaries
- `useSuspenseQuery` query functions should **throw** on error (not return `null`) — keeps `data` non-nullable and eliminates null-check early returns
- Strong loading / empty / error / success states for every query

## Atomic Hooks

Hooks are atomic and single-responsibility. Parent hooks return their own data plus child IDs — never children's data. Child hooks fetch their own details.

Components receive only primitive IDs as props and fetch their own data via hooks. Use Supabase joins to get child IDs in one query. React Query deduplicates identical queries automatically.

## Hooks Discipline

**Never call hooks after a conditional return.** All `use*` calls must come before the first `return`. With `useSuspenseQuery` throwing on error (above), `data` is always non-nullable, eliminating the null-check early return pattern that pushes hooks below a return.

## Component Body Ordering

1. Refs — `useRef`
2. Context — `useContext`, `useTranslations`, `useLocale`
3. Router — `useRouter`, `usePathname`, `useSearchParams`
4. State — `useState`, `useReducer`, `useActionState`
5. Derived — `useMemo`, `useDeferredValue`
6. Queries — `useSuspenseQuery`, `useQuery`, `useMutation`
7. Effects — `useEffect`, `useLayoutEffect`
8. Callbacks — `useCallback`, event/form handlers
9. Render helpers — conditional variables, formatted values
10. Return — JSX

Principle: stable → reactive → side-effectful → behavioral.

## Props Ordering

Inside `type Props = { ... }` / `interface Props`:

1. Value props first, sorted alphabetically
2. Function-typed props second, sorted alphabetically

The IDE color-codes the two groups differently, so this ordering matches what you already see. Stable diffs, predictable scanning, no bikeshedding over where a new prop goes.

## Navigation

Use `next/link` (`<Link>`) for all internal navigation — never `<a href>`, which triggers a full page reload and breaks prefetching. `loading.tsx` on every route enables partial prefetching for `<Link>`.

## Form Patterns

**React 19 primitives:**
- `useActionState` for all form submissions: `[state, formAction, isPending]`
- `useFormStatus` in child components for pending state
- Pass `formAction` to `<form action={formAction}>`
- Actions return `{ errors: { fieldName: 'message' }, success: false }` — never throw
- Field-level errors near the input, not a banner at the top
- `<fieldset disabled={isPending}>` to disable during submission

**Validation policy:**
- Server-side validation is the source of truth — always validate in the server action
- MVP: server validation only, returned via `useActionState`
- Never use native HTML validation (`required`, `pattern`) for user-facing UX
- Do NOT add zod or react-hook-form unless genuinely needed for complex conditional validation
- Do NOT validate on blur for MVP — submit only
- Do NOT block submission on optional fields

**Brazil address forms (country-adaptive):**
- CEP field at top — auto-fill via ViaCEP on valid input
- Use the country-adaptive provider pattern (`src/lib/address/`) — the data model supports other countries even though BR is the only live locale
- State as select dropdown, separate number and complement fields

## List-row helper hooks (`src/lib/hooks/`)

Two small hooks are paired with `AccordionItem` (`src/components/ui/accordion.tsx`) for animated row lists. Reach for them whenever a section renders a list the user can add/remove from (tenants, expenses).

- **`useDelayedRemoval`** (`src/lib/hooks/use-delayed-removal.ts`) — `{ isRemoving, remove }`. Call `remove(id, commit)` to trigger a row's exit animation; `commit` runs after the duration (default 200ms) to drop the row from the data. The hook owns the timeout cleanup, an idempotent guard (rapid clicks no-op), a `try/finally` around `commit` so a throwing callback still cleans bookkeeping, and a mounted-ref so the post-timeout state update doesn't fire on an unmounted parent. Pair `isRemoving(id)` with `<AccordionItem isRemoving={...}>`.
- **`useRecentlyAdded`** (`src/lib/hooks/use-recently-added.ts`) — `{ markAdded, isJustAdded }`. Tracks ids the user added during the current mount of the list. The flag drives `<AccordionItem animateEntrance={isJustAdded(id)}>` (so only newly-added rows fade in — required because all-rows-fade-in confuses parent measurement when the list mounts as part of a section opening) and `autoFocus` on the new row's first input.

## General Rules

- Prefer shadcn components: `npx shadcn@latest add <component>` before building manually
- Extract a shared component when the markup appears in 3+ files
- Avoid: giant page components, business logic in presentational components, speculative abstractions

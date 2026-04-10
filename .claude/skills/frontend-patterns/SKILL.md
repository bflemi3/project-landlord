---
name: frontend-patterns
description: React hooks, component ordering, form patterns, and data fetching conventions. Use when writing React components, hooks, forms, or data fetching code.
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# Frontend Patterns

## React Hooks — Never Violate

**Never call hooks after a conditional return.** All `use*` calls must come before the first `return` in a component.

With `useSuspenseQuery`, the query function should **throw on error** (not return `null`) so `data` is always non-nullable — eliminating null-check early returns that push hooks below a `return`.

## Atomic Hooks

Hooks must be atomic and single-responsibility. Parent hooks return their own data + child IDs, never children's data. Child hooks fetch their own details. React Query deduplicates identical queries automatically.

Components receive only primitive IDs as props and fetch their own data. Use Supabase joins to get child IDs in one query.

## Component Body Ordering

1. **Refs** — `useRef`
2. **Context** — `useContext`, `useTranslations`, `useLocale`
3. **Router** — `useRouter`, `usePathname`, `useSearchParams`
4. **State** — `useState`, `useReducer`, `useActionState`
5. **Derived** — `useMemo`, `useDeferredValue`, computed values
6. **Queries** — `useSuspenseQuery`, `useQuery`, `useMutation`
7. **Effects** — `useEffect`, `useLayoutEffect`
8. **Callbacks** — `useCallback`, event/form handlers
9. **Render helpers** — conditional variables, formatted values
10. **Return** — JSX

Principle: stable → reactive → side-effectful → behavioral.

## Data Fetching

**Domain-organized data layer** — all data fetching code lives in `src/data/<domain>/`:

| File | Purpose |
|---|---|
| `shared.ts` | Pure fetch functions, TypeScript types, query keys |
| `server.ts` | `'use cache'` + `cacheLife()` wrappers for streaming server components |
| `client.ts` | React Query hooks via `createSuspenseHook` factory |
| `actions/` | Server actions (mutations with `revalidatePath()` / `revalidateTag()`) |

**Rules:**

- Server fetchers must use `'use cache'` directive + `cacheLife('minutes')` — this is how streaming server components get cached data
- Never use `HydrationBoundary` / `dehydrate` / server-side `QueryClient` — streaming replaces this pattern entirely
- Never fetch your own API routes from server components — call the data function directly
- Server actions that mutate cached data must call `revalidatePath()` or `revalidateTag()` to bust caches
- React Query is for **client-side concerns only**: mutations, optimistic updates, background refetching, back-navigation cache. It is NOT used for server-to-client data handoff
- Prefer `useSuspenseQuery` over `useQuery` — wrap with `<Suspense>` boundaries
- Strong loading / empty / error / success states

## Server vs Client Components

- **Layouts must have zero async operations** — no `await`, no `createClient()`, no DB queries, no `cookies()`. A blocking layout blocks every child route on every navigation
- Push `'use client'` down the tree — layouts and pages should be server components, only interactive leaf components should be client
- Use server components for data fetching with `'use cache'` + `cacheLife()`
- Client components are for: click handlers, form state, hooks, browser APIs
- Auth redirects and access checks happen in middleware via JWT claims, never in layouts

## Streaming & Suspense

- Every meaningful route must have a `loading.tsx` returning `<PageLoader />` — this enables partial prefetching
- Wrap independent data-fetching sections in `<Suspense>` with skeleton fallbacks
- Skeleton fallbacks must structurally match their resolved content — same card shapes, grid columns, section heights, spacing — to prevent layout shift when content streams in
- Wrap each streamed section in `<FadeIn>` for smooth appearance as it resolves. No page-level `<FadeIn>` — each section gets its own
- Static parts of the page (headers, labels, navigation) render immediately outside Suspense
- `cacheComponents: true` is enabled in `next.config.ts` — server component render results are cached across requests

## Navigation

- Use `next/link` (`<Link>`) for all internal navigation — never `<a href>` tags, which cause full page reloads
- `loading.tsx` on every route enables partial prefetching for `<Link>` navigations
- Back/close buttons feel instant due to: static layout (no server roundtrip) + React Query client cache + loading states

## Framer Motion

- Never import `motion/react` directly at the top of a file — always use dynamic import
- Use CSS animations (`animate-fade-in`, `animate-fade-up`) for simple opacity/transform transitions
- For `AnimatePresence` (mount/unmount animations): extract to a separate component file, lazy-load with `React.lazy` + top-level `import()` preload
- Preload pattern: `const promise = import('./component'); const Component = lazy(() => promise.then(...))`
- The top-level `import()` fires when the parent module is parsed — not on render, not on user interaction. Framer Motion downloads in the background while the user interacts with static UI

## Form Patterns

**Validation:**
- Server-side validation is source of truth — always validate in server actions
- MVP: server validation only via `useActionState` returning field-level errors
- Never use native HTML validation messages (`required`, `pattern`) for user-facing UX

**React 19 patterns:**
- `useActionState` for all form submissions: `[state, formAction, isPending]`
- `useFormStatus` in child components for pending state
- Pass `formAction` to `<form action={formAction}>`
- Return `{ errors: { fieldName: 'message' }, success: false }` — never throw
- Field-level errors near the input, not banner at top

**Form UX:**
- Labels above inputs, generous mobile tap targets
- Disable submit + show loading while `isPending`
- Multi-step forms: client-side step state on single route
- `<fieldset disabled={isPending}>` to disable during submission

**Address forms (Brazil-first):**
- CEP at top — auto-fill via ViaCEP on valid input
- Country-adaptive provider pattern (`src/lib/address/`)
- State as select dropdown, separate number/complement fields

**Don't:**
- Add zod/react-hook-form unless genuinely needed for complex conditional validation
- Validate on blur for MVP — submit only
- Block submission on optional fields

## General Rules

- Prefer shadcn components: `npx shadcn@latest add <component>`
- Extract to shared component when markup appears in 3+ files
- Avoid: giant page components, business logic in presentational components, state spaghetti, speculative abstractions

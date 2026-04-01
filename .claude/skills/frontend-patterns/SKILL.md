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

- **TanStack Query** for all client-side data fetching — no raw `useEffect` + `fetch`
- Prefer `useSuspenseQuery` over `useQuery` — wrap with `<Suspense>` boundaries
- Client components for interactive authenticated flows
- Server components only where clearly beneficial
- Strong loading / empty / error / success states

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

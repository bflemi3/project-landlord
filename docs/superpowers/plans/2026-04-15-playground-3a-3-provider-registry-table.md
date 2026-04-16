# Provider Registry Table — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Replace the empty state on `/eng/providers` with a table listing all providers, their tax IDs, profile counts, and derived category badges — with search and category filtering.

**Deliverable:** The `/eng/providers` page loads a table of providers from Supabase, displays derived data from profiles, supports filtering and search, and navigates to `/eng/providers/[providerId]` on row click.

**Spec:** `docs/superpowers/specs/2026-04-14-playground-ui-design.md` — Section 1: Provider Registry (columns: Provider, Tax ID, Profiles, Categories only — accuracy, sparklines, threshold status, and last tested are deferred).

**Depends on:** Plan 3a-1 (eng shell — done), Plan 3a-2 (provider creation — done).

**Blocks:** Provider detail page, accuracy dashboard provider table.

---

## Codebase Context

- **Data layer pattern:** Each domain uses `shared.ts` (types + fetch function + query key) and `client.ts` (React Query suspense hook via `createSuspenseHook` from `src/data/shared/create-hook.ts`). See `src/data/properties/` for the canonical example.
- **Providers data layer:** Currently only has server actions in `src/data/providers/actions/` (create, delete, lookup, find-by-tax-id, extract-cnpjs). No `shared.ts` or `client.ts` exists yet — this plan creates them.
- **DB schema:** `providers` table has `id`, `name`, `display_name`, `tax_id`, `logo_url`, etc. `provider_invoice_profiles` has `provider_id`, `category`, `status`, etc. Categories and profile counts are derived by joining these tables.
- **UI components available:** `Badge` (with variants), `Input` (with clear button), `Select`, `Button`, `EmptyState`, `PageLoader`. No `Table` component exists — the codebase uses list containers with `divide-y divide-border overflow-hidden rounded-2xl border border-border` per the component library skill.
- **Category enum:** `provider_category` exists in the DB types: `electricity`, `water`, `gas`, `internet`, `condo`, `sewer`, `insurance`, `other`.
- **Current page:** `src/app/eng/providers/page.tsx` renders `EmptyState` inside a `Suspense` boundary with `PageLoader` fallback.
- **Provider detail page:** `src/app/eng/providers/[providerId]/page.tsx` uses raw `useState`/`useEffect` for fetching (predates React Query pattern — not in scope to fix here).

## File Structure

- `src/data/providers/shared.ts` — `ProviderListItem` type, `fetchProviders` function, `providersQueryKey`
- `src/data/providers/client.ts` — `useProviders` suspense hook
- `src/app/eng/providers/page.tsx` — Replace empty state with registry table, search, and category filter

---

## Tasks

### Task 1: Create the provider registry page (deliverable shell)

Update `src/app/eng/providers/page.tsx` to render the table layout structure. For now, use a hardcoded empty array for providers so the UI compiles. The page should have:

- A header row with "Providers" title and the existing "Add provider" button (linking to `/eng/providers/new`)
- A filter bar with a search input (using the existing `Input` component with a search icon) and a category select dropdown (using the existing `Select` component) populated with the `provider_category` enum values
- A table/list container using the codebase's list container pattern (`divide-y divide-border overflow-hidden rounded-2xl border border-border`) with column headers: Provider, Tax ID, Profiles, Categories
- Each row should be a clickable link to `/eng/providers/[providerId]` using Next.js `Link`
- Provider column shows `display_name ?? name`
- Tax ID column shows formatted tax ID or a muted dash if null
- Profiles column shows a count number
- Categories column shows `Badge` components (one per unique category, `secondary` variant)
- When no providers exist, continue showing the existing `EmptyState`
- When filters produce no results, show a different empty message like "No providers match your filters"
- Client-side filtering: search filters on name, display_name, and tax_id; category select filters on derived categories

Keep the existing `Suspense` boundary and `PageLoader` fallback. The `ProviderRegistry` component will call the hook from Task 3 once it exists — for now, replace the hook call with the hardcoded empty array so it compiles.

**Check:** `component-library` (list container pattern, Badge usage), `design-system` (spacing, typography, mobile-first), `frontend-patterns` (component ordering)

### Task 2: Build the providers data layer (TDD)

Create `src/data/providers/shared.ts` following the pattern in `src/data/properties/shared.ts`:

- Define a `ProviderListItem` interface with: `id`, `name`, `displayName`, `taxId`, `profileCount`, `categories` (array of `provider_category` enum values, deduplicated)
- Write `fetchProviders` that queries `providers` with a join to `provider_invoice_profiles` selecting `category`. The function should aggregate at the application level: group profiles by provider, count them, collect unique non-null categories into an array. Return an array of `ProviderListItem` sorted alphabetically by display name (falling back to name).
- Export `providersQueryKey` as `() => ['providers'] as const`

Write tests first in `src/data/providers/__tests__/shared.test.ts`. Test the transformation logic — given raw Supabase response shape, verify the function produces correct `ProviderListItem` objects (profile counts, deduplicated categories, display name fallback). Mock the Supabase client.

Then create `src/data/providers/client.ts` following `src/data/properties/client.ts`: export `useProviders` using `createSuspenseHook` with `providersQueryKey` and `fetchProviders`.

**Check:** `frontend-patterns` (React Query, data fetching), `superpowers:test-driven-development`

### Task 3: Wire the data layer into the page

Update `src/app/eng/providers/page.tsx` to replace the hardcoded empty array with the `useProviders` hook from the data layer. Import `useProviders` from `@/data/providers/client`. The page should now fetch real data and display it through the table built in Task 1.

Verify the page works end-to-end: loads providers from Supabase, displays them in the table, search and category filters work, clicking a row navigates to the detail page, empty state shows when no providers exist.

**Check:** `frontend-patterns` (hook usage, component ordering)

### Task 4: Verification & Code Review

- Run the type checker, test suite, and linter to verify everything passes
- Dispatch `superpowers:code-reviewer` against spec Section 1 (Provider Registry columns: Provider, Tax ID, Profiles, Categories) to verify the implementation matches the spec for the columns in scope
- Address any findings and re-verify
- Do not commit — present results for user testing

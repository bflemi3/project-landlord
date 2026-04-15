# Eng Platform Shell — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Scaffold the `/eng` platform with engineer-only auth, sidebar navigation, and an empty provider registry page.
**Deliverable:** An engineer navigates to `/eng`, is authenticated against the `engineer_allowlist`, sees a sidebar with navigation sections, and lands on `/eng/providers` showing an empty state. Non-engineers are redirected.
**Spec:** `docs/superpowers/specs/2026-04-14-playground-ui-design.md` — Architecture, Route Structure, Sidebar sections
**Depends on:** Plan 2 (test runner) — complete
**Blocks:** Plan 3a-2 (provider creation)

---

## Architecture Decision: Local vs Production Supabase

The playground UI is a standard Next.js app that uses the standard Supabase client. There is no dual-client pattern in the UI layer.

- **Local development (building the playground):** Uses local Supabase. Engineer user and `engineer_allowlist` rows are local. All data is local seed data for UI development.
- **Production deployment (using the playground):** Uses production Supabase naturally — standard env vars point to production. Engineers create real providers, profiles, test cases against production data.
- **Claude's access to production data:** Handled by MCP tools that run server-side with a service role key to read/write production Supabase. MCP tools are not a separate plan — they are dependencies pulled in by the UI deliverable that needs them, just like migrations or utilities. Each plan includes only the MCP tools required for that plan's workflow. This plan needs none; later plans (profile creation, test cases, fixes) introduce MCP tools incrementally as Claude's participation in the workflow requires them. See the spec's Architecture section for the full pattern.

---

## Codebase Context

**Supabase client pattern:** `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server) both use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The eng platform uses these same clients for all UI data operations.

**Middleware:** `src/middleware.ts` delegates to `src/lib/supabase/middleware.ts` (`updateSession`). Currently gates `/app` (requires auth + redeemed invite) and `/auth` (redirects authenticated users). The `/eng/*` gate will be added here. The middleware creates a Supabase server client inline using the anon key — the engineer allowlist check needs a service role client to bypass RLS.

**Auth pattern:** `engineer_allowlist` table exists (`supabase/migrations/20260413120300_engineer_allowlist.sql`) with `user_id` (FK to `auth.users`) and `email`. RLS enabled, no policies — middleware uses service role to bypass RLS.

**Data layer pattern:** `src/data/<domain>/shared.ts` (query functions + types), `src/data/<domain>/client.ts` (React Query hooks via `createSuspenseHook`), `src/data/<domain>/server.ts` (server-side fetchers). The eng platform will follow this same pattern with the standard Supabase client.

**Layout pattern:** `src/app/app/layout.tsx` wraps with `h-svh flex flex-col`. `src/app/app/(main)/layout.tsx` adds header, user menu, content area. The eng layout will be a new route group with its own sidebar-based layout, independent from the app layout.

**Empty states / loading:** The app uses `PageLoader` (`src/components/page-loader.tsx`) for loading. No existing shared empty-state component — the spec calls for a consistent one (icon + heading + description + optional action button).

**Component library:** shadcn-based components in `src/components/ui/` (Button, Badge, Card, Input, etc.). Lucide icons. Tailwind CSS v4 with design tokens in `globals.css`.

---

## File Structure

| File | Purpose |
|---|---|
| `src/lib/supabase/middleware.ts` | Updated — add `/eng/*` engineer auth gate using service role client |
| `src/components/empty-state.tsx` | Shared empty state component (icon + heading + description + action) |
| `src/app/eng/layout.tsx` | Eng layout with fixed left sidebar (shadcn Sidebar) |
| `src/app/eng/page.tsx` | Redirects to `/eng/providers` |
| `src/app/eng/providers/page.tsx` | Provider registry — empty state for now |

---

## Tasks

### Task 1: Middleware — engineer auth gate for `/eng/*`

**What:** Update `src/lib/supabase/middleware.ts` to gate `/eng/*` routes. The check: (1) get user session from the existing Supabase client (already created in `updateSession`), (2) if no session → redirect to `/auth/sign-in`, (3) if session → create a service role client using `createClient` from `@supabase/supabase-js` with the standard `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, query `engineer_allowlist` where `user_id` matches the authenticated user, (4) if not on allowlist → redirect to `/app`. This must run before the existing `/app` checks so the middleware doesn't interfere with eng routes.

**Why:** The eng platform is engineer-only. The `engineer_allowlist` table already exists with RLS enabled and no user-facing policies — only the service role can read it. The service role client is created inline using the standard Supabase URL (same instance that manages auth sessions), not a separate "eng client."

**Where:** Modify `src/lib/supabase/middleware.ts`. Add the `/eng` check block after session creation but before the existing `/app` route checks.

**How to verify:** Run the type checker. Manual verification in Task 4 (sign in as engineer, confirm access; unauthenticated, confirm redirect).

**Commit:** `feat: gate /eng routes to engineer allowlist`

**Check:** `security-lgpd` (access control, RLS), `database-migrations` (no migrations needed — table exists)

---

### Task 2: Eng layout with sidebar navigation

**What:** Install the shadcn Sidebar component (`npx shadcn@latest add sidebar`), then create the eng layout at `src/app/eng/layout.tsx`. Fixed left sidebar with five navigation sections: Providers, Requests, Fixes, Accuracy, Discovery. Each section has an icon and label. Active section highlighted based on current pathname. Sidebar is collapsible using the built-in shadcn collapsible behavior and `SidebarTrigger`. Badge counts are hardcoded to zero for now — the tables they query don't exist yet (later plans add live counts). The layout wraps children in `SidebarInset` for proper content area positioning.

**Why:** The sidebar is the primary navigation for the eng platform. All `/eng/*` routes render inside this layout. Desktop-only — no mobile considerations. shadcn's Sidebar component provides collapsible state management, grouped menus, badge support, and a trigger button out of the box — no need to build from scratch.

**Where:** New file `src/app/eng/layout.tsx`. Wrap in `SidebarProvider` + `Sidebar` + `SidebarInset`. Use `SidebarHeader` for branding/title, `SidebarContent` with `SidebarGroup` and `SidebarMenu`/`SidebarMenuItem`/`SidebarMenuButton` for the nav links, and `SidebarMenuBadge` for the badge counts. Use `SidebarTrigger` for the collapse toggle. Use `usePathname` for active state detection. Use Lucide icons: `Building2` (Providers), `Inbox` (Requests), `Wrench` (Fixes), `BarChart3` (Accuracy), `Search` (Discovery). Follow the design system for colors, spacing, and typography — use existing design tokens from `globals.css`. Reference the shadcn Sidebar docs at https://ui.shadcn.com/docs/components/radix/sidebar for component API and composition patterns.

**How to verify:** Run the type checker. Visual verification in Task 4.

**Commit:** `feat: add eng layout with sidebar navigation`

**Check:** `design-system` (visual patterns, spacing, hierarchy), `component-library` (reuse existing components)

---

### Task 3: Root redirect + provider registry empty state

**What:** Three files:
1. `src/components/empty-state.tsx` — shared component following the spec's empty state pattern: icon + heading + description + optional action button. Accepts props for each element. Reusable across the platform (no providers, no test cases, no requests, capabilities not implemented, etc.).
2. `src/app/eng/page.tsx` — server component that redirects to `/eng/providers` using Next.js `redirect()`.
3. `src/app/eng/providers/page.tsx` — renders the provider registry page with the `EmptyState` component. Heading: "No providers yet". Description guides toward creating the first provider. "Add provider" button links to `/eng/providers/new` (route doesn't exist yet — later plan). Wrap in `Suspense` with `PageLoader` fallback following the existing pattern from `src/app/app/(main)/page.tsx`.

**Why:** The root redirect keeps `/eng` from being a dead end. The empty state is the first thing an engineer sees — it should communicate clearly that there are no providers and guide toward creating one. The `EmptyState` component is reusable across the platform.

**Where:** New files as listed. The `EmptyState` component goes in `src/components/empty-state.tsx` (shared, not eng-specific).

**How to verify:** Run the type checker. Visual verification in Task 4.

**Commit:** `feat: add eng provider registry with empty state`

**Check:** `component-library` (check for existing empty state patterns), `design-system` (spacing, typography)

---

### Task 4: Verification & Code Review

**What:**
1. Run the type checker (`npx tsc --noEmit`), test suite (`npm test`), and linter (`npm run lint`) — fix any failures.
2. Reset the local database (`npx supabase db reset`), start the dev server (`npm run dev`), and manually verify:
   - The user will create the eng user themselves in Supabase dashboard and insert into `engineer_allowlist` (see Setup Note below).
   - Sign in at `/auth/sign-in` with the eng credentials.
   - Navigate to `/eng` — should redirect to `/eng/providers`.
   - See the sidebar with all 5 sections, Providers highlighted as active.
   - See the empty state on the provider registry page.
   - Toggle sidebar collapse — should work.
   - Test non-engineer redirect: remove the eng user from `engineer_allowlist` via SQL editor, refresh `/eng` — should redirect to `/app`. Re-insert the row after testing.
   - Test unauthenticated redirect: open `/eng` in an incognito window — should redirect to `/auth/sign-in`.
3. Dispatch `superpowers:code-reviewer` against spec sections: Architecture, Route Structure, Sidebar sections.
4. Address any findings, re-run type checker + tests.

**Commit:** Any fixes from verification

---

## Setup Note

After DB reset, the eng user must be created manually since sign-up requires a tenant invite code (which engineers don't need):

1. Open Supabase dashboard (`http://localhost:54323`)
2. Authentication → Users → Add user → `brand.fleming+mabenneng@gmail.com` + password
3. Copy the generated user ID
4. SQL Editor → `INSERT INTO engineer_allowlist (user_id, email) VALUES ('<user-id>', 'brand.fleming+mabenneng@gmail.com');`
5. Sign in at `/auth/sign-in` with those credentials → navigate to `/eng`

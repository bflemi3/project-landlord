# Bills ledger — design

Date: 2026-06-04 · Status: designed, not built · Issue: PRO-73

The property page is tabbed — **Revenue · Bills · Contract · Messages** (desktop: top tabs;
mobile: floating bottom bar). This spec details the **Bills** tab — a month-grouped ledger of
the property's **expenses** (utilities, condo, IPTU) — plus the shared page chrome (tabs,
header, contract-status indicator). Rent is first-class but lives in the **Revenue** tab, not
in Bills; Revenue, Contract, and Messages start as placeholders. The page branches into
landlord and tenant views by role, but the **Bills tab is shared** — both render the same
central ledger (a shared component, not inside either role view); per-role differences live in
the other tabs.

- Visual reference: `docs/design-references/charges-ledger.html` · Summary strip treatment
  locked 2026-06-10 (reference HTML retired — the built `bills-summary.tsx` is canonical)
- Schema: `supabase/migrations/20260601120000_remove_statements_discovery_ledger.sql`
- Seed: `supabase/seed.sql` · Read layer: `src/data/charges/` · Filters: `bills-filter-bar.tsx`
- Property-page UI state: `p/[id]/state/` — store already holds `tab` + `billsFilters` (with `useTab`/`setTab`, `useBillsFilters`/`setBillsFilters`), persisted per-property + hydration-gated. Wire the Tabs UI to `useTab`/`setTab`; don't add new tab/filter state.

## Decisions

- **Discovery-driven.** `charge_instances` exist only once a bill (DDA/ingestion) or payment
  (Open Finance) is found — never pre-generated. The ledger shows real instances **plus**
  synthetic "expected/missing" rows for recurring charges not yet captured this month.
- **Statuses (row pill, as built 2026-06-10):** real (discovered) bills are Paid · Due ·
  Overdue — paid → Paid; unpaid & past due → Overdue; any other unpaid (future, today, or
  NULL `due_date`) → Due. There is no "imminent" window. **Awaiting is reserved for synthetic
  expected rows** (recurring charge not yet discovered this month), matching the summary
  vocabulary. Maps to `StatusBadge` variants (paid / overdue / pending / default). **Partial
  is not a status** — a partial payment stays Due/Overdue; "R$X of R$Y paid" goes on the
  secondary line.
- **Summary strip (top) — Due · Paid · Awaiting** (locked 2026-06-10, supersedes
  Expected · Paid · Pending; see visual reference above):
  - **Due** = concrete unpaid bills — current month **plus overdue carried from prior
    months** — never estimates. One consolidated "what do I owe" number.
  - **Paid** = payments **dated this month**, regardless of which month's bill they settle
    (paying May's overdue bill in June moves money from Due to Paid in June's view).
  - **Awaiting** = recurring bills expected this month but not yet discovered. Always shows
    the bill count; amount = 3-month rolling average (`~R$X`), `unknown` when no history,
    "all bills in" when none awaited. A `?` affordance explains it (hover tooltip on
    desktop, tap popover on mobile — `ResponsivePopover`).
  - **Share-primary:** when the viewer is responsible for any bill this month, their share
    headlines each stat ("Your due" / "Your paid", teal eyebrow) with the property total
    demoted to a `total · R$X` sub-line; otherwise the strip shows plain property totals.
  - **Overdue is not a column.** It stays consolidated inside Due and is called out by a
    rose attention banner above the strip — rendered whenever the **property** has overdue
    > 0, so both sides always see it. The banner leads with the property overdue amount and
    makes the viewer's slice explicit: "· your share R$X", or "· you owe none of it" when
    their slice is zero (decided 2026-06-10). NULL `due_date` never counts as overdue
    (matches the row-status rule).
  - The banner carries **no action** (revised 2026-06-11 — the earlier "view" anchor was a
    no-op: overdue rows sort first in the ledger directly below the strip, so there is
    nowhere to scroll). Overdue rows are surfaced by ordering plus the per-row dot instead.
    (Stats-as-filters deferred with the filter bar.)
- **Row:** company name (type word prominent, provider muted) · secondary date ("Apr 10", not
  "due Apr 10") · amount far-right (tabular nums) · StatusBadge. Tight gap between badge + amount.
  **Overdue rows lead with a destructive `Dot`** (decided 2026-06-11) — left of the title,
  offsetting it so the row breaks the column rhythm when scanning; applies wherever an
  overdue row renders (current month and history).
- **Grouping:** by month. Past months frozen/immutable; current month is the live view.
- **Order (revised 2026-06-10):** Overdue → Due → Awaiting → Paid, as **one flat list per
  month** — no status sub-sections or collapsing; the StatusBadge carries each row's state.
- **Earlier months (decided 2026-06-11):** frozen history is revealed via collapsed "ghost"
  month headers — the next earlier month's label rendered muted with a chevron, one calendar
  month per tap, expanding in place so history reads as a continuous timeline.
- **Expected/missing rows:** synthetic, for a recurring charge expected but not yet found this
  month; amount = rolling average of that company's prior months. Rolling average is used
  **only** for expected values / a company drill-in — never for real instances.
- **"Expected" rule (decided 2026-06-10):** every active charge definition with no charge
  instance discovered this month counts as expected — no cadence detection. This drives both
  the Awaiting stat (count + estimate) and the synthetic ledger rows.
- **Filters (removed from UI, 2026-06-10):** the built Company / Status / Date bar is not
  rendered for now — the component and its store state are kept for a future phase.
  Stats-as-filters is deferred along with the bar.

## Acceptance Criteria

- ~~Filter options derived from data · filter selections persisted~~ — deferred with the
  filter bar (component kept, not rendered).
- Selected tab is kept in memory on the users client so that a user returning to the property page, sees the tabs as they were the last time they viewed that property.
- The page has an indicator (see visual reference) that lets the user know that the property is active (has an open contract) or inactive (has a closed contract or no contract).
- If no contract exists for the property, it's clear to the user. It probably makes sense that this be close to the active/inactive indicator since they're related.
- Tabs are **Revenue · Bills · Contract · Messages** — desktop: top tabs (underline-active); mobile: a floating bottom bar (see visual reference).
- When a tab selection changes, the property header row directly below the tabs does not change — only the content below it.
- The header row has the property name with a secondary value (desktop = inline, mobile = below) of the neighborhood and city. To the far right is the current month — an informational label only; it does not scope the Bills tab or the ledger. See visual reference.
- Amounts render from each charge's `amount_minor` + `currency` (never a hardcoded `R$`); right-aligned with tabular-nums.
- All user-facing strings (tab labels, status labels, empty states) come from i18n keys (`messages/{en,es,pt-BR}.json`), never hardcoded — the filter bar's current EN literals included.
- Each tab has a clear empty state when it has no rows (e.g. no bills discovered yet for the property).
- The ledger streams behind a skeleton that structurally matches its rows (`loading.tsx` + per-section `SuspenseFadeIn`) so navigation feels instant with no layout shift.
- All client-side data is fetched with React Query — `useSuspenseQuery` hooks from `src/data/<domain>/client.ts`, prefetched server-side and hydrated via `HydrationBoundary`. No `useEffect`/`fetch` data fetching.
- On first visit (no stored selection), the default tab is **Revenue**.

## Open questions

- Dispute / source-document entry from a row — later phase.
- Viewer's share of Awaiting estimates — estimates aren't split today, so Awaiting stays
  property-level even in the share-primary strip. Revisit if charge definitions carry a
  default split.
- Final tooltip/banner copy (current strings are EN drafts; needs i18n keys + PT-BR).

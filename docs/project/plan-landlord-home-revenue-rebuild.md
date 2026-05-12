# Plan: Landlord home page — revenue-first rebuild

**Status:** Planning doc, ready to dispatch. Written 2026-05-11; all wizard phases (1, 2A/B/C, 3, 4) have since merged on `brandon/wizard-shell-and-contract-upload`. The wizard creates a property end-to-end; this rebuild updates the surface the user lands on afterward.
**Dispatch when:** ready now. No remaining wizard-phase dependency. Live UI iteration on the wizard's bank section + success-screen polish can run in parallel with this work since the files don't overlap.

## Parent context

- **`docs/project/product-pivot-long-term-rentals.md`** — the post-pivot product spec. The rent-first / passive-by-design / summary-first framing on the home page is a direct expression of those principles.
- **`docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md`** — defines the `rent` table shape the calculations consume (`amount_minor`, `currency`, `due_day_of_month`, `start_date`, `end_date`, `includes`). Canonical source for the rent schema; this plan reads from it but does not modify it.
- **`docs/project/deferred-decision-properties-units-collapse.md`** — open architectural question about whether `units` collapses into `properties`. If that lands BEFORE this rebuild, the per-property card and the data-fetcher paths simplify (one less join). The plan as written assumes the current dual-table shape; revisit the next-time checklist below if the decision flips.

---

## Why this work exists

The current home page (`/app`) and property detail page (`/p/[id]`) are pre-pivot artifacts. They were built around the statement model (draft → review → publish), which the post-pivot product replaces with a live billing view + monthly ledger. Phase 1 of property-creation deleted the `charge_type` enum and reworked the data layer to use `expense_type` + `amount_behavior`; that broke several queries the old detail page and statement pages depend on.

Rather than maintain the pre-pivot pages against the new schema, this plan rebuilds the home page around the post-pivot product principle — **rent first, expenses second** — and deletes the pre-pivot detail and statement pages outright.

## Scope

### Build

1. **Top-of-page portfolio summary** — two big numbers + an "ending soon" callout:
   - **Total earned** (across all properties, current calendar to date)
   - **Expected monthly** (sum of active rent across all properties)
   - Below: "X properties have leases ending in the next 60 days" — short, inline, only when the count is non-zero. Lists the property names.
2. **Per-property cards** — one per property the landlord owns:
   - Property name + formatted address
   - `property_type` as a small label
   - **Earned**: this property's contribution to lifetime earned. "—" if no active rent row.
   - **Expected monthly**: this property's `rent.amount_minor`. "—" if no rent row.
   - **Contract ends**: `rent.end_date` (or contract end date if surfaced separately). Visually emphasized when approaching the thresholds below.
   - **Not clickable.** The card is a portfolio-summary view, self-contained.

### Delete

3. **Pre-pivot property detail page** — `src/app/app/(main)/p/[id]/` and all its `sections/*` files.
4. **Statement pages** — `src/app/app/(focused)/p/[id]/s/[statementId]/` and friends.
5. **"What's next" widget** on the home page (or wherever it currently lives) — entire UI surface gone.
6. **Orphaned data layer** — `src/data/statements/` entirely; anything in `src/data/units/` that only existed to feed statement pages (audit pass required).
7. **i18n cleanup** — every key for deleted UI surfaces (`statement.*`, `whatsNext.*`, `propertyDetail.*` if applicable) removed across `messages/{en,es,pt-BR}.json`.

### Out of scope

- Tenant home view — separate workstream (when built, mirror this structure as `src/data/tenant-home/`).
- Payment matching / Open Finance integration — "Earned" is computed from rent × months elapsed, NOT from received payments. When Open Finance ships, this calculation gets replaced with actual receivables data. That's a follow-up.
- IPCA / contract adjustment history — current `rent.amount_minor` × months is an approximation. Precise reconstruction needs an adjustment-history table that doesn't exist yet. Acceptable for MVP; revisit when adjustment engine ships.
- Multi-currency rendering rules — MVP-BR means everything is BRL. Fetcher should bucket by currency so multi-currency lands cleanly later, but the UI assumes single-currency for v1.

## Layout

### Top section — portfolio summary

```
┌─────────────────────────────────────────────────────────┐
│  Total earned                  Expected monthly         │
│  R$ 42,000                     R$ 6,000                 │
│                                                         │
│  2 properties have leases ending in the next 60 days    │
│  Rua das Flores, 123 (Apt 101) · Avenida Sol, 500       │
└─────────────────────────────────────────────────────────┘
```

- Two big numbers side-by-side on desktop, stacked on mobile.
- "Ending soon" line only renders when count > 0. Hidden otherwise.

### Per-property card

```
┌────────────────────────────────────────────┐
│  Rua das Flores, 123 — Apt 101             │
│  Vila Madalena, São Paulo                  │
│  Apartment                                 │
│                                            │
│  Earned         R$ 18,000                  │
│  Monthly        R$ 3,000                   │
│  Ends           Mar 15, 2027               │
└────────────────────────────────────────────┘
```

- No hover effect, no chevron, no click. Card is informational.
- When `end_date` is within 60 days: emphasized treatment (suggested: warning-tone token or a subtle accent, exact treatment per `design-system`).
- When `end_date` is past: card surfaces "Lease ended" treatment; row no longer contributes to `monthly`.
- When `end_date` is null or more than 60 days out: standard treatment.

### Empty states

- **No properties at all**: existing empty state stays (with the "Create property" CTA). Don't redesign.
- **Property with no rent row** (no-contract path): `Earned: —` and `Monthly: —`. Card still renders the name/address/type.
- **Property with rent row but no `start_date`** (extraction failed to capture, or no-contract manual entry): `Earned: —`. Monthly still shows from `rent.amount_minor`.
- **Property with rent row, `start_date` in the future**: `Earned: —` (treat "not yet started" the same as "no contract"; only show a number when there's actually money to count). `Monthly` shows.

## Calculations

### Earned (per property)

```
earned_property = sum across the property's active rent rows of:
  months_elapsed(rent.start_date, min(now(), rent.end_date)) × rent.amount_minor
```

- `months_elapsed` counts completed months (don't pro-rate partial months for v1; precision isn't worth the complexity).
- If `rent.start_date IS NULL`: row contributes 0; whole property's `earned` falls to "—" when ALL rows are start-date-null.
- If `rent.start_date` is in the future: row contributes 0.
- If `rent.end_date IS NOT NULL` and is in the past: row contributes its full term, capped at `end_date`.
- If `rent.end_date IS NULL`: cap the upper bound at `now()`.

### Expected monthly (per property)

```
monthly_property = sum of rent.amount_minor across the property's active rent rows
  where start_date <= now() AND (end_date IS NULL OR end_date >= now())
```

Active = not deleted (`deleted_at IS NULL`) AND inside the date window (`start_date <= now() < end_date OR end_date IS NULL`).

If no active rent row exists, render "—".

### Portfolio totals

```
total_earned   = sum(earned_property) across the landlord's properties
total_monthly  = sum(monthly_property) across the landlord's properties
```

Currency-bucketed for the future, but the UI assumes single-currency for v1.

### Contract-ending thresholds

| Days until `rent.end_date` | Treatment |
|---|---|
| > 60 days, or null | Standard text token |
| 15–60 days | "Ending soon" emphasis (warning tone) |
| 0–14 days | Stronger emphasis (warning tone, increased weight — exact treatment per `design-system`) |
| Past `end_date` | Card surfaces the date and a "Lease ended" label; row no longer contributes to `monthly` |

The 60-day window aligns with the Brazilian lease renewal window and the natural IPCA-adjustment lead-time. The 0–14 day sub-tier reflects the higher pressure at the bottom of the renewal window. Tune from real-user telemetry after launch if needed.

### Approximation caveat

Current `rent.amount_minor` × months ignores mid-term IPCA adjustments. A 12-month-old contract that adjusted at month 6 would be slightly under-counted (the calculation uses the post-adjustment amount × all 12 months). For MVP this is acceptable — the adjustment engine ships later and replaces this calc with one that reads adjustment history.

## Data layer

### Module placement

`src/data/landlord-home/` — explicit naming to disambiguate from a future tenant home view (`src/data/tenant-home/`). The clunkiness pays for itself when role-specific home pages diverge.

Four-file split per project convention (see `frontend-patterns`):
- `shared.ts` — types, constants (thresholds), pure helpers (`monthsElapsed`, `endingSoonClass`)
- `server.ts` — `React.cache()`-wrapped server fetchers
- `client.ts` — any client-only helpers (none expected for v1)
- `actions/` — none expected for v1 (the home page is read-only)

### Fetchers

```ts
// shared.ts
export type LandlordHomeRevenueSummary = {
  total_earned_minor: Record<string /* currency */, number>
  total_monthly_minor: Record<string /* currency */, number>
  ending_soon: Array<{ property_id: string; property_name: string; end_date: string }>
}

export type LandlordHomePropertyCard = {
  property_id: string
  property_name: string
  property_address: PropertyAddress
  property_type: PropertyType | null
  earned_minor: number | null   // null means "—"
  monthly_minor: number | null  // null means "—"
  currency: string
  end_date: string | null
  end_state: 'far' | 'ending-soon' | 'ended' | 'none'
}

// server.ts (React.cache-wrapped)
export const getLandlordHomeRevenueSummary = cache(async (userId: string) => { ... })
export const getLandlordHomePropertyCards = cache(async (userId: string) => { ... })
```

Both queries scope to the landlord via `memberships` join on `role = 'landlord'`. The new `is_property_landlord(uuid)` / `is_unit_landlord(uuid)` SQL helpers from Phase 1 are also available if a per-row predicate reads cleaner than an explicit join. Two queries → two Suspense boundaries on the page so the summary streams in independently from the cards.

### SQL views vs TS fetchers

TS fetchers, not SQL views. Rationale:
- The 60-day end-date threshold (and any future sub-tier) is a constant that may tune post-launch. TS const change is one PR; SQL view change is a migration + types regen + PR.
- At MVP scale (single landlord, ~10s of properties), the perf gap between a view and a TS-side aggregation is sub-millisecond. Both paths hit the same indexes.
- The `getLandlordHomeRevenueSummary` query needs the "ending soon" list inline, which means joining `rent` + `properties` and filtering by date — easier to express in TS than in a `create view` statement that re-runs the date check on every read.

Promote to a SQL view later if perf telemetry justifies it.

### Indexes already in place (Phase 1)

- `rent (unit_id)` — for the per-unit rent lookup
- `units (property_id)` — for the per-property unit lookup
- `charge_definitions (unit_id)` — for the per-property expense count (if surfaced; not in v1 cards but might want later)

No new indexes anticipated.

## Deletions checklist

For the dispatched agent — these are deletions, not refactors:

- [ ] `src/app/app/(main)/p/[id]/page.tsx`
- [ ] `src/app/app/(main)/p/[id]/main-column.tsx`, `sidebar.tsx`, and any other top-level files
- [ ] `src/app/app/(main)/p/[id]/sections/` — entire directory (`charges-section.tsx`, `tenants-section.tsx`, `billing-summary-card*.tsx`, `unit-section.tsx`, `setup-progress-section.tsx`, etc.)
- [ ] `src/app/app/(focused)/p/[id]/s/[statementId]/` — entire directory (statement pages)
- [ ] `src/data/statements/` — entire directory (`shared.ts`, `server.ts`, `client.ts`, `actions/*`, `__tests__/*`)
- [ ] Audit `src/data/units/` and remove anything that only fed statement pages. Keep what the wizard / property-creation needs.
- [ ] Audit `src/data/properties/` and remove anything that only fed the deleted detail page. **Keep `create-property.ts` and `create-property-deprecated.ts`** — both are property-creation surfaces from the wizard's PR train, not detail-page artifacts.
- [ ] `src/components/charge-card.tsx`, `charge-config-sheet.tsx`, `add-charge-sheet.tsx` (and similar) — audit; delete if not used elsewhere.
- [ ] `messages/{en,es,pt-BR}.json` — remove keys for deleted UI. Run a grep after deletion to find orphans.
- [ ] Any "what's next" widget on the current home page — entire UI surface gone.
- [ ] **Success screen's "View property" CTA** at `src/app/app/(focused)/p/new/[draftId]/success-screen.tsx` — currently navigates to `/app/p/{property_id}`, which this work deletes. Repoint to `/app` (the home with the new property card) OR drop the CTA so the screen has a single "Go to dashboard" action. Either way, update the success screen + the i18n keys (`propertyCreation.success.cta.viewProperty`) in lockstep.

`pnpm typecheck` and `pnpm lint` are the safety net. Any import of a deleted module fails the build immediately — that's the point.

## Skills the dispatched agent must read

- `.claude/skills/component-library/` — what primitives to use. `Card`, `IconTile`, `Button`, `EyebrowLabel`. No new primitives.
- `.claude/skills/frontend-patterns/` — `React.cache()` server fetchers, per-section Suspense, `'use client'` at leaves, hook discipline.
- `.claude/skills/design-system/` — token usage, no raw color utilities, mobile-first, motion rules (no theatrical animation on the home page hero numbers).
- `.claude/skills/contract-management/` — copy direction for end-date framing and urgency tone.
- `frontend-design:frontend-design` — creative interface guidance for the summary numbers. The hero numbers are the centerpiece; this skill helps with confident, distinctive layout choices.
- `.claude/skills/data-modeling/` — money-model rule (minor + currency), country/currency posture.
- `.claude/skills/analytics/` — PostHog events on the home page (`landlord_home_viewed`, maybe `landlord_home_lease_ending_visible` for the "X properties ending soon" surface).

(Rules under `.claude/rules/` auto-load via CLAUDE.md's precedence hierarchy — no need to list them explicitly. The agent will pick up `security-lgpd.md` for RLS posture and the rest from the standard project context.)

## Open questions for revisit

1. **Currency display for multi-currency portfolio**. MVP is single-currency. When a landlord has properties in different currencies, the totals must bucket cleanly. Defer until it actually happens.
2. **PostHog instrumentation**: `landlord_home_viewed`, `landlord_home_lease_ending_visible`, anything else? Worth pinning before launch. Agent should ship these two and flag any additional events it sees value in.
3. **Empty-state copy when the landlord has no properties yet**: existing copy stays for now; can revisit after revenue-first redesign.

### Resolved (2026-05-11)

- **End-date threshold**: 60-day window with a 0–14 day sub-tier for stronger emphasis. Locked in the thresholds table above.
- **Earned for future-start rent**: render `—`, not `R$ 0`. Locked in the empty-states list above.

## Next-time checklist (for the agent that picks this up)

1. Re-read this doc + the source-of-truth materials it references.
2. Confirm Phase 2 has merged (or whatever later state is current) — the home page rebuild assumes the post-Phase-1 schema and the Phase 2 deliverables.
3. Brief includes the pause directive (per `feedback_pause_directive_on_agents` memory).
4. Brief lists the load-bearing decisions: deletion scope, calc edge cases, threshold constants, currency bucketing, "—" rendering rules.
5. Single sub-PR off `brandon/wizard-shell-and-contract-upload` (or wherever the wizard branch tip is at dispatch time). Targets that branch, not main.
6. Agent reports back with: files deleted, files created, telemetry events added, the pre-launch thresholds chosen, any UI decisions that surprised them.

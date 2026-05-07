# Expenses Checkout — Task Order

**Date:** 2026-05-07
**Companion to:** [`2026-05-06-expenses-checkout-architecture-guideposts.md`](./2026-05-06-expenses-checkout-architecture-guideposts.md)

This document only orders the work. Every task's *what* and *why* lives in the guideposts doc; refer to it for detail before implementing each task.

UI is built first against draft/inline types. Within the UI phase, we start with the value-statement, then scaffold the manual-add flow end-to-end, then nail down list/row and provider-picker UX. State plumbing and schema work follow to make the UI real.

---

## Skills to invoke

Invoke the relevant skills before each phase:

- **Phase 1 (UI):** `design-system`, `component-library`, `frontend-patterns`, `analytics`.
- **Phase 2 (state):** `frontend-patterns`, `testing`.
- **Phase 3 (schema):** `data-modeling`, `billing-automation`, `testing`.

Also invoke `superpowers:brainstorming` before designing any UI surface that doesn't already have a wireframe.

---

## Phase 1A — Empty / value state

1. **"Why this matters" section** — value statement, explanatory copy, primary "Add expense" CTA. Follows the Tax ID / Tenants empty-state patterns.

## Phase 1B — Manual add scaffolding

2. **"Add expense" entry point** from the empty state.
3. **Add/edit form skeleton** — type selector with amount-behavior default, optional amount field, save action. No provider picker yet.
4. **Render added expenses as a basic list** backed by local UI state.

## Phase 1C — Expense list, rows, and provider UX

5. **Expense list / row visual treatment** — support-status hints, edit affordance, bundled-row appearance.
6. **Provider picker UI** — DB-backed search of real providers/profiles + existing requests, honest status labels, "I don't see my provider" entry point. Provider data may be mocked at this phase.
7. **Missing-provider flow UI** — bill-first primary path, manual fallback, mandatory existing-request match step in both. Bill-draft persistence is stubbed; finalized in Phase 2.
8. **Bundled-row UI** — mark a row as bundled into rent or another expense; satisfies the 3-state constraint without a provider.
9. **Summary row / collapsed-section state** for the accordion and the desktop summary panel.

## Phase 2 — Checkout state plumbing

10. **Checkout-local expense row schema** (`expense-row-schema.ts`) — codifies whatever shape Phase 1 converged on.
11. **`expenses` slice in `defaultSectionData()`** and extraction seeding in `mergeExtractionIntoSectionData()`.
12. **Audit existing contract-upload IndexedDB pattern** and extend it for provider-request bill drafts. Replaces the Phase 1C stub.

## Phase 3 — Schema foundation

13. **Pre-implementation gate:** confirm `charge_definitions` is empty/disposable in the linked Supabase. If real rows exist, stop and revisit before proceeding.
14. **Enums and provider-profile alignment.** Create `expense_amount_behavior`. Align `provider_invoice_profiles.category` with `expense_type`. Add missing values (e.g., `insurance`).
15. **`charge_definitions` migration.** Add `expense_type`, `amount_behavior`, `provider_profile_id`, `provider_request_id`, `bundled_into_rent`, `bundled_into_charge_id`. Add the 3-state check constraint. Drop `charge_type`.
16. **Audit and migrate TS readers of `charge_type`** to use `expense_type` / `amount_behavior` / bundling fields. Same PR as task 15.
17. **Canonical `src/schemas/expense.ts`** domain schema using the new enums, used at the create-property boundary.

## Out of scope (handed off)

- Completion resolver and `/eng/requests` UI → provider-request / eng plan.
- Rent + contract tables, contract storage, save-property RPC, success screen, IndexedDB cleanup, skipped-section visual treatment → create-property plan.

See the guideposts doc for the full ownership split.

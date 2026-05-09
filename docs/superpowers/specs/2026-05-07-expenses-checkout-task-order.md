# Expenses Checkout — Task Order

**Date:** 2026-05-07
**Companion:** [`2026-05-06-expenses-checkout-architecture-guideposts.md`](./2026-05-06-expenses-checkout-architecture-guideposts.md) (the *what / why* — refer before implementing each task).

UI is built first against draft/inline types: value statement → manual-add scaffold → list/row + provider UX. State plumbing and schema work follow.

Branch: `brandon/wizard-shell-and-contract-upload`. PR/branch-rename/CHANGELOG deferred per user.

---

## Status (as of 2026-05-09)

**Done:**

- ✅ **Phase 1A task 1** — empty-state value statement (`ExplainerCard`).
- ✅ **Phase 1B tasks 2–4** — entry point, form skeleton, basic list (type selector, amount-behavior selector, accordion rows, animated add/remove).
- ✅ **Phase 1C task 5** — row support-status hints (Needs Attention badge gated on `isTouched || !isValid`).
- ✅ **Phase 1C task 9** — summary row / collapsed-section state for expenses + rent-dates. Section-level invalid state wired everywhere.
- ✅ **Phase 2 task 10** — checkout-local `expenseRowSchema` (Zod) at `sections/expenses/schemas.ts`.
- ✅ **Phase 2 task 11** — `expenses` slice in `defaultSectionData()` + `expenseRowFromContractExpense` extraction seeding (drops bundled until task 8).
- ✅ Tenant section accordion migration. Single-active mode is canonical (the dual-mode `'all-expanded'` was dropped — see code-review #8 below).
- ✅ Architectural pivot: touched-state lives in Zustand, accessed via `useWizardForm`; per-section state knowledge colocated in `sections/<id>/state.ts` + `validation.ts`; `Section` primitive accepts `onFirstVisit` / `onLeave` callbacks.

**Outstanding:**

- **Phase 1C task 6** — Provider picker UI (DB-backed search, status labels, "I don't see my provider" entry point; provider data may be mocked).
- **Phase 1C task 7** — Missing-provider flow UI (bill-first primary, manual fallback, mandatory existing-request match).
- **Phase 1C task 8** — Bundled-row UI (3-state constraint without a provider). Schema additions required.
- Wire "provider status" branch into the row's `Section.Status` once task 6 lands.
- **Phase 2 task 12** — Audit IndexedDB pattern; extend for provider-request bill drafts. Depends on task 7.
- **Phase 3** — Schema foundation. All unstarted.
- Centralize expense-type icon mapping (deferred — natural moment is Phase 3's `charge_type` → `expense_type` migration).

---

## Phase 1C — remaining

6. **Provider picker UI** — DB-backed search of real providers/profiles + existing requests, honest status labels, "I don't see my provider" entry point.
7. **Missing-provider flow UI** — bill-first primary path, manual fallback, mandatory existing-request match step in both. Bill-draft persistence stubbed; finalized in Phase 2.
8. **Bundled-row UI** — mark a row as bundled into rent or another expense.

## Phase 2 — remaining

12. Audit existing contract-upload IndexedDB pattern; extend for provider-request bill drafts.

## Phase 3 — Schema foundation

13. **Pre-implementation gate:** confirm `charge_definitions` is empty/disposable in the linked Supabase. Stop and revisit if real rows exist.
14. **Enums + provider-profile alignment.** Create `expense_amount_behavior`. Align `provider_invoice_profiles.category` with `expense_type`. Add missing values (e.g. `insurance`).
15. **`charge_definitions` migration.** Add `expense_type`, `amount_behavior`, `provider_profile_id`, `provider_request_id`, `bundled_into_rent`, `bundled_into_charge_id`. 3-state check constraint. Drop `charge_type`.
16. **Migrate TS readers of `charge_type`** to `expense_type` / `amount_behavior` / bundling fields. Same PR as #15.
17. **Canonical `src/schemas/expense.ts`** domain schema using the new enums. Used at the create-property RPC boundary.

## Out of scope

- Completion resolver and `/eng/requests` UI → provider-request / eng plan.
- Rent + contract tables, contract storage, save-property RPC, success screen, IndexedDB cleanup, skipped-section visual treatment → create-property plan.

---

## Code review (2026-05-09) — addressed

Three parallel `superpowers:code-reviewer` subagents reviewed the diff against `main`. **All 30 items addressed:**

- **#1, #14, #4** — `hasWizardWork` bug fix (off the render path); `useDelayedRemoval` mounted-ref guard; `useWizardForm` contract tests.
- **#5, #6, #17, #22** — Validation cache via `WeakMap<slice, result>` per section (`sections/<id>/validation.ts`); `flushSync` removed in favor of effect-based focus; per-row + section-level redundant `safeParse` collapsed to one parse per slice change. `useWizardForm` later unified to read from the same cache (one parse total per active form).
- **#7, #11, #18, #30** — Sections restructured into `sections/<id>/` (UI + `schemas.ts` + `state.ts` + `validation.ts`); unified `<NAME>_FIELD_NAMES` exports; `Section` primitive inverted to `onFirstVisit` / `onLeave` callbacks; `state ↔ steps/checkout` cycle eliminated.
- **#8** — Dropped `tenantsListUI` `'all-expanded'` mode. Single-active is canonical; first extracted tenant seeded as `activeTenantId`.
- **#9, #10, #12, #13, #15, #20, #21** — Store action tests; `tax-id-schema` tests; List-UI updater short-circuits; `every`-membership instead of size-equality; `captureEvent` extracted to `lib/analytics/`; `FALLBACK_ROW` constants removed via `useWizardForm` refactor.
- **#19** — `text-xs` revisited per user UI feedback. Row primary stays `text-sm`; secondary is `text-xs`; trailing status hints `text-xs` (variant on `RowTrailingStatus`).
- **#23, #24, #25, #26, #27** — `ExplainerCardList` + `ExplainerCardListItem` extracted; `AutoFilledIcon` (visual primitive) split from `AutoFilledIndicator`; `RowTrailingStatus` extracted; decorative comment dividers removed; planning prose tightened.
- **#28** — `docs/project/components.md` + skill files updated for the new primitives, variants, and tokens.
- **#2** — `PropertySection` BR-hardcoded validator left as-is (BR-only is acceptable for now).
- **#3** — `seedTaxIdFromProfileIfMissing` race left as-is per user.

**#29 (CHANGELOG entry) deferred per user.**

### User-driven follow-ups (not in original review)

- Click target now covers the full collapsed section card (padding moved off `AccordionPrimitive.Item` onto `Trigger` / `Body`).
- Date picker `bg` matches sibling inputs in light + dark (added `card`/`page` variants to `InputGroup` + `IsoDatePicker`).
- Animation chain: section open/close (1) enforced single-active behavior was already correct — base-ui detection bailed when both `animation-name` and `transition-duration` were set on the Panel, so `--accordion-panel-height` stayed `auto` and panels never collapsed; (2) `[overflow-anchor:none]` on the scroll container to stop Chrome scroll-anchoring fighting the height animation; (3) `AccordionItem`'s entrance animation made opt-in (`animateEntrance`, default `false`) — only newly-added rows fade in, since auto-entrance broke parent `scrollHeight` measurement.
- Summary card rows are now clickable: open the section + scroll into view (locked-upcoming sections remain inert).

### Test count

- Session start: 253 tests
- Session end: 341 tests (+88)
- Coverage added: `useWizardForm`, `derivations.hasWizardWork`, `tax-id-schema`, `defaultSectionTouched` dispatcher, store actions (incl. load-bearing referential-equality short-circuits on `setTouched` / `markSectionVisited`), per-section `state.ts` (`setAllTouched` short-circuit + `isDefault`), `validation.ts` cache per section.
- One gap remains: list-mode "remove active row clears `active*Id`" — would need component-level integration; logic lives in `handleRemove` callbacks, not store actions.

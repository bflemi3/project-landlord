# Deferred decision: collapse `units` into `properties`?

**Status:** Deferred 2026-05-11. Revisit after MVP property-creation feature ships.
**Reason for deferral:** Need to ship the property-creation feature. Restructuring now would rewrite the in-flight Phase 1 work (PR #20: 11 migrations, unit-scoped `contracts` + `rent` + `is_unit_landlord`, ~30 TS files refactored). Returning to this question is a focused effort once the feature is live.

---

## The question

Should we keep the two-level `properties` → `units` data model, or collapse `units` entirely so that the user-facing rental unit IS the property?

The mental model "one property = one rentable thing" matches MVP today. The schema-level split adds complexity that isn't paying for itself in the MVP.

## What lives where today (post-Phase 1)

| Concept | Lives on | Why |
|---|---|---|
| Physical asset (address, country, property type, name) | `properties` | The building |
| Rentable subdivision (name, PIX key, currency) | `units` | What's actually rented within the building |
| Rent (amount, due day, adjustment, includes) | `rent` (FK to `units`) | Per-tenancy |
| Contract (lease document + extraction) | `contracts` (FK to `units`) | Per-tenancy |
| Expenses (utilities, condo, etc.) | `charge_definitions` (FK to `units`) | Per-tenancy |
| Statements | `statements` (FK to `units`) | Per-tenancy — also slated for removal post-pivot |
| Source documents (bills) | `source_documents` (FK to `units`) | Per-tenancy |
| Tenant invitations | `invitations` (FK to `units`) | Per-tenancy |
| Tenant memberships | `memberships` (FK to `units`) | Per-tenancy (tenants are unit-scoped) |
| Landlord memberships | `memberships` (FK to `properties`, `unit_id IS NULL`) | Whole-property access |

## The three options

### Option A — Full collapse (drop `units` entirely)

Every former unit-scoped FK re-points to `properties.id`. `units` table dropped. Helpers `is_unit_member` / `is_unit_landlord` removed; callers re-pointed to `is_property_*`. Contract Storage path becomes `{property_id}/{contract_id}.<ext>`.

**Effort:** 6–10 engineering days.

**Touch surface:**
- ~14 migrations affected (new forward-only migrations partially reverting earlier shape)
- 21+ RLS policies to rewrite
- ~10 TS data modules + 10 test files
- The entire Phase 1 `create_property` RPC + `contracts` + `rent` table designs need rewriting
- Spec rewrite of the property-creation persistence design (~1700 lines, units-bound throughout)
- Generated DB types regenerated
- i18n strings (the wizard ships translated "unit" strings in EN/ES/PT-BR)

**Lost capability:**
- A 4-apartment building owned by one landlord with 4 separate tenancies at different rents
- Per-unit RLS for tenants (today's "tenant on apt 2A can't see apt 2B's data" is a one-line policy)
- Per-unit invites

**Why pick this:** maximally simple schema if you're certain multi-unit will never ship.

### Option B — Keep `units` 1:1 as internal — *the agent's recommended option*

Schema stays as-is. `units` table remains for FK stability and multi-unit-future readiness. Remove the user-facing "unit" concept from the wizard (the `unit-section.tsx` "multi-unit header" gated on `unit_ids.length > 1` is dead UI in MVP anyway). Internally, the project can adopt a convention: new code uses `property_id` plus a thin shim where needed.

**Effort:** 1–2 days. Mostly i18n string changes (3 locales) + wizard step rename + drop `unit-section.tsx`'s dead-code header.

**Lost capability:** none — schema is preserved.

**Why pick this:** the schema-level complexity cost has been paid once (Phase 1). The user-facing complaint ("'unit' wording is confusing in a 1:1 world") is solved at the i18n + wizard wording layer, not by a schema refactor. If multi-unit ever ships, the schema is ready — zero rework.

### Option C — Defer entirely

Accept the dual-table shape. No work. Ship MVP. Revisit when multi-unit roadmap is clearer.

**Effort:** 0 days.

**Why pick this:** any open Phase 1 work is in flight; the schema's complexity cost has been paid once; paying to undo it now duplicates the cost.

## Field-level mapping if we ever go with Option A

For each column on `units` today, where it would live under the flattened model:

| Field | Type | Today | Flattened home | Notes |
|---|---|---|---|---|
| `id` | uuid PK | `units` | dropped | FKs re-point to `properties.id` |
| `property_id` | uuid FK | `units` | dropped | 1:1 implicit |
| `name` | text | `units` | drop, OR `properties.unit_name` | Today defaults to property name in RPC — vestigial |
| `due_day_of_month` | int | already moved to `rent` in Phase 1 | n/a | No action |
| `pix_key` | text | `units` | move to `rent` or `contracts` (per-tenancy) | Per-tenancy is the right home |
| `pix_key_type` | enum | `units` | pairs with `pix_key` | Same |
| `currency` | text | `units` | move to `properties` OR keep on `rent` | `rent.currency` already exists; mostly moot |
| `complement` (proposed — not landed) | text | discussed for `units` | move to `properties` | Becomes property field again under flat model |
| timestamps | | `units` | absorbed by `properties` lifecycle | None |

After Phase 1 lands, the only column unique to `units` is `name` — and it autopopulates to the property name.

## FK simplification under Option A

| Today | Under collapse |
|---|---|
| `charge_definitions → units → memberships` (3-table join in RLS) | `charge_definitions → memberships` (2-table) |
| `statements → units → memberships` | `statements → memberships` |
| `source_documents → units → memberships` | `source_documents → memberships` |
| `contracts → units → memberships` (Phase 1) | `contracts → memberships` |
| `rent → units → memberships` (Phase 1) | `rent → memberships` |
| `invitations.unit_id` (per-unit invite identity) | dropped — loses "invite to apt 2A" specificity |
| `memberships.unit_id` (nullable; tenants set, landlords null) | dropped — loses per-unit tenant RLS; restore `(user_id, property_id)` unique |

## RPC impact under Option A

| RPC | Impact |
|---|---|
| `create_property` (Phase 1) | Unit-insert step disappears; subsequent inserts (contract, rent, charge_definitions, invitations) re-target FK to `p_property_id`. Net simplification. |
| `redeem_invite` | Drop `unit_id` from invitation read; conflict target reverts to `(user_id, property_id)`. Cleanup-friendly. |
| `is_unit_member` / `is_unit_landlord` | Removed; callers re-pointed to `is_property_*`. |
| Contracts Storage RLS | Object key changes from `{unit_id}/{contract_id}.<ext>` to `{property_id}/{contract_id}.<ext>`; helpers re-pointed. |

## User-facing "unit" surface today

- `messages/en.json` / `messages/es.json` / `messages/pt-BR.json` ship strings: `viewAllUnits`, `units` (plural), `nameYourUnits`, `unitsExplanation` ("A unit is an individual rental space..."), `singleUnit`, `unitName`, `addAnotherUnit`, `setupCompleteMessage` with `unitCount`.
- `unit-section.tsx` renders the unit header only when `property.unit_ids.length > 1` — **never true in MVP**, so users almost never see "unit" wording today.

This is why the wording problem is cosmetic and solvable at the i18n layer, not a schema problem.

## The question that picks the option

Is multi-unit (a 4-apartment building owned by one landlord with 4 separate tenancies at different rents) genuinely on the roadmap?

- **Likely / probably** → **B**. Schema is ready. Hide "unit" from users. Cost: 1–2 days.
- **Definitely never** → **A**. Pay the cost now. Cost: 6–10 days.
- **Don't know yet** → **C** (= B without the i18n cleanup). Ship and revisit.

## Recommendation when revisited

**Option B** unless multi-unit is definitively off the roadmap. The schema cost has been paid; the user-facing complaint is solvable at the wording layer; the future-flexibility option preserves cheaply.

**Option A** only justifies its cost if multi-unit will *never* ship — a stronger claim than "MVP doesn't need it."

## Adjacent decisions tied to this one

- **`complement` field placement.** Currently on `properties`. Should logically live on `units` (per-apartment identifier). Resolution:
  - Under Option A: complement moves to `properties` (it's already there — no change).
  - Under Option B: complement moves to `units` as part of the cleanup pass; wizard routes the value to the unit payload, persistence does the right thing.
  - Under Option C: deferred along with this whole question.
- **Statement pages cleanup.** The pre-pivot statement concept (`statements` table, `/app/(focused)/p/[id]/s/[statementId]/*` pages, `src/data/statements/`) is being replaced by `monthly_ledger` + live billing view per the data-modeling skill. When this decision is revisited, the agent doing the work should also delete the statement pages outright rather than maintain them — they're scheduled for removal regardless of how the property/unit question resolves.

## Next-time checklist (for the agent that picks this up)

1. Re-read this doc; reconfirm the multi-unit roadmap stance with the owner.
2. Pick the option (A / B / C). Document the choice and reasoning at the top of this file.
3. If Option A: brief a dedicated migration agent. Scope includes:
   - Schema migrations (additive then destructive in stages)
   - RLS rewrite (21+ policies)
   - RPC rewrite (`create_property`, `redeem_invite`)
   - TS layer refactor + types regen
   - Spec rewrite (persistence spec is ~1700 lines, heavily units-bound)
   - Statement page deletion (folded in as separate task)
   - i18n string updates (3 locales)
4. If Option B: brief a smaller agent. Scope:
   - i18n string review (decide what "unit" wording to remove vs reword)
   - Wizard step rename
   - Drop `unit-section.tsx` dead-code header
   - Move `complement` from `properties` to `units` (small migration + RPC update + wizard payload routing)
   - Statement page deletion (folded in as separate task)
5. If Option C: nothing to do; revisit again when multi-unit roadmap clears.

## Source of this analysis

Research agent dispatched 2026-05-11, given the question "what's the rigor / cost / scope of removing `units` entirely?" Report covered usage map, field placement, FK rewrites, RPC impact, RLS impact, and a migration sketch. Full conclusions reflected above.

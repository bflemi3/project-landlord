# Property Creation Persistence — Final Submit, RPC, and Migrations

**Date:** 2026-05-08
**Scope:** The final boundary that turns property creation wizard draft state into permanent product records. Owns the transactional Postgres RPC, the server action that orchestrates Storage and DB writes, the database migrations needed for full submit, the Zod validation contract, idempotency behavior, error surfacing, and post-success navigation.

**Companion specs:**

- `2026-04-16-property-creation-design.md` — wizard flow, contract extraction, overall product shape
- `2026-04-22-property-checkout-shell-design.md` — accordion shell, section states, "Create property" UX
- `2026-05-06-expenses-checkout-architecture-guideposts.md` — expense data model and provider-request handling
- `2026-05-07-expenses-checkout-task-order.md` — phased expenses workstream

---

## Context

The wizard collects property setup data across six accordion sections (property, rent & dates, tenants, expenses, tax id, bank account). Until the user presses **Create property**, everything lives in a versioned IndexedDB-backed Zustand store keyed by `propertyCreationWizardKey(draftId)`, with the contract file held as a `Blob` on the store.

This spec defines what happens when the user presses that button — the bridge from wizard draft state to permanent records. It does *not* re-specify the wizard's accordion UI, the section forms, or the extraction pipeline. It does specify the new success screen, since creating a property terminates there.

The current `create_property_with_membership` RPC creates a property and a landlord membership. That is the floor; this spec replaces it with a single transactional RPC that persists property, units, contract row, rent, tenant invitations, expense charge definitions, provider requests (with cross-property dedupe), provider test bills, profile tax id update, and audit events together — and ships every migration that RPC depends on.

## Implementation contract (normative for parallel work)

This block is the **merge gate** for split workstreams (database, canonical Zod, server action, wizard store, success UI). Use it as the paste target for agent briefs.

**If anything here disagrees with a later section of this document, reconcile by updating this block first, then the detailed sections below.**

### Precedence

1. This **Implementation contract** — interface freeze for parallel PRs.
2. The remainder of this spec — full behavior, SQL, RLS, copy, testing.
3. The codebase — only where the spec is silent.

### Recommended merge order

1. **Database** — migrations in topological order (*Migration ordering (topological)*), including `create_property` RPC, `contracts` Storage bucket + RLS.
2. **Generated types** — `pnpm supabase gen types --local`; commit the updated Supabase TypeScript types (e.g. `src/lib/types/database.ts`).
3. **Canonical Zod** — `src/schemas/*`, composed `propertyCreationSubmissionSchema` (or equivalent).
4. **Server action** — `createProperty` (*Server Action Contract*): validate, call RPC, Storage uploads, emails, `revalidatePath`, map failures to `ServerErrorsResponse`. (Earlier drafts of this spec called it `submitPropertyCreation`; renamed to match the codebase's verb-noun action convention. The original FormData-based `createProperty` was moved to `create-property-deprecated.ts` as `createPropertyDeprecated`.)
5. **Wizard** — persisted `sectionServerErrors` / `globalErrors`, `dispatchServerErrorsResponse`, per-section reads and clears (*Error wiring on the frontend*).
6. **Success screen** — may start earlier against a mocked `summary` if the `SubmitSummary` shape below is stable.
7. **Integration** — wire **Create property** to the action; one happy-path verification.

Steps 3–6 may overlap only after the error envelope and RPC/action identifiers here are stable; step 2 should land before step 4 unless types are stubbed deliberately.

### TypeScript wire shapes

Logical shapes only — concrete modules may split or re-export. Per-field values in `FlatFieldErrors` / row maps are **i18n message keys**, not user-visible strings.

```ts
// Accordion sections — canonical source: `src/app/app/(focused)/p/new/[draftId]/state/registry.ts` (`SectionId` export).
type SectionId =
  | 'property'
  | 'rent-dates'
  | 'tenants'
  | 'expenses'
  | 'tax-id'
  | 'bank'

// Mirrors `z.flattenError(error).fieldErrors` for one form scope.
type FlatFieldErrors = Record<string, string[]>

// Single-form section: `FlatFieldErrors`. Row sections (expenses, tenants): keyed by stable row `id`.
type SectionServerErrors = FlatFieldErrors | Record<string, FlatFieldErrors>

type GlobalError = {
  code:
    | 'unauthenticated'
    | 'idempotency_owner_mismatch'
    | 'rpc_constraint_violation'
    | 'unknown'
}

/** RPC *Return shape* JSON + post-RPC upload/email flags (*Server Action Contract* § Flow step 9). Replace `any` in implementation with generated RPC types + extension. */
type SubmitSummary = any

type ServerErrorsResponse =
  | { ok: true; summary: SubmitSummary }
  | {
      ok: false
      sectionErrors?: Partial<Record<SectionId, SectionServerErrors>>
      globalErrors?: GlobalError[]
    }
```

Declare a real `SubmitSummary` in application code (`create-property.ts` or a colocated `types.ts`) by intersecting the generated RPC return type with the three extension fields from *Server Action Contract* § Flow step 9 (`contract.upload_failed`, `provider_requests.bill_upload_failed_count`, `tenants.email_failed_count` — exact nesting per that section and *Success Behavior*).

**Per-section continue actions** (e.g. validate before Continue) use the same **failure** shape (`ok: false`, `sectionErrors?`, `globalErrors?`). On success they return **`{ ok: true }` only** (no `summary`). The **submit** action returns `{ ok: true; summary: SubmitSummary }` on success. Optionally model both as one discriminated union in TS with `summary?` optional when `ok: true`.

On `{ ok: false }` from a **continue** action, expect **at most one** `sectionErrors` key unless a deliberate follow-up widens that. **Submit** may return multiple section keys when validation fails across the composed schema.

### RPC and server action (frozen identifiers)

| Artifact | Identifier / path |
|----------|-------------------|
| Transactional RPC | `create_property` — `SECURITY DEFINER`, `set search_path = public`; `p_property_id uuid` = wizard `draftId` |
| Server action | `createProperty` → `src/data/properties/actions/create-property.ts` |
| Typed error catalogue | `src/data/properties/actions/create-property-errors.ts`; i18n under `propertyCreation.errors.*` |

Full payloads and behavior: *RPC Contract* and *Server Action Contract*.

### Wizard store (server errors)

| State / action | Role |
|----------------|------|
| `sectionServerErrors` | `Record<SectionId, SectionServerErrors>` — persisted |
| `globalErrors` | `GlobalError[]` — persisted |
| `dispatchServerErrorsResponse` | Cross-section dispatcher at `state/server-errors-dispatch.ts`. On `ok: false`, **replace** each listed section slice and add those `SectionId` keys to `visitedSectionIds`. On `ok: true`, only clear `globalErrors` (section slices are owned by their caller). |
| `clearFieldServerError` | Flat section — clear one field on edit |
| `clearRowServerErrors` / `clearRowFieldServerError` | Row section — clear on row delete / field edit |

Full pattern: *Error wiring on the frontend* (*Server Action Contract*).

### First accordion section to open on `{ ok: false }`

Use **`CHECKOUT_SECTIONS` order** in `state/registry.ts`: `property` → `rent-dates` → `tenants` → `expenses` → `tax-id` → `bank`. Open the first `SectionId` whose entry in `sectionErrors` is non-empty. If only `globalErrors` is set, surface a destructive toast and do not rely on accordion focus for resolution.

Step 1 (contract file) validation is **not** an accordion `SectionId`; handle it via the step-1 surface or `globalErrors` as described in the server action and checkout shell specs.

---

## Out Of Scope

- **Bank account section.** Open Finance bank connection is deferred. The Bank account section becomes a coming-soon informational card with no persistence side effects.
- **Provider-request engineering review surface.** This spec creates the `provider_requests` table so the RPC can write to it; the eng queue UI, resolver, and triage heuristics are owned by the provider-request workstream.
- **Editing properties after creation.** Owned by the property detail / settings flows.
- **Wizard UI changes** beyond the redirect-after-success behavior, the new persisted server-errors slice in the store (which also subsumes today's locally-held continue-action errors for wizard sections), and the new success screen described below.
- **Rent + IPCA adjustment scheduling logic.** This spec persists rent rows; the adjustment engine that computes future rent values is later work.
- **Provider matching / fuzzy search algorithm.** The RPC accepts the resolved `provider_profile_id` or `provider_request_id` selected by the wizard UI — it does not match. Cross-*request* dedupe is handled (see *Provider Requests Handling*); cross-*provider* matching at submit time is not.
- **In-wizard mandatory existing-request match step.** The Expenses guidepost specified a UI step that forces the landlord to match against existing requests before creating a new one. That step is not being built now — providers are optional in the expense form for the first cut. The RPC still dedupes cross-property at submit time so abandoned requests don't multiply.

---

## Code Audit

### What exists today

| Asset | Location | State |
|---|---|---|
| `properties` table | `20260318120000_data_model_foundation.sql` | Address columns, `country_code`, `created_by`, `property_type` (added `20260430120000`) |
| `units` table | foundation | One unit per property in current usage; has `due_day_of_month` and `currency` |
| `memberships` table | foundation | `(user_id, property_id, role)` unique |
| `invitations` table | foundation + later patches | Has `property_id`, `unit_id`, `invited_email`, `invited_name`, `role`, `status`, `code`, `source`, `invited_by`, `expires_at`, `accepted_at`, `accepted_by`. **Does not** have `last_emailed_at` or `tax_id` — both added by this spec. |
| `invitation_status` enum | foundation | `pending`, `accepted`, `expired`, `cancelled` |
| `generateInviteCode()` | `src/data/invitations/generate-invite-code.ts` | TS helper used by `sendInvite`; reusable from the new RPC's TS wrapper |
| `redeem_invite` RPC | `20260420154115_redeem_invite_rpc.sql` | Atomic redemption flow. RPC must produce invitations the redemption flow accepts. |
| `charge_definitions` table | foundation | Uses old `charge_type` enum + has a legacy `provider_id uuid` column. Both replaced by this spec. |
| `expense_type` enum | `20260417120100_expense_type_enum.sql` | Created but not yet attached to `charge_definitions`. **Missing `insurance`** — wizard already references it; this spec adds it. |
| `property_type` enum + column | `20260417120000`, `20260430120000` | Live |
| `audit_log_trigger()` + `audit_events` | `20260331120000_audit_triggers_and_allocation_delete.sql` | Reusable for new tables |
| `is_property_member()`, `is_property_landlord()` | foundation | RLS helpers |
| `create_property_with_membership` RPC | `20260404120100_property_rpc_due_day.sql` (latest definition) | Creates property + membership + 1 unit. Single-section. |
| `createProperty` server action | `src/data/properties/actions/create-property.ts` | FormData-based, single section, returns `{ success, propertyId, unitId, errors }` |
| `provider_test_bills` table + `test-bills` bucket | `20260413120500`, `20260415120000` | Live. Has `provider_id`, `profile_id`, `storage_path`, `mime_type` (defaults to `application/pdf`), `uploaded_by`, `source`. Spec extends with `provider_request_id`, `upload_status`, broader mime types. |
| Wizard checkout-local expense schemas | `src/app/app/(focused)/p/new/[draftId]/steps/checkout/sections/expenses/schemas.ts` | Declares `EXPENSE_TYPES`, `EXPENSE_AMOUNT_BEHAVIORS`, `expenseRowSchema`. Refactor target. |
| `propertyInputSchema` (Zod) | `src/schemas/property.ts` | Property-section only; country-aware address |
| `tenantInputSchema` (Zod) | `src/schemas/tenant.ts` | Exists |
| `taxIdInputSchema` (Zod) | `src/schemas/tax-id.ts` | Exists |
| Wizard store | `src/app/app/(focused)/p/new/[draftId]/state/store.ts` | Holds full section data + contract `File` Blob |
| `draftId` generation | `src/app/app/(focused)/p/new/page.tsx` | `crypto.randomUUID()` → redirect to `/p/new/[draftId]` |
| Storage buckets | foundation | `source-documents`, `payment-receipts`, `example-documents` only |

### What is missing

The implementation plan must add:

- A `contracts` table (unit-scoped, FK to `units`) with extraction storage (extraction stored as JSONB columns on the contract row — see *Extraction Storage* below)
- A `rent` table (unit-scoped, FK to `units`). Rent currently leaks into `charge_definitions` with `charge_type='rent'`, which the post-pivot model rejects. `due_day_of_month` moves from `units` to `rent`.
- An `is_unit_landlord(uuid)` SQL helper alongside the existing `is_property_member` / `is_property_landlord` / `is_unit_member`. Required by the unit-scoped `contracts` and `rent` RLS, and the contracts Storage bucket policies. Joins through `units` so it works regardless of whether the landlord-membership row has `unit_id IS NULL` (the insertion convention from this point forward) or has a specific `unit_id` set (older landlord rows that picked up a `unit_id` from the `20260327120000_memberships_unit_id.sql` backfill).
- A `provider_requests` table
- A `contracts` Storage bucket + bucket RLS
- A `provider_request_id uuid` column on `provider_test_bills` so request-tied bill uploads can be linked
- An `invitation_status = 'not_invited'` enum value (per shell spec; lets the landlord defer the email)
- An `invitations.tax_id text` column (per shell spec; pre-fills tenant signup)
- An `invitations.last_emailed_at timestamptz` column for email-send idempotency on retry / replay
- An `insurance` value added to the `expense_type` enum so the wizard's existing `EXPENSE_TYPES` literal can persist
- A `properties` row-level idempotency posture: `id` becomes the wizard's `draftId` rather than a server-generated UUID (no extra column needed — see *Idempotency*)
- The `charge_definitions` schema changes that the Expenses guidepost previously assigned to its Phase 3 (drop `charge_type` AND legacy `provider_id`, add `expense_type`, `amount_behavior`, `provider_profile_id`, `provider_request_id`, `bundled_into_rent`, `bundled_into_charge_id`). **Provider attachment is optional**, not required (see *Charge Definitions* below).
- A new `expense_amount_behavior` enum (`fixed`, `variable`, `unknown`) per the Expenses guidepost
- Canonical `src/schemas/expense.ts`, `src/schemas/rent.ts`, `src/schemas/contract.ts` (each new — none exist today)
- Refactor of the wizard's checkout-local `steps/checkout/sections/expenses/schemas.ts` to derive its types from `src/schemas/expense.ts` instead of redeclaring `EXPENSE_TYPES`, `EXPENSE_AMOUNT_BEHAVIORS`, and the row schema
- A new transactional RPC that supersedes `create_property_with_membership`
- A new server action `createProperty` (renames the wizard submit action; the pre-wizard FormData-based `createProperty` moved to `createPropertyDeprecated`) that wraps validation, RPC call, contract + bill uploads, error mapping, and cleanup
- A persisted `sectionServerErrors` slice (plus a `globalErrors` slice) on the wizard store so server errors from continue actions and from final submit both survive refresh and navigation between sections
- Wizard sections move their server-error reads from local `useServerValidationErrors` state to the persisted store slice; the inline merge with `useWizardForm.errors` at the call site is unchanged. `useServerValidationErrors` stays for non-wizard forms (profile, user-menu).
- A redesigned success screen with two CTAs (see *Success Behavior*)
- TypeScript types regenerated from Supabase after every migration in this work (`pnpm supabase gen types --local`)
- A broad RLS policy review covering every new table (`contracts`, `rent`, `provider_requests`), the new bucket (`contracts`), and the existing `provider_test_bills` table + `test-bills` bucket since this spec extends their write path to the property-creation flow

### Posture toward the existing RPC and server action

The existing `create_property_with_membership` RPC and `createProperty` server action are **deprecated** by this work, not extended. Reasons:

- The existing RPC writes property + membership + one unit. The new flow writes 8+ entity types in one transaction. Trying to evolve the existing function creates a confusing migration and a noisy diff.
- The existing action is FormData-based with single-section validation. The new action takes a structured wizard payload.
- Fresh names make it obvious which path is current.

The deprecation steps:

1. Land the new RPC and server action under fresh names.
2. Migrate the wizard's submit call to the new action.
3. Verify no other callers of the old action / RPC remain.
4. Delete both in the same PR (or the next PR) once verified.

---

## Database Migrations

The implementation plan must produce migrations that achieve the following. Filenames follow the existing `YYYYMMDDHHMMSS_description.sql` convention.

### Migration ordering (topological)

The migrations have inter-dependencies. Run in this order:

1. **Enums and types** — `file_upload_status`, `expense_amount_behavior`, `provider_request_source`, `provider_request_status`. Add `insurance` to `expense_type`. Add `not_invited` to `invitation_status`.
2. **`provider_requests` table** — referenced by `charge_definitions.provider_request_id` and `provider_test_bills.provider_request_id` below. Includes the `normalized_provider_name` trigger and dedupe indexes.
3. **`provider_test_bills` modifications** — add `provider_request_id`, `upload_status`, broaden `mime_type` allowed list, add UPDATE RLS policy.
4. **`contracts` table** — references `units` (exists), uses `file_upload_status`. Unit-scoped, not property-scoped.
5. **`rent` table** — references `units`. Includes `due_day_of_month`. Drop `units.due_day_of_month` only after this lands.
6. **`charge_definitions` modifications** — drop `charge_type` and legacy `provider_id`, add new columns referencing `provider_invoice_profiles` and `provider_requests`. **Pre-flight audit** runs against `charge_type` first; only proceed if it returns zero rent rows.
7. **`invitations` modifications** — `tax_id`, `last_emailed_at` columns. `not_invited` status was added in step 1.
8. **`audit_*` triggers** — `audit_contracts`, `audit_rent`, `audit_provider_requests` using existing `audit_log_trigger()`. Mirrors the `audit_charge_definitions` naming pattern.
9. **`is_unit_landlord(uuid)` SQL helper.** Mirrors the existing `is_unit_member` pattern but joins through `units` so it works regardless of whether the landlord-membership row has `unit_id IS NULL` (the insertion convention from this point forward) or has a specific `unit_id` set (older landlord rows that picked up a `unit_id` from the `20260327120000_memberships_unit_id.sql` backfill). Required by the unit-scoped `contracts` and `rent` RLS, and the contracts Storage bucket policies.
10. **`contracts` Storage bucket + RLS policies.** Uses `is_unit_member` and the new `is_unit_landlord`.
11. **`create_property` RPC.** Created last because it references all of the above.
12. **TypeScript types regenerated** (`pnpm supabase gen types --local`) and committed in the same PR train.

This DAG is enforceable by simply ordering filenames; one migration per layer is the simplest packaging. The implementation plan can collapse layers if the resulting file stays comprehensible.

### Shared `file_upload_status` enum

```
create type file_upload_status as enum ('pending', 'uploaded', 'failed');
```

Used by `contracts.upload_status` and `provider_test_bills.upload_status`. Naming is generic up front so future bill-only or contract-only states (e.g., `quarantined`) don't force a confusing rename. The earlier draft of this spec called it `contract_upload_status` — that name is replaced.

### Add `insurance` to `expense_type`

```
alter type expense_type add value 'insurance' before 'maintenance';
```

The wizard's checkout-local `EXPENSE_TYPES` literal already includes `insurance`. Without this enum addition, any `charge_definitions` row inserted with `expense_type = 'insurance'` fails. Position before `maintenance` to match the existing wizard order.

### `contracts` table

Contracts are **unit-scoped**, not property-scoped — a rental contract is one tenancy on one unit. A multi-unit property holds multiple unrelated leases, each on its own unit. Mirrors the existing unit-scoping of `charge_definitions`, `statements`, and `source_documents`. For the MVP "one unit per property" shape every row's `unit_id` resolves to a unique tenancy; for future multi-unit, the schema is already correct.

```
id                          uuid primary key default gen_random_uuid()
unit_id                     uuid not null references units(id) on delete cascade
storage_path                text not null            -- {unit_id}/{contract_id}.<ext> (no bucket prefix)
mime_type                   text not null
bytes                       integer
original_filename           text
upload_status               file_upload_status not null default 'pending'
extraction_data             jsonb                    -- ContractExtractionLlmResult shape
extraction_language         text                     -- 'pt-br' | 'en' | 'es'
extraction_model            text                     -- e.g. 'claude-sonnet-4-6'; free-form to match env override
extraction_schema_version   smallint not null default 0   -- 0 = no extraction yet; >=1 = extracted under that version
extracted_at                timestamptz              -- when extraction completed
raw_text                    text                     -- full contract text from extractText()
uploaded_by                 uuid not null references profiles(id)
is_active                   boolean not null default true
created_at                  timestamptz not null default now()
updated_at                  timestamptz not null default now()
deleted_at                  timestamptz
```

- `is_active` lets the unit point at the current contract while preserving renewals/addendums as additional rows.
- **At-most-one-active enforced via partial unique index:**
  ```
  create unique index uq_contracts_one_active_per_unit
    on contracts (unit_id) where is_active = true and deleted_at is null;
  ```
  Without this, concurrent submits or future bugs can leave multiple `is_active = true` rows pointing at different files for the same unit.
- `storage_path` stores the object key as `storage.objects` records it — **no bucket prefix**. Format: `{unit_id}/{contract_id}.<ext>`. The bucket name (`contracts`) is implicit. The Storage RLS expression `(storage.foldername(name))[1]::uuid` operates on `storage.objects.name`, which equals this column.
- `extraction_schema_version` defaults to `0` (sentinel for "not extracted yet"). When extraction lands, the RPC writes the current version (≥1). This avoids ambiguity between "legacy row missing version" and "extraction never happened."
- Indexes: `(unit_id)`, plus the partial unique above. The non-unique partial `(unit_id) where is_active = true` is redundant once the unique partial exists; drop it.
- Audit trigger: `audit_contracts` using existing `audit_log_trigger()` — mirrors `audit_charge_definitions` naming.
- RLS: unit members read; unit landlords insert/update/delete. Uses `is_unit_member(unit_id)` and the new `is_unit_landlord(unit_id)` helper (see *`is_unit_landlord` helper* below).
- **Re-extraction posture** (MVP): re-extraction overwrites `extraction_data`, `extraction_model`, `extraction_schema_version`, `extracted_at`, and `raw_text` on the same row. Prior extraction snapshots are not preserved. The decision is bounded — if dispute volume reveals a need for extraction history, a forward-only `contract_extractions` table replaces the JSONB columns; existing rows become "v0 extraction" records during that migration. The risk surface for MVP (lost extractions) is zero in practice because the source PDF in Storage is canonical and re-extraction is repeatable.
- **Active row replacement (MVP)**: when a landlord re-uploads via the property page, the wizard / property page sets the existing `is_active` row's `is_active = false` and inserts a new row, OR updates the existing row's `storage_path`/`upload_status` in place. The wizard's first-creation path always inserts a fresh row. The renewal / multi-contract UX is property-page work; this spec only commits to "single active row exists at end of submit."

#### Extraction Storage

Extraction lives directly on the contract row as JSONB rather than a separate table. Rationale:

- One row per upload — the natural unit. A contract row without extraction data simply has nulls.
- Cheap to add; no new table to keep in sync.
- Re-extraction (improved prompts, schema changes) is a column update, not a row-rebuild across tables.
- Future "chat with your contract" reads `raw_text` directly from this row.

If extraction volume or query patterns later justify normalization, splitting into a `contract_extractions` table is a forward-only migration. For MVP, JSONB on `contracts` is the right shape.

#### Why store `extraction_model`

The model used to produce an extraction is data the row needs:

- **Targeted re-extraction.** When a better model lands, query `where extraction_model in ('older-model-1', 'older-model-2')` and re-run only those — don't reprocess everything.
- **Quality regression analysis.** "Did contracts extracted with model X get more user corrections than model Y?" needs the model on the row.
- **Debugging.** First question when a field looks wrong: which model wrote it.

The column is `text`, not an enum, because `extract-contract.ts` already accepts a `CONTRACT_EXTRACTION_MODEL` env var to try non-calibrated models — the runtime model can be any string and the schema must accept it.

#### Why store `extraction_schema_version`

`ContractExtractionLlmResult` will evolve (new fields, restructured fields). Without a version on the row, old JSONB silently becomes harder to interpret as the typed shape moves. Column is `smallint not null default 0`; default of `0` means "no extraction performed yet."

The version constant lives at `src/lib/contract-extraction/schema-version.ts`:

```ts
export const CONTRACT_EXTRACTION_SCHEMA_VERSION = 1
```

Imported by:
- The extraction engine (`extract-contract.ts`) — emits via the result.
- The persistence path (server action / RPC payload builder) — writes onto the row.
- Any future consumer that reads `extraction_data` and needs to gate on shape.

Bump policy: on every breaking change to `ContractExtractionLlmResult` in `types.ts` / `schema.ts`. The bump is reviewer responsibility — flagged in the Zod schema's adjacent comment.

#### What the existing extraction code needs

`extractContract` in `src/lib/contract-extraction/extract-contract.ts` already knows the model id at extraction time but only emits it via the optional `onTelemetry` callback — it isn't on `ContractExtractionResult`. The implementation plan promotes `modelId` and `schemaVersion` (the new constant above) into the result shape so persistence reads them directly. Token / latency telemetry continues to flow through the existing PostHog callback; we are explicitly **not** mirroring it onto the row.

### `rent` table

Rent is **unit-scoped only**. Property scope derives via `units.property_id` join. Mirrors the unit-scoping of `charge_definitions` and `statements`; avoids the dual-FK consistency risk (where `rent.property_id` and `rent.unit_id → unit.property_id` could disagree) without a payoff — the join is one indexed FK lookup.

```
id                          uuid primary key default gen_random_uuid()
unit_id                     uuid not null references units(id) on delete cascade
amount_minor                integer not null
currency                    text not null
due_day_of_month            integer not null check (due_day_of_month between 1 and 31)
start_date                  date
end_date                    date
adjustment_frequency        text             -- 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'other'
adjustment_method           text             -- 'index' | 'fixed_amount' | 'fixed_percentage' | 'other'
adjustment_index            text             -- 'IPCA', 'CPI', etc., when method = 'index'
adjustment_amount_minor     integer          -- non-null only when adjustment_method = 'fixed_amount'
adjustment_basis_points     integer          -- non-null only when adjustment_method = 'fixed_percentage'
includes                    expense_type[]   -- e.g. ['condo', 'water'] when rent is bundled
created_by                  uuid not null references profiles(id)
created_at                  timestamptz not null default now()
updated_at                  timestamptz not null default now()
deleted_at                  timestamptz
```

- Money: `amount_minor` (integer) + `currency` (text). No floats. Per `data-modeling`.
- Adjustment value previously overloaded one `integer` column for both minor units (fixed amount) and basis points (percentage). Split into two columns; a `CHECK` constraint enforces "exactly one is non-null when `adjustment_method` is `fixed_amount` or `fixed_percentage`":
  ```
  alter table rent add constraint rent_adjustment_value_consistency check (
    case adjustment_method
      when 'fixed_amount'    then adjustment_amount_minor is not null and adjustment_basis_points is null
      when 'fixed_percentage' then adjustment_basis_points is not null and adjustment_amount_minor is null
      when 'index'           then adjustment_amount_minor is null and adjustment_basis_points is null
      else                        adjustment_amount_minor is null and adjustment_basis_points is null
    end
  );
  ```
- Adjustment fields are nullable; rent without an adjustment clause is valid.
- `includes expense_type[]` carries the bundled-rent affordance — references the canonical `expense_type` enum so callers don't have to translate strings. Empty array (or null) means rent is just rent.
- `due_day_of_month` lives here, not on `units`. Rent is per-tenancy; the due day is a tenancy concern.
- Indexes: `(unit_id)`. Property-scoped reads use `from rent r join units u on u.id = r.unit_id where u.property_id = ?` — one indexed FK lookup, microseconds.
- Audit trigger: `audit_rent`.
- RLS: unit members read; unit landlords manage. Uses `is_unit_member(unit_id)` and `is_unit_landlord(unit_id)`.

#### Mapping extraction `includes` (string[]) into `expense_type[]`

`ContractRent.includes` from `src/lib/contract-extraction/types.ts` is `string[]` — the LLM emits values like `"rent"`, `"condo"`, `"IPTU"`. The DB column is `expense_type[]`. Mapping rules, applied in the wizard's extraction-seeder:

| Extraction value | Maps to | Notes |
|---|---|---|
| `"condo"` | `'condo'` | Direct |
| `"water"` | `'water'` | Direct |
| `"sewer"` | `'sewer'` | Direct |
| `"electricity"`, `"luz"`, `"energia"` | `'electricity'` | LLM should already canonicalize, but accept variants |
| `"gas"` | `'gas'` | Direct |
| `"trash"` | `'trash'` | Direct |
| `"internet"` | `'internet'` | Direct |
| `"cable"` | `'cable'` | Direct |
| `"insurance"` | `'insurance'` | Requires the `insurance` enum addition above |
| `"maintenance"` | `'maintenance'` | Direct |
| `"rent"` | (skipped) | "Rent includes rent" is meaningless — drop |
| Anything else (e.g. `"IPTU"`, `"IBI"`, `"predial"`) | `'other'` | Surface a small "review" affordance in the wizard's bundled-rent UI so the user can re-classify if desired |

Mapping is the wizard's responsibility before submit. The RPC trusts the validated `expense_type[]` it receives.

The unit-vs-property question for rent: rent is tied to a tenancy on a unit, period. The MVP creates one unit per property, but the schema speaks unit so multi-unit support is a no-op when it arrives.

#### Move `due_day_of_month` from `units` to `rent`

`units.due_day_of_month` becomes vestigial. The migration drops it once `rent` rows exist with the new column. For backward-compat during the transition, the migration order is:

1. Add `rent.due_day_of_month`.
2. Backfill any logical "rent rows" represented today as `charge_definitions` with `charge_type='rent'` into the new `rent` table (none expected — wizard hasn't shipped — but the migration audit confirms the table is empty for rent rows).
3. Drop `units.due_day_of_month` and update any TS/SQL readers.

If the audit finds existing rent-typed `charge_definitions`, stop and revisit — those rows are pre-pivot leftovers and need a manual decision.

#### `units.currency`

Stays. It represents the unit's default currency; rent has its own currency that may differ (USD-denominated contract on a BRL property). The redundancy is intentional and minor.

### `provider_requests` table

```
id                        uuid primary key default gen_random_uuid()
source                    provider_request_source not null
status                    provider_request_status not null default 'pending'
requested_provider_name   text
requested_provider_tax_id text
normalized_provider_name  text                                   -- maintained by trigger
expense_type              expense_type
country_code              text not null default 'BR'
state                     text
city                      text
neighborhood              text
provider_id               uuid references providers(id)          -- set when company is known but profile isn't
profile_id                uuid references provider_invoice_profiles(id)
requested_by              uuid references profiles(id)
assigned_to               uuid references profiles(id)
assigned_at               timestamptz
notes                     text
decline_reason            text
created_at                timestamptz not null default now()
updated_at                timestamptz not null default now()
```

- New enum `provider_request_source`: `user_new_provider`, `user_correction`, `engineer`, `system`.
- New enum `provider_request_status`: `pending`, `in_progress`, `testing`, `complete`, `declined`.
- Audit trigger: `audit_provider_requests`.

#### Normalizer (regular column + trigger, not generated)

Generated columns require IMMUTABLE expressions. The normalizer ("lowercase, NFKC, strip generic legal suffixes like `ltda`/`s.a.`/`me`/`eireli`, collapse whitespace") relies on a function whose definition could change over time as we sharpen dedupe — that's incompatible with `GENERATED ALWAYS AS`. So:

- `normalized_provider_name` is a regular `text` column.
- A `BEFORE INSERT OR UPDATE` trigger calls a `normalize_provider_name(text)` SQL function and writes the result into `NEW.normalized_provider_name`. The trigger ignores `NEW.normalized_provider_name` if the caller sets it explicitly — the trigger always wins.
- The same `normalize_provider_name` function is invoked by the RPC against the wizard's draft input before the dedupe SELECT, guaranteeing byte-equal comparison between the stored column and the lookup key.

**Initial normalizer (v1)**, defined in this spec so dedupe correctness is unambiguous:

```
1. Lowercase via lower(unaccent(input)).      -- requires unaccent extension; enable in this migration if not present
2. Collapse whitespace and punctuation to single spaces.
3. Trim.
4. Remove these trailing tokens (case-insensitive, after step 1) when present as
   the last whitespace-separated word: 'ltda', 's.a.', 'sa', 'me', 'eireli',
   'epp', 'inc', 'llc', 'ltd', 'gmbh'. Apply once.
5. Trim again.
```

This v1 algorithm lives as `public.normalize_provider_name(text) returns text language sql immutable` in the migration. Sharpening (e.g., handling additional country forms, accent variants) is a follow-up migration that updates the function body and re-normalizes existing rows in place.

#### RLS (shared rows aware)

`provider_requests` rows can be **referenced from multiple landlords' charge definitions** via cross-property dedupe. RLS must let any user with a charge linked to the request read the request — otherwise FK joins from the property page break, and the wizard's success screen can't render the "we're adding support for [name]" line for a deduped match.

```
-- SELECT: owner, OR engineer, OR member of the property whose unit's
-- charge_definitions reference this request. Note the join chain:
-- charge_definitions -> units -> memberships. charge_definitions is keyed by unit_id.
create policy "Requesters and linked members read provider_requests"
  on provider_requests for select
  using (
    requested_by = auth.uid()
    or exists (select 1 from engineer_allowlist where user_id = auth.uid())
    or exists (
      select 1
      from charge_definitions cd
      join units u on u.id = cd.unit_id
      join memberships m on m.property_id = u.property_id
      where cd.provider_request_id = provider_requests.id
        and m.user_id = auth.uid()
        and m.deleted_at is null
    )
  );

-- INSERT: only via SECURITY DEFINER RPC. No direct insert policy for authenticated.

-- UPDATE: engineers only. The wizard never updates request rows.
create policy "Engineers update provider_requests"
  on provider_requests for update
  using (exists (select 1 from engineer_allowlist where user_id = auth.uid()))
  with check (exists (select 1 from engineer_allowlist where user_id = auth.uid()));
```

#### LGPD posture

Cross-property dedupe means landlord A's request can be visible to landlord B (via B's charge linkage). The shared row contains the provider name, tax id, region, expense type — non-PII for the provider, but `requested_by` is identity for landlord A. Rules:

- **`requested_by` MUST NOT be exposed** to landlord B in any UI — neither directly (no card showing who requested it) nor indirectly (no "first requested 30 days ago by another customer" string). The success screen and any future "request status" UI surface the request's own state only.
- The RLS policy lets landlord B read the row; the application layer filters out `requested_by` from any response shape that crosses landlord boundaries. The implementation plan adds a per-section projection to enforce this in `src/data/providers/...`.
- Audit log entries on `provider_requests` use the actor at write time (engineer or original requester); read-side joins MUST NOT echo `audit_events.actor_id` for shared rows.
- This posture follows the `.claude/rules/security-lgpd.md` data minimization principle.

#### Dedupe indexes

To keep the cross-property dedupe lookup cheap, add composite indexes aligned to each match priority in the RPC:

```
create index idx_provider_requests_dedupe_tax_id
  on provider_requests (country_code, requested_provider_tax_id)
  where requested_provider_tax_id is not null
    and status not in ('declined', 'complete');

create index idx_provider_requests_dedupe_provider
  on provider_requests (country_code, provider_id, expense_type, state, city)
  where provider_id is not null
    and status not in ('declined', 'complete');

create index idx_provider_requests_dedupe_name
  on provider_requests (country_code, normalized_provider_name, expense_type, state, city)
  where status not in ('declined', 'complete');
```

These match the three rules in *Cross-property request dedupe* under *RPC Contract*.

The link from a request to its uploaded sample bill goes through `provider_test_bills.provider_request_id` (added by this spec — see below).

The link from a charge definition to its request goes through `charge_definitions.provider_request_id` (added by this spec under *Charge Definitions*).

### `charge_definitions` modifications

The Expenses guidepost previously assigned the schema work to its Phase 3. Moved into this spec because the RPC writes here. **`name`, `expense_type`, `amount_behavior` remain required** for any row — the relaxation below is only about provider attachment.

> **Read this once, internalize it for every query in this spec:** `charge_definitions` is keyed by `unit_id`, **not** `property_id`. There is no `property_id` column on `charge_definitions`. For any property-scoped read or RLS predicate, join through `units` on `units.id = charge_definitions.unit_id` and filter on `units.property_id`. The same applies to `provider_requests` reachability, which routes provider_requests → charge_definitions → units → memberships. **Never write a `charge_definitions ... where property_id = ...` clause.**

- New enum `expense_amount_behavior`: `fixed`, `variable`, `unknown`.
- **Drop `charge_type` column** and its enum.
- **Drop legacy `provider_id` column.** It's superseded by `provider_profile_id` and `provider_request_id`. The migration first asserts no production code paths rely on it (see *Absorb the TS reader migration* below).
- Add columns:
  - `expense_type expense_type not null` — required. Wizard never inserts an expense without a type.
  - `amount_behavior expense_amount_behavior not null default 'unknown'`
  - `provider_profile_id uuid references provider_invoice_profiles(id) on delete restrict` — nullable
  - `provider_request_id uuid references provider_requests(id) on delete set null` — nullable
  - `bundled_into_rent boolean not null default false`
  - `bundled_into_charge_id uuid references charge_definitions(id) on delete restrict` — nullable
- `name` stays `not null` (existing constraint). Keeps `unspecified` rows useful as list entries.
- Constraint — **provider attachment is at-most-one of four states**, not "all four required":
  ```
  alter table charge_definitions add constraint charge_definitions_provider_attachment check (
    -- at most one of provider_profile / provider_request
    (provider_profile_id is null or provider_request_id is null)
    -- when bundled_into_rent, no other provider/request/charge link
    and (not bundled_into_rent or (
      provider_profile_id is null
      and provider_request_id is null
      and bundled_into_charge_id is null
    ))
    -- when bundled_into_charge_id, no provider/request link
    and (bundled_into_charge_id is null or (
      provider_profile_id is null
      and provider_request_id is null
      and bundled_into_rent = false
    ))
    -- bundled_into_charge_id cannot point at the same row (no self-bundle)
    and (bundled_into_charge_id is null or bundled_into_charge_id <> id)
  );
  ```
  All four columns null is **valid** — represents "expense recorded but no provider chosen yet" (the `unspecified` state).

#### FK cascade rationale

| FK | Action | Reason |
|---|---|---|
| `provider_profile_id` → `provider_invoice_profiles(id)` | `ON DELETE RESTRICT` | Profiles deletion is engineer-controlled and rare; requiring an explicit re-point preserves audit trail. |
| `provider_request_id` → `provider_requests(id)` | `ON DELETE SET NULL` | Engineers can delete request rows during cleanup; the charge becomes `unspecified`. UI gracefully degrades. |
| `bundled_into_charge_id` → `charge_definitions(id)` (self-FK) | `ON DELETE RESTRICT` | Deleting a parent row that has bundled children would orphan the children silently. Force the user to first un-bundle. |
| Plus `bundled_into_charge_id <> id` check | (above) | No self-bundle. |

#### What happens when a linked request is later `declined`

The FK is `ON DELETE SET NULL`, but `declined` is a status change, not a delete. Rule:

- The charge row remains pointing at the declined request.
- Any UI reading a charge with `provider_request_id.status = 'declined'` renders the row as `unspecified` (gray, "provider unavailable") with an optional re-link affordance to be built later in the property-page work.
- The wizard's success screen never surfaces declined-request copy; that surface is property-page territory.

The implementation plan picks whether to also surface a notification when an engineer declines a request that has dependents.

#### Absorb the TS reader migration

Dropping `charge_type` is destructive and breaks every TypeScript reader of the column. The Expenses task-order doc (Phase 3 task 16) listed this as a separate task; this spec **absorbs it**. The migration is gated on a one-time codebase audit:

1. Search for `charge_type` across `src/`, fail the build if any reader remains that doesn't go through a feature flag or compatibility shim.
2. Known call sites that need updates (verified at spec-write time): `src/data/units/shared.ts`, `src/data/charges/`, `src/data/statements/shared.ts`, `src/data/charges/generate-instances.ts`, plus any wizard-local references. The implementation plan grep-walks the repo to confirm the full list.
3. Update each reader to use the new shape (`expense_type`, `amount_behavior`, provider fields). Where a reader needs "is this rent?", switch to "does this property have a `rent` row" — rent left `charge_definitions` entirely.
4. Land the TS migration in the **same PR train** as the schema migration so production never has a window where one side knows about `charge_type` and the other doesn't.

`provider_invoice_profiles.category` alignment (Phase 3 task 14) stays in the Expenses workstream because it touches provider data shape, not charge_definitions. This spec doesn't claim it.

#### Pre-implementation gate

Before running this migration:

```
select count(*) from charge_definitions where charge_type = 'rent';
```

Must return zero (rent should not be in this table under the new model). If non-zero, stop and decide: backfill those rows into the new `rent` table or treat as disposable test data. The audit query runs as a `do $$ ... $$;` block at the top of the migration file and aborts the migration if the count is non-zero.

### `provider_test_bills` modifications

```
alter table provider_test_bills
  add column provider_request_id uuid references provider_requests(id) on delete cascade,
  add column upload_status file_upload_status not null default 'pending';

create index idx_provider_test_bills_provider_request_id
  on provider_test_bills(provider_request_id);

-- Existing rows are engineer/playground uploads; assume they're on disk.
update provider_test_bills set upload_status = 'uploaded';

-- Drop the PDF-only default; the wizard can upload images of bills.
alter table provider_test_bills alter column mime_type drop default;

-- Constrain mime types we accept across the bucket. Engineers can extend via migration.
alter table provider_test_bills add constraint provider_test_bills_mime_type_allowed check (
  mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
);
```

- `provider_request_id` lets bills uploaded as part of a missing-provider draft attach to the request that produced them. `ON DELETE CASCADE` because bills are a sub-resource of the request — when an engineer purges a stale request, its bills go with it.
- `upload_status` mirrors the contracts pattern. Uses the shared `file_upload_status` enum.
- `mime_type` no longer defaults to `application/pdf`. The wizard supplies the actual mime; engineer/playground inserts must too. The CHECK constraint accepts PDF + common image formats. Adding more is an enum-style additive migration.
- The `source` column already supports `'provider_request'` — no enum change needed.

#### New UPDATE RLS for landlord upload flow

The existing policy set lets users `INSERT` and `SELECT` their own test bills, but **does not allow `UPDATE`**. The server action needs to flip `upload_status` from `'pending'` → `'uploaded'` after the file lands in Storage. Add:

```
create policy "Users can update upload_status on own test bills"
  on provider_test_bills for update
  using (uploaded_by = auth.uid())
  with check (
    uploaded_by = auth.uid()
    and upload_status in ('uploaded', 'failed')
  );
```

The `with check` clause prevents downgrading back to `'pending'`. Engineers retain full UPDATE via the existing engineer policy.

### `invitations` modifications

```
alter type invitation_status add value 'not_invited';

alter table invitations
  add column tax_id text,
  add column last_emailed_at timestamptz;

create index idx_invitations_last_emailed_at
  on invitations(last_emailed_at) where status = 'pending';
```

- `tax_id` per shell spec: pre-fills tenant signup. Informational; no FK or unique constraint.
- `last_emailed_at` powers email idempotency: the email sender consults this column before re-sending in the replay path or after a manual resend, and updates it on each send. Without this column, the spec's "consult `last_emailed_at`" rule had nothing to consult.
- The partial index targets the active path (status = 'pending') for the email idempotency lookup.
- No backfill needed for either column.

The RPC's tenant-insert path uses the existing `code` column populated by the TS-side `generateInviteCode()` helper at `src/data/invitations/generate-invite-code.ts`, sets `expires_at = now() + interval '30 days'` (matching the existing `sendInvite` action), and sets `invited_by = auth.uid()`, `unit_id = <new unit id>`, `role = 'tenant'`, `source = 'wizard'` (new value, see below).

#### `invitation_source` value

The existing `source text` column on `invitations` is free-form (set to `'direct'`, `'waitlist'`, etc., by callers). The wizard tenant-invite path uses `source = 'wizard'`. No migration needed — it's already a free-form column.

### `properties` modification: collapse draft id and primary key

The wizard already generates `draftId = crypto.randomUUID()`. The RPC accepts a `p_property_id uuid` argument and uses it as the row's primary key — `properties.id = draftId`.

This requires:

- No new column. `properties.id` is the primary key; the RPC inserts with the explicit id.
- The RPC's idempotency check: `select id from properties where id = p_property_id and created_by = auth.uid()`. If found, return it; if `created_by` differs (impossible under normal flow but cheap to guard), raise.
- Existing properties created via the old RPC stay valid; their ids are random UUIDs that no future wizard-redirect will collide with.

### `contracts` Storage bucket

- Create bucket `contracts`, private (`public = false`).
- Allowed mime types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. Configure via `storage.buckets.allowed_mime_types`.
- File-size cap: 25 MB (matches existing wizard validation; sized for typical scanned contracts).
- Object key format: `{unit_id}/{contract_id}.<ext>` — **no `contracts/` prefix in the key**. The bucket name is implicit. The `contracts.storage_path` column stores this exact key.
- RLS on `storage.objects` for `bucket_id = 'contracts'` uses `is_unit_member(uuid)` (existing, declared in `20260327120000_memberships_unit_id.sql`) and `is_unit_landlord(uuid)` (new — see *Migration ordering* step 9). The folder-name extraction `(storage.foldername(name))[1]::uuid` resolves to the unit uuid because the key starts with the unit id.

```
-- Pseudocode using the helpers; the migration writes real CREATE POLICY statements.
SELECT  ↦ is_unit_member((storage.foldername(name))[1]::uuid)
INSERT  ↦ is_unit_landlord((storage.foldername(name))[1]::uuid)
UPDATE  ↦ is_unit_landlord((storage.foldername(name))[1]::uuid)
DELETE  ↦ is_unit_landlord((storage.foldername(name))[1]::uuid)
```

Tenants on the unit get read access via `is_unit_member`. Only the unit's landlord (`is_unit_landlord`, which joins through `units` to the property's landlord membership) can replace or delete the file. Membership lives on the `memberships` table; these helpers are the canonical lookup.

#### `is_unit_landlord` helper

The existing helpers (`is_property_member`, `is_property_landlord`, `is_unit_member`) read the `memberships` table directly with no joins — they're cheap. `is_unit_landlord` necessarily joins through `units` so it resolves a landlord membership regardless of whether the row's `unit_id` is `NULL` (landlord memberships are inserted with `unit_id IS NULL` from this point forward) or has a specific value (older landlord rows picked up a `unit_id` from the `20260327120000_memberships_unit_id.sql` backfill). The function:

```sql
create or replace function is_unit_landlord(p_unit_id uuid)
returns boolean as $$
  select exists (
    select 1
    from memberships m
    join units u on u.property_id = m.property_id
    where u.id = p_unit_id
      and m.user_id = auth.uid()
      and m.role = 'landlord'
      and m.deleted_at is null
  );
$$ language sql security definer stable;
```

Performance: the join is on `units.property_id` (indexed FK) and `memberships.property_id` (indexed); the lookup is microseconds. Lands as part of the contracts Storage migration (or its own migration immediately before, implementer's choice).

---

## RPC Contract

A single transactional Postgres function named `create_property`. `SECURITY DEFINER`, `set search_path = public`, granted to `authenticated`. The previous draft of this spec called it `create_property_with_draft` — that name leaked the wizard caller's draft-id concept into a function whose responsibility is just "create a property atomically." The fact that the caller passes its draftId as the `p_property_id` parameter is irrelevant to the function's purpose. Identifier is frozen here; migrations, grants, the TS wrapper, and tests all use this name.

### Input

A structured JSONB payload (or a parameter list — implementation detail) covering exactly what the wizard collects:

- `p_property_id uuid` — the wizard's `draftId`. Idempotency key.
- `p_property` — address + property_type + name + country_code
- `p_unit` — minimal unit metadata (name, currency)
- `p_contract` *(nullable)* — `mime_type`, `bytes`, `original_filename`, `extension` (drives storage path), plus the extraction payload when extraction succeeded: `extraction_data jsonb`, `extraction_language`, `extraction_model`, `extraction_schema_version`, `raw_text`, `extracted_at`
- `p_rent` *(nullable)* — full rent payload per `rent` table shape (including `due_day_of_month` and `includes`)
- `p_tenants` *(nullable, list)* — each: `name`, `email`, `tax_id`, `invite_now boolean`. **No `role` field** — the RPC always uses `'tenant'`.
- `p_expenses` *(nullable, list)* — each: `expense_type`, `amount_behavior`, `amount_minor`, `currency`, `name`, plus *at most one* of:
  - `provider_profile_id` (tracked)
  - `provider_request_draft_index: int` (pending — references an entry in `p_provider_request_drafts`)
  - `bundled_into_rent: true`
  - `bundled_into_expense_index: int` (references another entry in `p_expenses`)
  
  All four absent is **valid** and results in an `unspecified` row.
- `p_provider_request_drafts` *(nullable, list)* — missing-provider drafts the wizard created. Each:
  ```
  requested_provider_name      text
  requested_provider_tax_id    text | null
  expense_type                 expense_type | null
  bill_file                    {                     -- nullable
    mime_type                  text
    original_filename          text
    extension                  text
    bytes                      integer
  } | null
  ```
- `p_tax_id` *(nullable)* — landlord's own tax id payload from the wizard's CPF section. The RPC, not the server action, decides whether to write it.

### Behavior

1. Verify `auth.uid()` is set; raise `unauthenticated` otherwise.
2. **Bundle graph validation.** Before any writes, validate the in-payload bundle graph (see *Bundle graph rules* below). Raise `expense_bundle_invalid_reference` for any structural problem (cycle, out-of-range index, self-reference, exclusivity violation). One code covers all bundle-graph errors; the i18n message is the same regardless of which sub-rule failed.
3. **Idempotent insert (concurrent-safe).** Use `INSERT ... ON CONFLICT DO NOTHING` on `properties.id`:
   ```
   insert into properties (id, created_by, ...)
   values (p_property_id, auth.uid(), ...)
   on conflict (id) do nothing
   returning 1 into v_inserted;
   ```
   If `v_inserted` is null, the row already existed. Branch:
   - Re-read with `select created_by from properties where id = p_property_id` to confirm ownership. If `created_by <> auth.uid()`, raise `idempotency_owner_mismatch` (defensive — should not happen under normal flow).
   - Run the *Replay payload assembly* path below and return early with `is_idempotent_replay = true`. No further writes.
4. Insert one `units` row (no `due_day_of_month`).
5. Insert `memberships` (landlord = current user).
6. If `p_contract` present:
   - Compute `contract_id := gen_random_uuid()`.
   - Compute `storage_path := <new unit id> || '/' || contract_id || '.' || extension` — **no bucket prefix**, matches `storage.objects.name`. Path is unit-scoped because contracts are unit-scoped.
   - Insert `contracts` row with `unit_id = <new unit id>`, `upload_status = 'pending'`, `is_active = true`, and the extraction columns populated when present (`extraction_schema_version` is `0` if no extraction occurred, otherwise the version constant supplied by the caller).
7. If `p_rent` present, insert `rent` row. The split `adjustment_amount_minor` / `adjustment_basis_points` columns mean exactly one of those is non-null when `adjustment_method` is `fixed_amount` / `fixed_percentage`; the CHECK constraint defends, but the wizard's Zod schema must already enforce.
8. **Tenant invitations.** For each tenant in `p_tenants`:
   - Compute `code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))` if SQL-side, OR accept a `code` field generated by the TS wrapper using `generateInviteCode()`. Decision: **TS-side**, so the existing helper stays canonical and tests can stub it.
   - Compute `expires_at := now() + interval '30 days'` (matches `sendInvite`).
   - Insert `invitations` with:
     - `property_id = p_property_id`
     - `unit_id = <new unit id>`
     - `invited_by = auth.uid()`
     - `invited_email = tenant.email`
     - `invited_name = tenant.name`
     - `tax_id = tenant.tax_id`
     - `role = 'tenant'`
     - `source = 'wizard'`
     - `status = 'pending'` if `invite_now`, else `'not_invited'`
     - `code = <ts-generated>`
     - `expires_at = now() + 30 days`
     - `last_emailed_at = null` (the email send happens *after* the RPC commits)
9. **Provider request resolution and dedupe** (in-draft + cross-property):
   - For each draft in `p_provider_request_drafts`:
     - Compute `normalized := public.normalize_provider_name(draft.requested_provider_name)`.
     - Try cross-property dedupe (see *Cross-property request dedupe* below).
     - If a match is found, link to that existing request id (no insert).
     - If not, insert a new `provider_requests` row with `source = 'user_new_provider'`, `requested_by = auth.uid()`, `status = 'pending'`. The trigger writes `normalized_provider_name`.
   - Build a draft-index → request-id map.
   - For each draft that has a `bill_file`:
     - Compute `test_bill_id := gen_random_uuid()`.
     - Compute `test_bill_storage_path := provider_request_id || '/' || test_bill_id || '.' || extension`.
     - Insert `provider_test_bills` row with `provider_request_id`, `source = 'provider_request'`, `storage_path`, `mime_type`, `uploaded_by = auth.uid()`, `upload_status = 'pending'`.
10. **Expenses (charge_definitions).** Insert order: any expense with `bundled_into_expense_index` is inserted *after* its parent. The implementation plan computes a topological order from the validated bundle graph and rejects cycles in step 2. For each expense:
    - Resolve `provider_request_id` from the dedupe map when the row referenced a draft index.
    - Resolve `bundled_into_charge_id` from the in-flight `charge_definitions` IDs when the row referenced another expense by index.
    - Insert `charge_definitions` with `expense_type` (required), `amount_behavior`, `name` (required), optional `amount_minor`/`currency`, and at most one of provider/request/bundle attachments. The check constraint defends.
    - **Never insert a `charge_definitions` row that represents rent.** Rent has its own table.
11. **Tax id update logic.** Read `profiles.tax_id` for the current user.
    - If `profiles.tax_id` is null/empty AND `p_tax_id` is non-empty, update.
    - If `profiles.tax_id` already has a value, do not update.
    - If `p_tax_id` is null/empty, do not update.
    - Set `v_tax_id_updated boolean` for the return payload.
    - **Collision handling.** A partial unique index `idx_profiles_tax_id` already exists on `profiles(tax_id) where tax_id is not null` (shipped in `20260413120000_billing_intelligence_profiles.sql`). When the update raises a unique-violation (`SQLSTATE 23505`) because another profile already claimed this tax_id, re-raise with a tagged exception `tax_id_conflict` so the server action maps it to a per-section error (`sectionErrors['tax-id'].tax_id = ['tax_id_conflict']`) instead of a generic 500. This is the live path, not a hypothetical future one.
12. Audit events fire via existing triggers on each affected table.
13. Return the success payload (see *Return shape*).

#### Bundle graph rules

`p_expenses[i].bundled_into_expense_index` may reference another entry within the same `p_expenses` array. Validation, executed **before** any writes:

All four sub-rules below produce the same error code, `expense_bundle_invalid_reference`:

- `bundled_into_expense_index` must be a valid index into `p_expenses` (`0 <= idx < length`) and not equal to `i` (no self-bundle).
- The directed graph "expense → bundled_into_expense_index" must be acyclic.
- An expense with `bundled_into_rent = true` MUST have `bundled_into_expense_index = null`, no `provider_profile_id`, and no `provider_request_draft_index`.
- An expense with `bundled_into_expense_index != null` MUST have `bundled_into_rent = false`, no `provider_profile_id`, and no `provider_request_draft_index`.

Server-side Zod and the DB CHECK enforce these. The RPC re-validates because it's the persistence boundary; cost is microseconds. If we ever need to differentiate sub-rules in the UI, we add a `detail` field on the error envelope — not a new top-level code.

#### Replay payload assembly

When `is_idempotent_replay = true`, the RPC builds the same return shape as a fresh insert — read-only, single transaction:

- `property` ← `select * from properties where id = p_property_id`
- `unit` ← `select id, currency from units where property_id = p_property_id` (single unit per MVP)
- `contract` ← `select c.id, c.storage_path, c.original_filename, c.upload_status from contracts c join units u on u.id = c.unit_id where u.property_id = p_property_id and c.is_active = true and c.deleted_at is null`. Single row by partial unique index on `(unit_id)`.
- `rent` ← `select r.id, r.amount_minor, r.currency, r.due_day_of_month, r.includes from rent r join units u on u.id = r.unit_id where u.property_id = p_property_id and r.deleted_at is null` limit 1
- `tenants.invited_count` / `deferred_count` ← `select status, count(*) from invitations where property_id = p_property_id group by status`
- `tenants.invitations_to_email` ← `select id from invitations where property_id = p_property_id and status = 'pending' and (last_emailed_at is null or last_emailed_at < now() - interval '5 minutes')`. The 5-minute cutoff prevents re-emailing within the same retry burst while letting a deliberate user-driven retry resend.
- `expenses.count` / `unspecified_count` / `bundled_count` ← counts on `charge_definitions` joined through `units` to filter by property: `from charge_definitions cd join units u on u.id = cd.unit_id where u.property_id = p_property_id`. Group as needed for each count.
- `expenses.by_type` ← same join, grouped by `expense_type`.
- `provider_requests.new_count` / `deduped_count` ← **not derivable on replay** — see below.
- `provider_requests.bill_uploads` ← all `provider_test_bills` rows whose `provider_request_id` is referenced by any `charge_definitions` row scoped to this property (joined through `units`), filtered to `upload_status = 'pending'` and `uploaded_by = auth.uid()`. The replay returns only `'pending'` rows so the action's upload retry processes exactly the bills that didn't land. `'uploaded'` rows are skipped — the file is already there. `'failed'` rows are surfaced for manual retry on the **property page**, not in the action's auto-retry flow. The replay payload's `bill_uploads` deliberately excludes `'failed'` rows — auto-retry is for the in-flight retry burst (network glitch on first submit), not for reprocessing rows that have already failed once. The property-page workstream owns the "your bill upload failed, retry?" surface; this spec does not specify it.
- `tax_id_updated` ← always `false` on replay (the original insert decision is not preserved; consumers should treat the field as informational on replay only).

**`new_count` / `deduped_count` on replay**: replay can't tell which `provider_requests` rows the original insert created vs linked to. Decision: return `new_count = null, deduped_count = null` on replay. The success-screen copy MUST handle these as "we created/linked some requests" without quoting numbers when both are null. The first-write path returns concrete counts.

### Cross-property request dedupe

When inserting a new `provider_requests` row from a draft, look for an existing match before inserting. The match rule, in order of confidence:

1. **Tax id match.** If `requested_provider_tax_id` is set, look for `provider_requests` rows where `requested_provider_tax_id` equals it AND `country_code` matches AND `status` not in (`declined`, `complete`). If found, link to that row.
2. **Provider id match.** If the wizard resolved a known `provider_id` for the draft (rare on this path, but possible), look for `provider_requests` rows where `provider_id` matches AND `expense_type` matches AND `(country_code, state, city)` matches AND `status` not in (`declined`, `complete`). If found, link.
3. **Normalized name match.** Compare `normalized_provider_name` against the draft's normalized name AND `expense_type` matches AND `(country_code, state, city)` matches AND `status` not in (`declined`, `complete`). Use a strict equality on the normalized form. If found, link.
4. **No match.** Insert a new `provider_requests` row.

This prevents two landlords in the same neighborhood from each spawning their own "Floripa Energia" request. The matching rule is conservative: it errs on creating duplicates (which engineering can collapse) over silently linking unrelated requests. The implementation plan sharpens the normalizer.

### Return shape

A JSONB object with everything the new success screen and any analytics needs. No follow-up fetch required.

```
{
  is_idempotent_replay: boolean,
  property_id: uuid,
  property_name: text,
  property_address: {                     -- shaped to match the wizard's address structure
    street, number, complement,
    neighborhood, city, state, postal_code,
    country_code,
  },
  property_type: property_type | null,
  unit_id: uuid,
  contract: null | {
    contract_id: uuid,
    storage_path: text,                   -- {unit_id}/{contract_id}.<ext>; bucket implicit
    original_filename: text,
    upload_status: file_upload_status,
  },
  rent: null | {
    rent_id: uuid,
    amount_minor: integer,
    currency: text,
    due_day_of_month: integer,
    includes: expense_type[],
  },
  tenants: {
    invited_count: int,                   -- created with status='pending'
    deferred_count: int,                  -- created with status='not_invited'
    invitations_to_email: invitation_id[], -- pending invitations that need an email send
  },
  expenses: {
    count: int,
    by_type: Record<expense_type, int>,   -- e.g. { electricity: 2, condo: 1 }; missing keys = 0
    unspecified_count: int,               -- expenses with no provider/profile/request and not bundled
    bundled_count: int,
  },
  provider_requests: {
    new_count: int | null,                -- newly inserted in this submit; null on idempotent replay
    deduped_count: int | null,            -- linked to existing rows; null on idempotent replay
    bill_uploads: { test_bill_id, storage_path, mime_type }[], -- only 'pending' rows
  },
  tax_id_updated: boolean,                -- true on first-write when profiles.tax_id was just set;
                                          -- always false on idempotent replay (decision is not persisted)
}
```

#### `expenses.by_type` shape

Returned as an object keyed by `expense_type` enum string with integer values. Missing keys mean zero — consumers should default to 0. This is the cheapest shape for both the SQL `group by` aggregation and TypeScript consumption (`summary.expenses.by_type.electricity ?? 0`). The earlier draft of this spec showed `{ expense_type: int }[]` which was ambiguous; replaced.

### Error shape

The RPC raises tagged exceptions on validation failures inside its transaction. The server action translates Postgres errors into the `ServerErrorsResponse` envelope below — section-scoped codes land inside `sectionErrors[section][field]`, wizard-wide codes land in `globalErrors[]`. Exceptions abort the transaction; nothing partial commits. Tagging convention: the SQLSTATE is `P0001` (raise_exception) and `MESSAGE` is a stable code string from the catalogue (e.g. `expense_bundle_invalid_reference`, `tax_id_conflict`).

---

## Server Action Contract

`createProperty` lives at `src/data/properties/actions/create-property.ts` (next to existing actions). It returns a discriminated union; never throws to the form.

### Inputs

The wizard's `PropertyCreationStateShape` projected to a submission shape. **Skipped sections are not sent.** The wizard preprocesses the input on the client: any section with `sectionStates[id] === 'skipped'` has its key omitted from the payload entirely. The server action treats absence as "not provided."

```
type SubmitInput = {
  draftId: string                      // route param == future properties.id
  path: 'contract' | 'no_contract'
  contractFile: File | null
  extraction: ContractExtractionResult | null
  property: PropertySectionData          // always present (required section)
  taxId: TaxIdSectionData                // always present (required section)
  rent?: RentSectionData                  // omitted when skipped or not opened
  tenants?: TenantsSectionData            // omitted when skipped
  expenses?: ExpensesSectionData          // omitted when skipped
  // bank account not included — coming-soon section, no payload
}
```

### Flow

1. **Auth.** `createClient()` → `auth.getUser()`. If no user, return `{ ok: false, globalErrors: [{ code: 'unauthenticated' }] }`.
2. **Validate.** Compose the per-section Zod schemas (`src/schemas/property`, `src/schemas/tenant`, `src/schemas/tax-id`, `src/schemas/rent`, `src/schemas/expense`, `src/schemas/contract`) into a single `propertyCreationSubmissionSchema`. The composed schema makes per-section keys optional so the omit-when-skipped contract is enforced at the type level. Validate input. The composed schema also enforces:
   - Bundle-graph integrity (cycles, out-of-range indices) — see *Bundle graph rules* in the RPC contract.
   - Bundled rows have at most one of (`bundled_into_rent`, `bundled_into_expense_index`) and no provider attachment.
   - Wizard-collected mime types match the buckets' allowed lists.
   On failure, project the issues per section (per-form scope) and return `{ ok: false, sectionErrors }` — see *Error envelope* and *Server-side projection* below.
3. **Build the RPC payload.** Map section data to RPC arguments:
   - Strip wizard-only UI fields (e.g., `isExtracted`, row touch state, IDs scoped to the wizard).
   - Resolve expense rows that point at a missing-provider draft to a draft index in `p_provider_request_drafts`.
   - Apply the `includes` mapping rules (string → `expense_type[]`) — see *Mapping extraction `includes`* under the `rent` table.
   - Compute the bundle-graph topological order so the RPC inserts parents before children. (RPC re-validates; the action precomputes for clarity.)
4. **Call the RPC.** Pass `p_property_id = draftId`. The RPC returns the success payload, or raises a tagged exception. The action maps tagged exceptions to either a `globalErrors` entry (e.g. `idempotency_owner_mismatch`, `rpc_constraint_violation`, `unknown`) or a per-section field error (e.g. `tax_id_conflict` → `sectionErrors['tax-id'].tax_id`).
5. **Upload contract** (only when contract path and the RPC reports a contract):
   - Use the `storage_path` returned by the RPC. Path format: `{unit_id}/{contract_id}.<ext>` (no bucket prefix). Upload to bucket `contracts`.
   - On success: update `contracts.upload_status = 'uploaded'`.
   - On failure: update `contracts.upload_status = 'failed'`. Do **not** delete the contract row. Surface as a non-fatal warning in the success payload. The success screen / property page offer a re-upload affordance.
6. **Upload provider-request bills.** For each entry in `provider_requests.bill_uploads` (only `'pending'` rows):
   - Upload to bucket `test-bills` at `{provider_request_id}/{test_bill_id}.<ext>`.
   - On success: update `provider_test_bills.upload_status = 'uploaded'`.
   - On failure: update to `'failed'`. Same non-fatal posture.
7. **Send tenant invite emails** for each id in `tenants.invitations_to_email`. Reuse the existing email pipeline (`@/emails/invite-code` + Resend) inline, **not** by calling `sendInvite` (which inserts a fresh row). On send success, `update invitations set last_emailed_at = now() where id = ?`. Email send failures are non-fatal and log only — the row stays `pending` and the landlord can retry from the property page.
8. **Revalidate** `/app` and any property-listing paths via `revalidatePath`.
9. **Return** `{ ok: true, summary }` where `summary` is the RPC payload extended with upload outcome flags:
   - `summary.contract.upload_failed: boolean`
   - `summary.provider_requests.bill_upload_failed_count: int`
   - `summary.tenants.email_failed_count: int`

### Error envelope

The wire format mirrors `z.flattenError(error).fieldErrors` per-form-scope. Every value in a per-form record is `string[]` of i18n keys (e.g. `'invalidExpenseType'`, `'tax_id_conflict'`). The action never returns user-facing strings — translation happens on the client via `useTranslations`.

```ts
// Per-form flat field record. Mirrors `z.flattenError(error).fieldErrors`.
type FlatFieldErrors = Record<string, string[]>

// Per-section shape depends on whether the section renders a single form or
// per-row forms.
//   Flat sections  (property, rent-dates, tax-id, bank): FlatFieldErrors
//   Row sections   (expenses, tenants): Record<rowId, FlatFieldErrors>
type SectionServerErrors = FlatFieldErrors | Record<string, FlatFieldErrors>

type GlobalError = {
  code:
    | 'unauthenticated'
    | 'idempotency_owner_mismatch'
    | 'rpc_constraint_violation'
    | 'unknown'
}

type ServerErrorsResponse =
  | { ok: true; summary: SubmitSummary }
  | {
      ok: false
      sectionErrors?: Partial<Record<SectionId, SectionServerErrors>>
      globalErrors?: GlobalError[]
    }
```

This is the **same shape** that per-section continue actions return (those return one section's slice — see *Continue actions* below). The submit action returns the same shape with potentially many sections set.

#### Why this shape

- **Mirrors what the client form already consumes.** `useWizardForm` calls `z.flattenError(parseResult.error).fieldErrors` and reads `errors[field]?.[0]`. Server emits the same shape so the section component reads server errors with identical access patterns — `serverErrors[field]?.[0]` for flat sections, `rowServerErrors[field]?.[0]` for row sections.
- **Per-row keying for row sections** (expenses, tenants) sidesteps index drift on row delete. Each row form (`ExpenseForm({ id })`) reads its own slice keyed by id; deleting a row drops just that row's errors with no shifting.
- **No dot-paths, no index-keyed paths.** The previous draft of this spec carried `'rows.0.amount_minor'`-style keys on the wire; that's been removed. Field keys inside `FlatFieldErrors` are exactly the field names from the schema (matching what `flattenError` produces).

#### Server-side projection

The action runs the composed schema once for cross-section invariants but produces wire output by re-running per-form parses on the failing slices. This guarantees the wire shape mirrors what each client form parses, with no manual flattening logic:

```ts
// Flat section
const propertyParse = getPropertyInputSchema(country).safeParse(input.property)
if (!propertyParse.success) {
  sectionErrors.property = z.flattenError(propertyParse.error).fieldErrors
}

// Row section — per-row flatten, keyed by row id
const expensesErrors: Record<string, FlatFieldErrors> = {}
for (const row of input.expenses ?? []) {
  const r = expenseRowSchema.safeParse(row)
  if (!r.success) {
    expensesErrors[row.id] = z.flattenError(r.error).fieldErrors
  }
}
if (Object.keys(expensesErrors).length > 0) {
  sectionErrors.expenses = expensesErrors
}
```

Action-level cross-row checks (bundle graph) and RPC tagged exceptions append into the same per-section structures using i18n keys as the array values:

```ts
// Bundle-graph violation on a specific expense row
expensesErrors[rowId] ??= {}
;(expensesErrors[rowId].bundled_into_expense_index ??= []).push('expense_bundle_invalid_reference')

// RPC tax-id collision
sectionErrors['tax-id'] = { tax_id: ['tax_id_conflict'] }

// RPC unmapped failure
return { ok: false, globalErrors: [{ code: 'rpc_constraint_violation' }] }
```

#### Error code catalogue

Codes still exist as a TS literal union at `src/data/properties/actions/create-property-errors.ts`. They show up in two places: as i18n keys inside per-section field arrays (section-scoped codes), or as `globalErrors[].code` (wizard-wide codes). Adding a new code is a deliberate change requiring a new i18n key.

| Code | Where it appears | Section / Field | Source |
|---|---|---|---|
| `unauthenticated` | `globalErrors[]` | n/a | Server action (auth check) |
| `idempotency_owner_mismatch` | `globalErrors[]` | n/a | RPC (defensive) |
| `rpc_constraint_violation` | `globalErrors[]` | n/a | Postgres constraint exceptions not otherwise tagged |
| `unknown` | `globalErrors[]` | n/a | Catch-all for unmapped exceptions |
| `tax_id_conflict` | `sectionErrors['tax-id'].tax_id` | tax-id / `tax_id` | RPC (SQLSTATE 23505 from the live `idx_profiles_tax_id` partial unique on `profiles(tax_id) where tax_id is not null`) |
| `expense_bundle_invalid_reference` | `sectionErrors.expenses[rowId].bundled_into_expense_index` | expenses / row field | Server action bundle-graph check + RPC re-validation |
| Zod schema keys (e.g. `invalidExpenseType`, `required`) | `sectionErrors[section][field]` (or `[rowId][field]`) | per-section, per-field | Composed Zod via `flattenError` |

Non-fatal warnings (`contract_upload_failed`, `bill_upload_failed`, `email_send_failed`) travel via `summary.*` flags on `{ ok: true }` responses and never appear in `sectionErrors` / `globalErrors`. Their i18n keys live under `propertyCreation.success.summary.*` next to the success-screen copy.

### Error wiring on the frontend

Server errors (continue actions and final submit) flow through one persisted store slice and are merged in-place at the section component, alongside `useWizardForm.errors`. No new hook; no extension of `useServerValidationErrors` (which keeps existing non-wizard call sites unchanged).

Wizard client-side validation uses `useWizardForm` (`src/app/app/(focused)/p/new/[draftId]/state/use-wizard-form.ts`): a cached `safeParse` result per section (or per row) feeds `z.flattenError(parseResult.error).fieldErrors`, and errors are shown only for fields in that slice’s touched set. Server errors are kept apart and merged at the call site:

```ts
// Example — property section:
const fieldError = (field: PropertyField) =>
  errors[field]?.[0] ?? getServerError(field)
```

`getServerError` reads from a Zustand selector on `sectionServerErrors[section]` instead of from local `useServerValidationErrors` state. The merge expression stays the same.

#### Persisted slice on the wizard store

```ts
type WizardServerErrorsSlice = {
  sectionServerErrors: Record<SectionId, SectionServerErrors>
  globalErrors: GlobalError[]

  dispatchServerErrorsResponse(response: ServerErrorsResponse): void
  clearFieldServerError(section: SectionId, field: string): void
  clearRowServerErrors(section: SectionId, rowId: string): void
  clearRowFieldServerError(section: SectionId, rowId: string, field: string): void
}
```

`sectionServerErrors[sectionId]` is shaped per the section's form scope (flat or row-id-keyed) per the *Error envelope*. Initial state per section comes from a new per-section export — see below.

Persisted in IndexedDB alongside the rest of the wizard draft. Survives refresh and section navigation. Cleared on successful submit. `PROPERTY_CREATION_STATE_VERSION` increments by 1; the migration drops `sectionServerErrors` and `globalErrors` from older snapshots (wipe-on-bump is acceptable — server errors are transient by design).

#### Per-section `state.ts` adds

Each section's `state.ts` exports a single addition — its server-error default — typed to the section's shape. Aggregated in `state/section-defaults.ts` alongside the existing `defaultSectionData`, `defaultSectionTouched`, `defaultSectionStates`, etc.

```ts
// property/state.ts (flat)
export type PropertyServerErrors = Record<string, string[]>
export function defaultPropertyServerErrors(): PropertyServerErrors { return {} }

// expenses/state.ts (per-row)
export type ExpensesServerErrors = Record<string /* rowId */, Record<string, string[]>>
export function defaultExpensesServerErrors(): ExpensesServerErrors { return {} }
```

No `applyServerErrors`, no `clearServerErrorFields`, no `promoteTouched` exports. Per-section work stops at the default.

#### `dispatchServerErrorsResponse`

> Lives at `state/server-errors-dispatch.ts` as a plain function rather than a store action, so the store stays pure-data per the original spec intent. The store exposes the primitive `setServerErrors(sectionId, updater)` and `setGlobalErrors(next)` actions; the dispatcher composes them.

Cross-section dispatcher that consumes both continue-action and submit responses (both return the same shape):

1. If `response.ok === true`: clear `globalErrors` to `[]`. Section slices are NOT reset here — callers (continue actions) clear their own slice on success, and the submit success path wipes the persisted draft via `clearPersisted`. This keeps every other section's slice untouched on a one-section continue, avoiding the cost of six store writes (and one IDB persist) per click.
2. Otherwise:
   - For each `(section, payload)` in `response.sectionErrors`, **replace** that section's slice in `sectionServerErrors` with `payload`.
   - Replace `globalErrors` with `response.globalErrors ?? []`.
   - Add every section key in `sectionErrors` to `visitedSectionIds` so the section header's validity badge flips on (otherwise an unvisited section with errors stays quiet).

The dispatcher **replaces** rather than merges per-section payloads on a non-ok response: the server's view of that section's errors is authoritative for that round.

#### Continue actions

Today's continue actions (e.g. `validateProperty`) return `{ valid, errors? }` and are wired via `useServerValidationErrors`'s local React state. As part of this work, they switch to returning `ServerErrorsResponse` (`ok: true` on success, `ok: false` with one section's slice on failure) and dispatch into the store via `dispatchServerErrorsResponse`. The wire shape per section already matches what they emit today (`Record<string, string[]>` from `zodIssuesToFieldErrors`), so this is a thin reshape, not a rewrite.

Non-wizard call sites of `useServerValidationErrors` (profile editor, user-menu) are untouched.

#### Section component reads

```ts
// Flat section (property)
const serverErrors = usePropertyCreationState(
  (s) => (s.sectionServerErrors.property ?? {}) as Record<string, string[]>,
)
const fieldError = (field: PropertyField) =>
  errors[field]?.[0] ?? serverErrors[field]?.[0]
```

```ts
// Row form (expense-form, mounted per row)
const rowServerErrors = usePropertyCreationState((s) => {
  const section = s.sectionServerErrors.expenses as Record<string, Record<string, string[]>>
  return section?.[id] ?? {}
})
const typeError = errors.expense_type?.[0] ?? rowServerErrors.expense_type?.[0]
```

#### Clearing on edit / row delete

Components own these clears, mirroring how `setField` / `handlePostalCodeChange` already call `clearServerErrors(...)` inline today:

| Trigger | Call |
|---|---|
| Field edit on a flat section | `clearFieldServerError(section, field)` |
| Field edit on a row | `clearRowFieldServerError(section, rowId, field)` |
| Row delete | `clearRowServerErrors(section, rowId)` |
| Successful continue | Caller clears its own section slice (`setServerErrors(section, () => ({}))`) and dispatches `{ ok: true }` so `globalErrors` clears. |
| Successful submit | `clearPersisted()` wipes the entire IDB record (including server errors) on the success path. |

Per-row keying makes the row-delete path trivial — no index shifting, no "clear all row errors" rule. Other rows' errors stay correct.

#### Section opening on submit failure

When `dispatchServerErrorsResponse` writes a response with `ok: false`:

1. Find the first section with errors in canonical order: `property` → `rent-dates` → `tenants` → `expenses` → `tax-id` → `bank`. Open it via the existing `setActiveSectionId` action.
2. `globalErrors` surface as a destructive toast at the top of the wizard; they don't change the active section.
3. Wizard draft state stays intact. The user fixes, re-submits.

The "first failing section" lookup runs in the wizard component immediately after the action resolves, not inside `dispatchServerErrorsResponse` (the store action stays pure-data).

#### Error visibility without touched-promotion

`useWizardForm.errors` is touched-gated; server errors are not. The section component's merge expression — `errors[field]?.[0] ?? serverErrors[field]?.[0]` — already renders server errors regardless of touched state. No special promotion is needed for visibility. The only related concern is the section-header validity badge, which `dispatchServerErrorsResponse` handles by adding error sections to `visitedSectionIds` (above).

### Storage cleanup model

Because uploads happen **after** the RPC commits, there is no DB-vs-Storage orphan to clean up. The remaining cases are:

- Contract upload fails → contract row exists with `upload_status = 'failed'`. Property is recoverable by re-submitting (same `draftId` short-circuits the RPC, retries the upload to the same path). The property page surfaces a "re-upload contract" affordance.
- Bill upload fails → `provider_test_bills` row exists with `upload_status = 'failed'`. The action's auto-retry pass does **not** re-process `'failed'` rows (auto-retry is for the in-flight retry burst, not for reprocessing rows that have already failed once). The "your bill upload failed, retry?" surface is property-page workstream territory; this spec does not specify it. Engineer-side tooling can prompt a re-upload as an escape hatch until that lands.
- Property page fetches a contract or bill with `upload_status != 'uploaded'` → render a "missing file" state, not a 404 on the file itself.

No Storage-orphan cleanup job is needed.

---

## Validation Strategy

### Single-source Zod schemas

All schemas live in `src/schemas/`, organized by domain:

| File | Status | Owner |
|---|---|---|
| `property.ts` | Exists | (already present) |
| `tenant.ts` | Exists | (already present) |
| `tax-id.ts` | Exists | (already present) |
| `rent.ts` | New | This spec |
| `contract.ts` | New | This spec |
| `expense.ts` | New | This spec |
| `property-creation-submission.ts` | New | This spec |

`property-creation-submission.ts` composes the per-section schemas. Each section is optional in the composed schema so the "skipped sections are omitted" contract is enforced at parse time. Cross-section invariants live here:

- `path === 'contract'` ⟹ `contract` is required, `rent` is required.
- `path === 'no_contract'` ⟹ `contract` is forbidden, `rent` is optional.
- Bundle-graph integrity: `expenses.rows[i].bundled_into_expense_index` must be a valid in-range index, ≠ `i`, with no cycles.
- Expenses bundle exclusivity: if `bundled_into_rent`, no `bundled_into_expense_index` and no provider attachment; if `bundled_into_expense_index`, no `bundled_into_rent` and no provider attachment.
- `extraction.schemaVersion` (when present) must equal `CONTRACT_EXTRACTION_SCHEMA_VERSION`. Mismatched versions get rejected with a `validation_failed` error and the wizard re-runs extraction.

### Refactor existing wizard schemas to derive from canonical

The wizard's checkout-local `steps/checkout/sections/expenses/schemas.ts` currently declares its own `EXPENSE_TYPES`, `EXPENSE_AMOUNT_BEHAVIORS`, `DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE`, and the row Zod schema (`expenseRowSchema`). After `src/schemas/expense.ts` lands:

- The canonical `expense.ts` exports `EXPENSE_TYPES` and `EXPENSE_AMOUNT_BEHAVIORS` from `Constants.public.Enums.*` (or hand-mirrors with a TS-level check that the array length matches `Constants.public.Enums.expense_type.length` to catch drift).
- `DEFAULT_AMOUNT_BEHAVIOR_BY_TYPE` and `COMMON_EXPENSE_TYPES` / `MORE_EXPENSE_TYPES` stay where they are (UI taxonomy, not persistence). They re-import `EXPENSE_TYPES` from canonical.
- `expenseRowSchema` becomes `canonicalExpenseRowSchema.extend({ ...uiOnlyFields })` (ID, draft missing-provider state, isExtracted flag, accordion-related fields). Section validation parses the wizard schema; the action's composed schema parses the canonical shape after stripping UI-only fields.

Audit task for the implementation plan: identify every wizard-local declaration of expense, rent, tenant, contract, or tax-id types and re-anchor them on the canonical schemas. Remove duplicate enum literal arrays. Search seeds: `EXPENSE_TYPES`, `EXPENSE_AMOUNT_BEHAVIORS`, `expenseRowSchema`, `tenantRowSchema` (under `state/__tests__/...` and `steps/checkout/sections/...`).

### Two layers, one source of truth

- **Canonical section schemas** in `src/schemas/` validate the shape that gets persisted. They use database-derived enum constants from `Constants.public.Enums.*` so the schema and the table can never drift.
- **Wizard checkout-local schemas** extend the canonical ones with UI-only fields. The server action strips UI-only fields (or uses `.pick(...)` / `.omit(...)`) before validating against the canonical schemas.

### Server-side enforcement

The client gates "Create property" on per-section validity; the server action re-validates the composed schema. The client's gate is convenience; the server's gate is the trust boundary.

### Error code mapping

The frontend maps each `code` to an i18n key in `messages/{en,es,pt-BR}.json`. The action never returns user-facing strings.

---

## Idempotency

### Property id == draft id

`properties.id = draftId`. The wizard already generates `draftId = crypto.randomUUID()` before any submit. The RPC uses `INSERT INTO properties ... ON CONFLICT (id) DO NOTHING ... RETURNING 1` (see *RPC Behavior* step 3 for the exact algorithm); when the insert is skipped because the row exists, the RPC re-reads the property, builds the success-shape payload, and returns with `is_idempotent_replay = true`. The pattern is concurrent-safe and avoids any SELECT-then-INSERT race window.

### How the frontend uses `is_idempotent_replay`

The user-facing experience is identical between a fresh creation and a replay — both render the new success screen. The flag exists for:

- **Analytics.** Don't double-fire the `property_created` event on a retry. Fire once on `is_idempotent_replay === false`, log a `property_create_replay` event when `true`.
- **Diagnostics.** Server logs distinguish "user retried" from "user created a brand-new property."
- **Email idempotency.** On a replay the server action still receives `invitations_to_email`, but the email sender consults `invitations.status` and `last_emailed_at` (or a debounce window) to avoid double-sending. The first response wins.

The wizard page already handles the bookmark-revisit case via the `/p/new/[id]` → `/p/[id]` redirect, so the only realistic replay is a network glitch between server action and client response. Clean, transparent, no duplicates.

### Storage upload idempotency

Both contract uploads and bill uploads use deterministic, per-row paths:

- Contract: `{unit_id}/{contract_id}.<ext>` in bucket `contracts`
- Bill: `{provider_request_id}/{test_bill_id}.<ext>` in bucket `test-bills`

A retry uploads to the same path; Supabase Storage `upsert: true` overwrites the same object. The DB rows already have `storage_path` populated by the RPC, so paths are stable across retries. The replay path also returns only `'pending'` rows for `bill_uploads` and the contract row when `upload_status != 'uploaded'`, so the action skips already-landed files.

### Tenant email idempotency

The email sender:

1. Reads `invitations.status` immediately before sending. Skip if not `'pending'`.
2. Reads `invitations.last_emailed_at`. If set and within the last 5 minutes, skip (debounces concurrent retries).
3. Sends. On success, `update invitations set last_emailed_at = now() where id = ?`.

The 5-minute window matches the replay path's `invitations_to_email` cutoff so a replay submitted within the same retry burst is a no-op for emails. A user-driven retry beyond 5 minutes will resend — that's the intended escape hatch, not a bug.

---

## Section Persistence Rules

| Section | Status before submit | UI sends payload? | What gets persisted |
|---|---|---|---|
| Property details | always required → completed | Yes | `properties` row + `units` row + landlord `memberships` |
| Rent & dates | required (contract path) / optional (no-contract path) | Yes when present, no when skipped | `rent` row when sent |
| Tenants | optional | Yes when present, no when skipped | One `invitations` row per tenant; `status = 'pending'` if `invite_now`, else `'not_invited'` |
| Expenses | optional | Yes when present, no when skipped | One `charge_definitions` row per expense entry. `provider_requests` rows created or linked (cross-property dedupe) for missing-provider drafts. Bundled rows persisted with `bundled_into_*`. Bill files uploaded to `test-bills` after RPC commit. |
| Your CPF | always required → completed | Yes | `profiles.tax_id` updated only when the RPC determines the column is currently empty |
| Bank account | deferred → coming-soon | No | No persistence side effects |
| Contract upload (Step 1) | depends on path | Yes when contract path | `contracts` row (with extraction columns) + Storage object after RPC commit |

**Rule 1:** Skipped sections are omitted from the server action payload entirely. The wizard's submit-prep code does this projection before calling the action.

**Rule 2:** The data origin (extraction vs manual entry) is irrelevant to persistence — what matters is whether the section is in the payload.

**Rule 3:** The server action treats absence of a section the same as "do not persist." It does not infer intent from `sectionStates` — the projection already happened on the client.

---

## Failure Surface

### Behavior on `{ ok: false, sectionErrors?, globalErrors? }`

1. Dispatch `dispatchServerErrorsResponse(response)` to the wizard store. The action:
   - Replaces each section's `sectionServerErrors[section]` slice with the incoming payload (per-section authoritative).
   - Replaces `globalErrors` with `response.globalErrors ?? []`.
   - Adds every section key in `sectionErrors` to `visitedSectionIds` so the section validity badge flips.
   The store slice is part of the persisted shape so it survives refresh and section navigation, and it's cleared on:
   - Successful submit, which wipes the entire IDB draft (including server-error slices) via `clearPersisted`. `dispatchServerErrorsResponse({ ok: true })` clears `globalErrors` but does not touch section slices.
   - User editing a field, via `clearFieldServerError` / `clearRowFieldServerError` calls the section component already issues from its existing `setField` / `handle*` handlers.
   - Row delete, via `clearRowServerErrors`.
2. The wizard component finds the first section with errors in canonical order: `property` → `rent-dates` → `tenants` → `expenses` → `tax-id` → `bank`. Global errors bypass section opening and surface as a destructive toast.
3. Open that section in the accordion (replacing whichever section was active).
4. Each section component reads its slice from the store via a Zustand selector and merges with `useWizardForm.errors` inline at the call site, exactly like `property/index.tsx` does today (`errors[field]?.[0] ?? serverErrors[field]?.[0]`). For row sections, the per-row form reads `sectionServerErrors.expenses[id]`. See *Error wiring on the frontend* under *Server Action Contract*.
5. Wizard draft state is preserved — the user fixes the issue and clicks Create property again.

### Three error sources, one rendering pipeline

Today the wizard has three potential error sources:

| Source | Today's path | After this spec |
|---|---|---|
| Client-side schema errors (touched-only) | `useWizardForm.errors` (`z.flattenError(parseResult.error).fieldErrors` filtered by touched) | Unchanged |
| Per-section continue-button server actions (e.g., `validateProperty`) | `useServerValidationErrors` local React state, merged inline at the section component | Continue actions return `ServerErrorsResponse` and dispatch into the persisted `sectionServerErrors[section]` slice via `dispatchServerErrorsResponse`. Same inline merge at the call site, just reading from a Zustand selector instead of local hook state. |
| Final submit server action errors | (does not exist yet) | Same `sectionServerErrors[section]` slice. The submit action's response can populate multiple section keys at once. `globalErrors` covers wizard-wide codes. |

Each participating wizard section component swaps `useServerValidationErrors` for a Zustand selector against `sectionServerErrors[section]` plus the existing per-edit clear calls (now hitting `clearFieldServerError` / `clearRowFieldServerError` instead of `clearServerErrors`). The merge expression at the call site (`errors[field]?.[0] ?? serverErrors[field]?.[0]`) is unchanged. See *Error wiring on the frontend* for the full surface.

`useServerValidationErrors` itself stays as-is for non-wizard forms (profile editor, user-menu).

### Property page hardening

The wizard's success path eventually navigates to `/p/[draftId]` via the success screen's "View property" CTA. The property page must handle:

1. `/p/[id]` for a property that doesn't exist → 404.
2. `/p/[id]` for a property the user is not a member of → 404 (don't leak existence).

This is property-page work, not part of this spec's deliverables. The implementation plan adds a thin `notFound()` fallback if the property page hasn't shipped this hardening yet, but otherwise treats it as a prerequisite.

---

## Success Behavior

### Flow on `{ ok: true, summary }`

1. Client: clear the wizard draft from IndexedDB (`actions.clearPersisted()`) — this is the only place the persisted slice (including `sectionServerErrors` and `globalErrors`) gets wiped wholesale. `dispatchServerErrorsResponse({ ok: true })` resets `globalErrors` to `[]` ahead of the wipe; section slices ride along inside the `clearPersisted` call (the dispatcher no longer touches them on `ok: true`).
2. Client: render the **success screen**. Do not navigate directly to the property page.
3. Success screen reads from the `summary` payload — no follow-up fetch needed.

### Success Screen Redesign (in scope)

Creating a property is a milestone for the landlord: they've onboarded their first asset and now want to see what they got. The success screen has two jobs:

- **Confirm what was set up.** Show the relevant facts so the landlord can verify "yes, that's the property I just created."
- **Hand off cleanly.** Two clear next steps: go to the property, or back to the dashboard.

The screen lives in the focused-route shell (same chrome as the wizard), centered, mobile-first.

#### Layout

- Top: a soft success affordance (subtle `success-subtle` surface, single icon, no theatrical animation per `design-system` motion rules).
- Title: a calm confirmation. Copy direction: "Property created." or similar — no exclamation, no over-celebration. The product is doing its job.
- Subtitle: short value-statement reinforcing what just happened in product terms (one sentence). Copy direction: "Bills and payments for this property will be tracked automatically when activity arrives."
- **Summary card** — `Card` primitive with the following sections, each rendered only when the corresponding data is present in the summary payload:
  - **Property** — `property_name` and the formatted address (use existing `formatPropertyName` / address helpers; do not invent new formatting). `property_type` shown as a small label-style line.
  - **Rent** — `amount_minor` formatted in `currency`, `due_day_of_month` (e.g. "every 10th"), and any `includes` rendered as a short translated list ("includes condo, water").
  - **Contract** — "Contract uploaded" when present and `upload_status === 'uploaded'`. If `upload_status === 'failed'`, show a destructive-tone inline notice with a "Re-upload contract" affordance that calls back into the property page's contract upload flow.
  - **Tenants** — "Invitations sent: N" and "Saved for later: M" when both are non-zero. Use `tenants.invited_count` and `tenants.deferred_count` from the summary. Single-line per non-zero count.
  - **Expenses** — "N expenses tracked" with a per-type break-down line ("electricity, water, condo"). Bundled and unspecified counts roll up into the total but are not separately surfaced — they're internal data shape, not user-facing.
  - **Provider requests** — only when `provider_requests.new_count > 0`: "We're adding support for [name]. We'll let you know once automatic tracking is available." Brief, calm, non-apologetic per the editorial tone in the shell spec. Don't expose internal terms like "request" or "profile."
- Bottom: two CTAs.
  - **Primary: "View property"** — navigates to `/p/{property_id}`.
  - **Secondary: "Go to dashboard"** — navigates to `/app`.

The success screen is a pure client component — the data is in the summary payload, no server-component fetch needed. Copy strings live under `messages/{en,es,pt-BR}.json` per `localization`. Visual treatment follows `design-system` and `component-library` (use `Card`, `IconTile`, `Button`, `EyebrowLabel` — do not introduce new primitives).

#### Localization key namespace

All copy lives under `propertyCreation.success.*`. Initial keys (the implementation plan adds the actual strings):

```
propertyCreation.success.title
propertyCreation.success.subtitle
propertyCreation.success.summary.property.title
propertyCreation.success.summary.property.typeLabel
propertyCreation.success.summary.rent.title
propertyCreation.success.summary.rent.dueEvery        -- e.g. "every {ordinal}"
propertyCreation.success.summary.rent.includes       -- "includes {list}"
propertyCreation.success.summary.contract.uploaded
propertyCreation.success.summary.contract.uploadFailed
propertyCreation.success.summary.contract.reupload   -- CTA on failure
propertyCreation.success.summary.tenants.invited     -- "Invitations sent: {count}"
propertyCreation.success.summary.tenants.deferred    -- "Saved for later: {count}"
propertyCreation.success.summary.tenants.emailFailed -- non-fatal warning surface
propertyCreation.success.summary.expenses.tracked    -- "{count} expenses tracked"
propertyCreation.success.summary.expenses.byTypeList -- comma-joined translated types
propertyCreation.success.summary.providerRequests.note -- "We're adding support for {name}..."
propertyCreation.success.summary.providerRequests.billUploadFailed -- non-fatal
propertyCreation.success.cta.viewProperty
propertyCreation.success.cta.goToDashboard
```

Error keys live under `propertyCreation.errors.*` for the codes in the *Error code catalogue*; field-level keys live next to each section's existing message namespace and are looked up at the call site through the section's existing `errors[field]?.[0] ?? serverErrors[field]?.[0]` merge — the same way per-section continue-button errors render today.

#### Out of scope for the success screen

- A "what's next" guide. Ship the calm version first; add tutorials later if telemetry shows the landlord stalls.
- Sharing affordances (invite via copy-link, etc.) — separate workstream.
- Activity preview / fake first-month statement — out of scope.

### Stale draft URL after success

If the user revisits `/p/new/[draftId]` after a successful submit (bookmark, history, accidental navigation):

- The wizard page detects `properties.id = draftId` exists for the current user via a cheap server-component check.
- Redirect to `/p/[draftId]`.

If the property doesn't exist for that draft id, the wizard renders normally (in-progress or abandoned draft).

---

## Provider Requests Handling

### What this spec does

- Creates the `provider_requests` table and its enums (`provider_request_source`, `provider_request_status`).
- Defines the `normalize_provider_name(text)` Postgres function and the `BEFORE INSERT OR UPDATE` trigger that maintains `normalized_provider_name`.
- Adds `provider_test_bills.provider_request_id` (FK with `ON DELETE CASCADE`) and `provider_test_bills.upload_status`.
- The RPC dedupes draft missing-provider entries within a single submit and **also** matches against existing `provider_requests` rows across all landlords (cross-property dedupe — see *Cross-property request dedupe* under *RPC Contract*).
- The RPC inserts `provider_test_bills` rows for any draft with a bill file, linked back to the request by `provider_request_id`.
- The server action uploads bill files to the existing `test-bills` Storage bucket after the RPC commits, mirroring the contract upload pattern.
- Each affected `charge_definitions` row gets `provider_request_id` set when the row's wizard state pointed at a draft (resolved through the dedupe map).
- The wizard's IndexedDB pattern for storing bill `Blob`s during draft is owned by the Expenses workstream (its Phase 2 task 12). This spec consumes whatever pattern lands; it does not replace or extend the persistence mechanism. If Phase 2 task 12 is not yet implemented when this spec lands, the server action's bill-upload pass is wired but receives no bill blobs (the wizard simply doesn't surface a bill-upload UI yet); the RPC still creates the request row without a bill.

### LGPD posture for shared rows

Cross-property dedupe means a `provider_requests` row created by landlord A becomes readable by landlord B once B's `charge_definitions` link to it. The shared row carries provider name, tax id, region, expense type — non-PII for the provider, but `requested_by` is identity for landlord A. Rules:

- **`requested_by` is never surfaced in any UI that crosses landlord boundaries.** The application-layer projection in `src/data/providers/...` strips this field for any read path that isn't scoped to the current user's own requests. The success screen never shows it.
- **Audit `actor_id` for shared rows is not exposed** to landlords other than the original requester. Read-side joins of `audit_events` for `provider_requests` are restricted to engineer-allowlisted users.
- **Tax id leakage:** `requested_provider_tax_id` is *provider* tax id (CNPJ), not landlord tax id. Surfacing it across landlords is acceptable — the same provider's CNPJ is publicly identifiable. We do **not** redact it.
- The full posture follows `.claude/rules/security-lgpd.md` data minimization. The implementation plan adds tests asserting that landlord B's read of a deduped request omits `requested_by`.

### What happens when a linked request is later `declined`

Engineers triaging the queue may decline a provider request (out-of-region, illegitimate, duplicate of a now-supported provider). Rule:

- The `charge_definitions.provider_request_id` FK uses `ON DELETE SET NULL`, but `declined` is a status change, not a delete — the link stays.
- Any UI that reads a charge with `provider_request.status = 'declined'` renders the row as `unspecified` (gray, "provider unavailable") with an optional re-link affordance. **No declined-state copy on the success screen** — the success screen is read at submit time, before declination is possible.
- Notification on declination is property-page work, not in this spec. The implementation plan can punt on user-visible "your request was declined" surfacing for MVP — engineering closes the loop manually until the property-page work picks it up.

### What this spec does not do

- The engineering review surface (`/eng/requests`) — owned by the provider-request / engineering plan.
- The completion resolver that writes `provider_profile_id` onto linked `charge_definitions` rows when engineering ships a profile — owned by the same workstream.
- The in-wizard "match against existing requests" UI step from the Expenses guidepost — providers are optional in the form for the first cut. The RPC handles dedupe; the UI does not surface it.
- A user-facing "declined" surface on the property page — referenced above; out of scope here.

---

## Implementation Boundaries

### This spec's plan owns

- All migrations listed under *Database Migrations*, including:
  - The previously Expenses-Phase-3-owned `charge_definitions` schema changes (drop `charge_type` + legacy `provider_id`, add `expense_type`, `amount_behavior`, provider attachment + bundle columns, the relaxed CHECK constraint).
  - The Expenses-Phase-3 **TS reader migration** (Phase 3 task 16) — every `src/` reader of `charge_definitions.charge_type` is updated in the same PR train as the schema migration. `provider_invoice_profiles.category` alignment (Phase 3 task 14) stays in the Expenses workstream.
  - The new `expense_amount_behavior` enum, the shared `file_upload_status` enum, the `insurance` addition to `expense_type`.
  - The `normalize_provider_name(text)` Postgres function and `provider_requests` trigger.
  - `invitations.last_emailed_at` and `invitations.tax_id` columns; the `not_invited` invitation status value.
- The new transactional RPC (function definition, `SECURITY DEFINER`, audit triggers, grants).
- The `createProperty` server action and the deprecation of the pre-wizard `createProperty` (now `createPropertyDeprecated`) + `create_property_with_membership`.
- All new `src/schemas/` files: `expense.ts`, `rent.ts`, `contract.ts`, `property-creation-submission.ts`.
- Refactor of the wizard's checkout-local `steps/checkout/sections/expenses/schemas.ts` to derive types from the canonical `src/schemas/` files.
- Frontend wiring: call the new `createProperty` wizard action (the pre-wizard FormData-based `createProperty` is now `createPropertyDeprecated` and is not called from the wizard). Migrate every wizard section component from local `useServerValidationErrors` to a Zustand selector against `sectionServerErrors[section]`. The inline merge expression (`errors[field]?.[0] ?? serverErrors[field]?.[0]`) and per-edit clear calls already exist in each section component — only the import / source changes. `useServerValidationErrors` itself stays untouched for non-wizard call sites.
- Persisted `sectionServerErrors` and `globalErrors` slices on the wizard store (added to `partialize`, version bumped, wiped on successful submit). One new store action `dispatchServerErrorsResponse(response)`; three clear helpers `clearFieldServerError`, `clearRowServerErrors`, `clearRowFieldServerError`.
- Continue actions (e.g. `validateProperty`) reshape their return to `ServerErrorsResponse` and dispatch via `dispatchServerErrorsResponse`. The per-section payload they emit today (`Record<string, string[]>`) is already the right shape; this is a thin reshape of the response envelope, not a logic change.
- One new `state.ts` export per section: `defaultPropertyServerErrors()`, `defaultExpensesServerErrors()`, etc. Aggregated in `state/section-defaults.ts`. No `applyServerErrors`, no `promoteTouched`, no per-section dispatcher.
- The new success screen with the layout, content, two CTAs, and localization namespace described in *Success Behavior*.
- Bill upload integration: server action uploads `provider_test_bills` files to the existing `test-bills` bucket and updates `upload_status`. UPDATE RLS policy for own-row `upload_status` flips lives in this spec's migrations.
- Storage bucket + RLS policies for `contracts`. Allowed mime list and 25 MB cap configured on the bucket.
- RLS review across new tables (`contracts`, `rent`, `provider_requests`) and existing affected tables (`charge_definitions`, `provider_test_bills`, `invitations`, the `test-bills` bucket policies). Specifically:
  - Unit-scoped policies on `contracts` and `rent` using `is_unit_member` and the new `is_unit_landlord`.
  - New cross-membership SELECT policy on `provider_requests` to support the cross-property dedupe surface.
  - New UPDATE policy on `provider_test_bills` for own-row `upload_status` transitions.
- The new `is_unit_landlord(uuid)` SQL helper. Lands alongside the contracts Storage migration (or its own migration immediately before, implementer's choice).
- The constants module `src/lib/contract-extraction/schema-version.ts` exporting `CONTRACT_EXTRACTION_SCHEMA_VERSION`. Promote `modelId` and `schemaVersion` into `ContractExtractionResult`.
- Wizard redirect-after-success behavior on `/p/new/[draftId]` revisit (cheap server-component check; redirect to `/p/[id]` when the property exists for the current user).
- Property page 404 fallback (cheap `notFound()` if property is missing or user isn't a member). Anything beyond is property-page work.
- TypeScript types regeneration (`pnpm supabase gen types --local`) after every migration in this work, with the resulting `src/lib/types/database.ts` committed.

### Other plans own

- **Expenses workstream UI work** (Phase 1C / Phase 2 / remaining Phase 3 UI) continues independently. Those plans now consume `src/schemas/expense.ts` shipped here. `provider_invoice_profiles.category` alignment stays in Expenses (Phase 3 task 14).
- **Provider-request engineering plan** owns the eng queue UI, the completion resolver, deeper triage tooling, and any future schema additions to `provider_requests`. The "user-visible declined surface" lives there too.
- **Property detail / settings flow** owns the "missing contract file" affordance, contract re-upload, contract renewals (additional `is_active = false` rows), and the `provider_request_id.status = 'declined'` graceful degradation surface.
- **Bank account workstream (later)** replaces the coming-soon section with real Open Finance integration.

---

## Sequencing Notes

### Supersession and absorption

This spec **supersedes** prior decisions in two adjacent specs. Anyone reading the older specs alongside this one should treat this spec as the source of truth on the listed points:

| Adjacent spec | What this spec changes |
|---|---|
| `2026-04-22-property-checkout-shell-design.md` | Contract upload sequencing. The shell spec implies the contract uploads to Storage **before** the RPC writes any DB rows. This spec inverts: **RPC commits first; contract and bill files upload after, with `upload_status` tracking in-flight state**. The shell spec's "create property" success-flow contract is unchanged in shape, but the underlying upload step is post-RPC. |
| `2026-04-22-property-checkout-shell-design.md` | Success behavior. The shell spec's Section "Submission" is superseded by *Success Behavior* in this spec, which mandates the redesigned success screen with two CTAs in place of direct navigation. |
| `2026-05-06-expenses-checkout-architecture-guideposts.md` (Phase 3 schema work) and `2026-05-07-expenses-checkout-task-order.md` (tasks 13 + 16) | Schema migration of `charge_definitions` is **owned by this spec**, not Expenses. The TS reader migration (task 16) is absorbed into this spec to keep the schema change atomic. `provider_invoice_profiles.category` alignment (task 14) stays in the Expenses workstream. |
| `2026-05-06-expenses-checkout-architecture-guideposts.md` (provider request handling) | This spec **owns** the `provider_requests` table creation, dedupe trigger, and RLS. The Expenses guidepost no longer needs to spec these directly. |

The implementation plan opens by reading these supersessions out loud so reviewers don't bounce between specs.

### This spec absorbs

Previously slated for Expenses workstream Phase 3:

- `charge_definitions` schema migration (drop `charge_type` + legacy `provider_id`, add new columns, relaxed CHECK).
- `expense_amount_behavior` enum.
- `src/schemas/expense.ts` (canonical Zod).
- TS reader migration for `charge_type` consumers (task 16).

The Expenses workstream's UI tasks (Phase 1C provider picker, Phase 2 bill-draft IndexedDB, the `provider_invoice_profiles.category` task 14, etc.) continue independently and now build on top of this spec's schema work.

### Build order

1. **Existing checkout shell work** — accordion, section states, gating, `useActionState`. Already in place; this spec extends the store and adds the new submit path.
2. **This spec** — migrations + RPC + server action + schemas + success screen.
3. **Expenses workstream UI tasks** that haven't shipped — refactor to consume `src/schemas/expense.ts`, then layer on provider picker / bundled-row UI / bill-draft persistence as separate plans.
4. **Provider-request engineering work** — eng queue UI, resolver, triage, declined-state UI. Independent.

This spec does not depend on the bank account work. It explicitly creates `provider_requests` so the eng workstream can layer on top.

---

## Testing Strategy

The implementation plan owns the actual test files; this spec locks the **posture** so the plan can't ship the RPC and action without coverage of the trickiest bits.

### Server action: full integration test (real Supabase, real RPC)

Per `testing` skill, server actions get integration tests using the local Supabase instance. The action's test harness covers:

| Scenario | Asserts |
|---|---|
| First-write success on contract path with rent + tenants + expenses + 1 provider request + bill | `is_idempotent_replay = false`; all rows present; contract upload landed; bill upload landed; `last_emailed_at` set on `pending` invites |
| First-write success on no-contract path with no rent | `contract`, `rent` are null; everything else proceeds |
| Idempotent replay: call action twice with same `draftId` and the same payload | Second call returns `is_idempotent_replay = true`; same row counts; `last_emailed_at` not bumped within 5 min window |
| Idempotent replay with `'pending'` contract upload from prior call | Replay returns the pending bill / contract row in `bill_uploads` / `contract`; action retries the upload; `upload_status` flips to `'uploaded'` |
| Bundle graph: cycle in expenses | Returns `expense_bundle_invalid_reference`; no DB writes; replay won't short-circuit (no property row exists) |
| Bundle graph: out-of-range index | Returns `expense_bundle_invalid_reference`; no DB writes |
| Bundle graph: self-bundle (`i == bundled_into_expense_index`) | Returns `expense_bundle_invalid_reference`; no DB writes |
| Bundle graph: `bundled_into_rent` AND `bundled_into_expense_index` set | Returns `expense_bundle_invalid_reference`; no DB writes |
| Tax id update: empty → set | RPC returns `tax_id_updated = true`; profile row is updated |
| Tax id update: already set | RPC returns `tax_id_updated = false`; profile row unchanged |
| Cross-property dedupe by tax id | Two submits in different properties with same `requested_provider_tax_id` produce one `provider_requests` row, two `charge_definitions` rows linked to it |
| Cross-property dedupe by normalized name | Two submits with `"Floripa Energia"` and `"floripa energia ltda"` collapse to one request |
| RLS: landlord B reads a deduped request via charge linkage | Returns the row; `requested_by` is filtered out (LGPD posture) |
| Contract upload failure (mock Storage to fail) | DB is preserved; `contracts.upload_status = 'failed'`; action returns `{ ok: true, summary: { contract: { upload_failed: true } } }` |
| Email send failure (mock Resend to fail) | `invitations.status` stays `'pending'`; `last_emailed_at` not set; action returns `{ ok: true, summary: { tenants: { email_failed_count: N } } }` |

### Unit tests

- `createPropertyCore` (the testable wrapper per `testing` skill) — covers the validation phase.
- The composed `propertyCreationSubmissionSchema` — covers cross-section invariants and bundle-graph rules.
- `normalize_provider_name` — table-driven SQL test for known input → expected output.
- Wizard store server-error slice — table-driven test for `dispatchServerErrorsResponse` covering: (a) `ok: true` clears only `globalErrors` and leaves section slices untouched (callers own their own section's clear on success); (b) `ok: false` with `sectionErrors` replaces (not merges) per-section payloads and adds those sections to `visitedSectionIds`; (c) `clearFieldServerError(section, field)` removes one key from a flat section; (d) `clearRowServerErrors(section, rowId)` drops a row's full record; (e) `clearRowFieldServerError(section, rowId, field)` removes one field from a row's record. Plus a persistence-bump migration test that confirms older snapshots wipe their server-error slices on load.
- A representative wizard section integration test (e.g. expenses) — covers (a) submit returns `ok: false` with row-keyed errors → first failing section opens, error renders inline on the right row; (b) editing a row field calls `clearRowFieldServerError` and the error disappears; (c) deleting a row calls `clearRowServerErrors` and other rows' errors stay intact.

### What's explicitly not tested at this layer

- The Storage RLS itself — tested via Supabase's policy tests at the migration level, not via the server action.
- The `redeem_invite` RPC — covered by existing tests; this spec doesn't change it.
- Engineering review surface — owned by the provider-request workstream.

---

## Rollback / Forward-only Posture

The migrations in this spec are **forward-only**. Down-migrations are not provided. Rationale: the destructive drops (`charge_type`, `units.due_day_of_month`, legacy `provider_id`) lose information that no auto-generated reversal can reconstruct, and Supabase's migration runner does not invoke down-migrations on rollback anyway.

The recovery posture is:

- **Pre-deploy:** Supabase database backup (point-in-time recovery is enabled in the project plan). The migration train runs in staging first; verify TypeScript types compile and integration tests pass before promoting.
- **Reversible additions** (new tables, new columns with defaults, new enums) — can be undone by writing a forward "revert" migration that drops them. Acceptable for early-shipping rollback.
- **Destructive drops** — `charge_type`, `units.due_day_of_month`, legacy `provider_id`. If a critical bug surfaces post-deploy that can't be patched forward, the recovery is **point-in-time restore** of the affected tables, not a SQL down-migration. The implementation plan documents the restore command for the on-call engineer.
- **Feature gating** — the new wizard submit path can be put behind a PostHog feature flag (per `analytics` skill — PostHog is the project's only flag/analytics surface) so the new RPC is wired but not user-reachable until verified. Worth doing for the rollout.

The TS reader migration absorbed from Expenses Phase 3 makes the schema change non-trivially reversible — every reader is updated in the same PR train, so a forward-only revert would have to revert the readers too. The implementation plan stages the change as one schema migration + one TS PR (both gated on the same feature flag, both deployed together) so a single revert is coherent.

---

## Open Questions

These are not blockers for plan-writing but should be resolved during implementation:

1. **Email send transport.** Tenant invitation emails fire via Resend per `email-templates`. The exact integration point (inline in the server action vs. a queued job) is an implementation detail. Sequencing emails after the RPC commit but before the server action returns is acceptable for MVP given expected volume.
2. **Contract bucket signed URL flow.** RLS-driven access works for direct queries from the app. The property page's contract download likely needs short-lived signed URLs; the implementation plan picks the URL-minting flow (Supabase `createSignedUrl` from the server with a small TTL).
3. **Bill-draft IndexedDB pattern timing.** This spec wires the bill-upload pass in the server action. If the Expenses workstream's Phase 2 task 12 (bill blob persistence) hasn't shipped, the wizard simply doesn't supply blobs — provider requests still get inserted, just without files. No blocking dependency.
4. **Re-extraction overwrite vs versioning.** This spec accepts overwrite for MVP — a re-extraction overwrites the prior `extraction_data` on the same row. Versioning is forward-only (a future `contract_extractions` history table). The boundary is "ship cheaper now, design for clean migration later." If dispute volume reveals a need for per-extraction history before MVP launches, revisit.
5. **Declined-request user surface.** Engineers may decline a `provider_requests` row that has dependent `charge_definitions`. This spec defers user-visible "your request was declined" to the property-page workstream. The interim behavior is silent graceful degradation (charge renders as `unspecified`). If this proves bad post-MVP, the property-page work picks up an in-app notification.

### Resolved during this spec's iteration

For history; do not relitigate without strong reason:

- **Idempotency pattern.** `INSERT ... ON CONFLICT (id) DO NOTHING`, then re-read on conflict. Concurrent-safe by construction — no SELECT-then-INSERT race.
- **`file_upload_status` enum naming.** Generic up front so future statuses on either bills or contracts don't force a rename. Resolves the prior open question about `contract_upload_status` reuse.
- **`extraction_schema_version` default.** `not null default 0`, where `0` is a sentinel for "not extracted yet."
- **Re-uploading the contract during the wizard's same submit.** Out of scope (single contract per submit). Multi-contract / renewal UX is property-page work.
- **Tax id collision posture.** RPC raises `tax_id_conflict`; action emits `sectionErrors['tax-id'] = { tax_id: ['tax_id_conflict'] }`. The partial unique index `idx_profiles_tax_id` on `profiles(tax_id) where tax_id is not null` is live (shipped in `20260413120000_billing_intelligence_profiles.sql`), so this is the active error path, not a hypothetical future one.
- **Provider request dedupe LGPD.** `requested_by` is filtered out of any cross-landlord read path. `requested_provider_tax_id` (provider CNPJ) is fine to expose.

---

## Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Final boundary | One transactional Postgres RPC | Atomic all-or-nothing semantics for property + contract row + rent + invitations + expenses + provider requests + provider test bills. Storage stays outside the transaction. |
| Reuse vs new | New RPC + new server action; deprecate the old | Existing surfaces are single-section; evolving them creates a confusing migration. Fresh names + clean deprecation. |
| Idempotency key | `properties.id = draftId` | Natural primary key. No extra column. Wizard URL becomes property URL after success. |
| Idempotency pattern | `INSERT ... ON CONFLICT (id) DO NOTHING`, re-read on conflict | Concurrent-safe by construction; no SELECT-then-INSERT race. |
| Idempotent replay | Returned via `is_idempotent_replay: boolean` with replay-payload assembly path | User sees the same success screen; flag is for analytics + email-send debounce. `new_count` / `deduped_count` are nullable on replay because they're not derivable. |
| Storage upload order | After RPC commits | Avoids pre-creation gymnastics. Contract / bill rows hold deterministic paths; uploads happen against known targets. **Supersedes** the shell spec's "upload first" implication. |
| Storage path (contract) | `{unit_id}/{contract_id}.<ext>` in bucket `contracts` | Stored value matches `storage.objects.name` (no bucket prefix). Unit-scoped because contracts are unit-scoped — multi-unit properties hold multiple unrelated leases. |
| Storage path (bill) | `{provider_request_id}/{test_bill_id}.<ext>` in bucket `test-bills` | Same convention — bucket is implicit. Request-scoped, deterministic, retry-safe. |
| Storage path storage | Stored on the row | Migration freedom; supports multiple files; existence is explicit. |
| At-most-one active contract | Partial unique index `(unit_id) where is_active = true and deleted_at is null` | Defense-in-depth; concurrent re-uploads or future bugs can't leave two active rows. Unit-scoped because contracts are per-tenancy. |
| Storage RLS (contracts) | Unit-membership-driven via path-extracted `unit_id`; uses `is_unit_member` and new `is_unit_landlord` helper | Tenants on the unit read; the unit's landlord writes. Robust to multi-unit properties and ownership transfers. |
| `contracts` and `rent` scope | Unit-scoped (FK to `units`, not `properties`) | A rental contract is one tenancy on one unit; a multi-unit property holds multiple unrelated leases. Mirrors `charge_definitions`, `statements`, `source_documents`. Avoids future rework when multi-unit ships. |
| `is_unit_landlord(uuid)` helper | New SQL helper that joins `memberships` ↔ `units` to find a landlord membership for the unit's property | Existing helpers don't cover this case. The join also makes the helper robust to mixed historical state: landlord memberships are inserted with `unit_id IS NULL` from this point forward, but older landlord rows may have `unit_id` set due to the `20260327120000_memberships_unit_id.sql` backfill. |
| Extraction storage | JSONB columns on the `contracts` row, plus `extraction_model` and `extraction_schema_version` (default 0) | One row per upload. Re-extraction is a column update. Model + schema version on the row enable targeted re-extraction and shape-evolution safety. Token/latency telemetry stays in PostHog. |
| Re-extraction | Overwrite on the same row (MVP) | Source PDF is canonical; re-extraction is repeatable. Versioning is forward-only via a future history table. |
| `extraction_schema_version` constant | `src/lib/contract-extraction/schema-version.ts` exports `CONTRACT_EXTRACTION_SCHEMA_VERSION` | Single source of truth; bumped on shape change. Imported by extractor and persistence. |
| `file_upload_status` enum | One generic enum, used by `contracts` and `provider_test_bills` | Avoids a future rename if we add bill-specific statuses. Resolves prior open question. |
| `insurance` expense_type | Added to enum in this spec's migration | Wizard already references `insurance`; without this addition, persistence would fail. |
| `expense_type` mapping for `rent.includes` | Wizard maps extraction strings → enum, "rent" dropped, unknowns → `'other'` | Keeps DB column strongly-typed; user can re-classify in the bundled-rent UI. |
| Bundle graph validation | Zod + RPC reject cycles and out-of-range; no self-bundle (`bundled_into_charge_id <> id`) | Defense-in-depth on a structurally invalid graph that would corrupt UI rendering. |
| `rent.adjustment_value` | Split into `adjustment_amount_minor` + `adjustment_basis_points` with CHECK | Same column for two different units of measure was ambiguous. CHECK enforces exactly-one-non-null per method. |
| `charge_definitions.name` | Stays `not null` | "Unspecified" applies to provider attachment, not to expense identity. Every row needs a name. |
| `charge_definitions.provider_id` legacy column | Dropped | Superseded by `provider_profile_id` and `provider_request_id`. |
| `charge_definitions.bundled_into_charge_id` FK | `ON DELETE RESTRICT` (+ no self-bundle) | Prevents silent orphaning of bundled children. |
| `charge_definitions.provider_request_id` FK | `ON DELETE SET NULL` | Engineers can purge stale requests without breaking dependent charges. |
| Validation | Zod schemas in `src/schemas/`, shared client/server | Single source of truth. No duplicated server schemas. Wizard checkout-local schemas derive from canonical. |
| Error shape | `{ ok, sectionErrors?, globalErrors? }`. Per-section payload mirrors `z.flattenError(error).fieldErrors`: flat `Record<field, string[]>` for single-form sections, `Record<rowId, Record<field, string[]>>` for row sections. Same shape returned by both continue actions and the final submit. | Mirrors what the client form already consumes (`useWizardForm` does `flattenError` internally), so no client-side translation. Per-row keying sidesteps row-delete index drift. Codes are i18n keys directly. |
| Global errors | Separate `globalErrors: GlobalError[]` array on the response | Wizard-wide codes (`unauthenticated`, `idempotency_owner_mismatch`, `rpc_constraint_violation`, `unknown`) don't fit a section, surface as a toast. |
| Error rendering | Section components read server errors via a Zustand selector on `sectionServerErrors[section]` and merge at the call site with `useWizardForm.errors` (e.g. `errors[field]?.[0] ?? serverErrors[field]?.[0]`). No wizard-specific hook for server errors; `useServerValidationErrors` stays for non-wizard forms only. | Client validation is touch-gated `z.flattenError`; server errors always merge in when present. Persisting server errors in the store keeps them across refresh and section navigation. |
| Server error persistence | New `sectionServerErrors` and `globalErrors` slices in the persisted wizard store; persistence version bumps | Survives refresh; cleared on success, field edit, or row delete (component-driven). Both continue and submit responses funnel through one `dispatchServerErrorsResponse` action. |
| Per-section error surface | One new `state.ts` export per section: `defaultPropertyServerErrors()` (flat) or `defaultExpensesServerErrors()` (row-keyed) returning the empty default. No per-section apply / clear / promote handlers. | Section owns its shape (flat vs row-id-keyed). Reads and clears happen at the section component, where the section already knows its form scope. |
| Row-section error keying | Row-id-keyed (`Record<rowId, Record<field, string[]>>`), not index-keyed dot-paths | Row delete drops a row's errors with no index shifting; each row form reads `sectionServerErrors[section][rowId]` to match its own `useWizardForm` instance. |
| Skipped sections | UI omits from server payload | Simpler than server-side filtering. Server treats absence as "do not persist". |
| `tenants[i].invite_now=false` | `invitations.status = 'not_invited'`; no `role` from input; `code` from TS-side `generateInviteCode()`; `expires_at = now() + 30 days`; `last_emailed_at = null` until sent | Matches existing redemption flow contract. Distinguishes "deferred send" from "sent but unredeemed". |
| Tax id update | RPC, not server action; collisions raise `tax_id_conflict` | Logic is "is the column empty?" — belongs in the transaction. Tagged exception lets the action route the i18n key into `sectionErrors['tax-id'].tax_id`. |
| Expense provider attachment | Optional (4th `unspecified` state) | Ships the feature. Constraint relaxes from "exactly one of 3" to "at most one of 4". |
| Cross-property request dedupe | RPC handles it; LGPD posture filters `requested_by` | Tax-id, then provider-id+region, then normalized-name+region. Conservative; engineering can collapse false negatives. Composite indexes match each priority. |
| `provider_requests.normalized_provider_name` | Regular column maintained by trigger (not generated) | Normalizer evolves over time; `GENERATED ALWAYS AS` requires IMMUTABLE. Trigger + RPC both invoke the same `normalize_provider_name(text)` SQL function. |
| `provider_requests` SELECT RLS | Owner OR engineer OR member-of-property-with-linked-charge | Cross-property dedupe means downstream landlords need to read the row to render their UIs. |
| `provider_test_bills` UPDATE RLS | New "Users can update upload_status on own test bills" with `with check` clamping to `('uploaded','failed')` | Server action needs to flip status post-upload; missing today. |
| `provider_test_bills.mime_type` | Default dropped; CHECK constraint `('application/pdf','image/jpeg','image/png','image/webp')` | Wizard uploads photos of bills, not just PDFs. |
| Bill uploads | In scope (RPC inserts row, server action uploads) | Same pattern as contract. Bucket already exists. |
| Bank account section | Deferred → coming-soon UI | Not load-bearing for first product cut. |
| Stale draft URL | Redirect `/p/new/[draftId]` → `/p/[draftId]` after success | Matches the collapsed identity model. |
| Property page 404 | Hardened to handle missing/forbidden | Avoids leaks; required for redirect to be safe. |
| Success behavior | Show new success screen with two CTAs (View property / Go to dashboard); strict localization namespace under `propertyCreation.success.*` | Milestone moment, not just a redirect. Confirms what was set up; hands off cleanly. |
| Success screen redesign | In scope | Creating a property terminates in this surface; building it together avoids a follow-up spec. |
| `due_day_of_month` | Moves from `units` to `rent` | Per-tenancy, not per-unit. |
| `units.currency` | Stays | Property denomination default; rent has its own currency for cross-currency contracts. |
| TS reader migration for `charge_type` | Absorbed into this spec from Expenses Phase 3 task 16 | Schema drop + reader update must land together to avoid runtime breakage. |
| `provider_invoice_profiles.category` alignment | Stays in Expenses workstream (Phase 3 task 14) | Touches provider data shape, not `charge_definitions`. Out of scope here. |
| Migration posture | Forward-only; recovery via Supabase point-in-time restore | Down-migrations on destructive drops can't reconstruct lost data. Feature flag the new RPC at rollout. |

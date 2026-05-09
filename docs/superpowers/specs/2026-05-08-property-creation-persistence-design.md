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

---

## Out Of Scope

- **Bank account section.** Open Finance bank connection is deferred. The Bank account section becomes a coming-soon informational card with no persistence side effects.
- **Provider-request engineering review surface.** This spec creates the `provider_requests` table so the RPC can write to it; the eng queue UI, resolver, and triage heuristics are owned by the provider-request workstream.
- **Editing properties after creation.** Owned by the property detail / settings flows.
- **Wizard UI changes** beyond the redirect-after-success behavior, the new submit-errors slice in the store, and the new success screen described below.
- **Rent + IPCA adjustment scheduling logic.** This spec persists rent rows; the adjustment engine that computes future rent values is later work.
- **Provider matching / fuzzy search algorithm.** The RPC accepts the resolved `provider_profile_id` or `provider_request_id` selected by the wizard UI — it does not match. Cross-*request* dedupe is handled (see *Provider Requests Handling*); cross-*provider* matching at submit time is not.
- **In-wizard mandatory existing-request match step.** The Expenses guidepost specified a UI step that forces the landlord to match against existing requests before creating a new one. That step is not being built now — providers are optional in the expense form for the first cut. The RPC still dedupes cross-property at submit time so abandoned requests don't multiply.

---

## Code Audit

### What exists today

| Asset | Location | State |
|---|---|---|
| `properties` table | `20260318120000_data_model_foundation.sql` | Address columns, `country_code`, `created_by`, `property_type` (added `20260430120000`) |
| `units` table | foundation | One unit per property in current usage |
| `memberships` table | foundation | `(user_id, property_id, role)` unique |
| `invitations` table | foundation, evolved | Has `property_id`, `unit_id`, `invited_email`, `invited_name`, `role`, `status`, `code`, `source`, `inviter_id` |
| `invitation_status` enum | foundation | `pending`, `accepted`, `expired`, `cancelled` |
| `charge_definitions` table | foundation | Uses old `charge_type` enum; Expenses workstream Phase 3 is migrating |
| `expense_type` enum | `20260417120100_expense_type_enum.sql` | Created but not yet attached to `charge_definitions` |
| `property_type` enum + column | `20260417120000`, `20260430120000` | Live |
| `audit_log_trigger()` + `audit_events` | `20260331120000_audit_triggers_and_allocation_delete.sql` | Reusable for new tables |
| `is_property_member()`, `is_property_landlord()` | foundation | RLS helpers |
| `create_property_with_membership` RPC | `20260323120000_property_creation_rpc.sql` (+ later patches) | Creates property + membership + 1 unit. Single-section. |
| `createProperty` server action | `src/data/properties/actions/create-property.ts` | FormData-based, single section, returns `{ success, propertyId, unitId, errors }` |
| `propertyInputSchema` (Zod) | `src/schemas/property.ts` | Property-section only; country-aware address |
| `tenantInputSchema` (Zod) | `src/schemas/tenant.ts` | Exists |
| `taxIdInputSchema` (Zod) | `src/schemas/tax-id.ts` | Exists |
| Wizard store | `src/app/app/(focused)/p/new/[draftId]/state/store.ts` | Holds full section data + contract `File` Blob |
| `draftId` generation | `src/app/app/(focused)/p/new/page.tsx` | `crypto.randomUUID()` → redirect to `/p/new/[draftId]` |
| Storage buckets | foundation | `source-documents`, `payment-receipts`, `example-documents` only |

### What is missing

The implementation plan must add:

- A `contracts` table with extraction storage (extraction stored as JSONB columns on the contract row — see *Extraction Storage* below)
- A `rent` table (rent currently leaks into `charge_definitions` with `charge_type='rent'`, which the post-pivot model rejects). `due_day_of_month` moves from `units` to `rent`.
- A `provider_requests` table
- A `contracts` Storage bucket + bucket RLS
- A `provider_request_id uuid` column on `provider_test_bills` so request-tied bill uploads can be linked
- An `invitation_status = 'not_invited'` enum value (per shell spec; lets the landlord defer the email)
- An `invitations.tax_id text` column (per shell spec; pre-fills tenant signup)
- A `properties` row-level idempotency posture: `id` becomes the wizard's `draftId` rather than a server-generated UUID (no extra column needed — see *Idempotency*)
- The `charge_definitions` schema changes that the Expenses guidepost previously assigned to its Phase 3 (drop `charge_type`, add `expense_type`, `amount_behavior`, `provider_profile_id`, `provider_request_id`, `bundled_into_rent`, `bundled_into_charge_id`). **Provider attachment is optional**, not required (see *Charge Definitions* below).
- A new `expense_amount_behavior` enum (`fixed`, `variable`, `unknown`) per the Expenses guidepost
- Canonical `src/schemas/expense.ts`, `src/schemas/rent.ts`, `src/schemas/contract.ts` (each new — none exist today)
- Refactor of the wizard's checkout-local `expense-row-schema.ts` to derive its types from `src/schemas/expense.ts` instead of redeclaring them
- A new transactional RPC that supersedes `create_property_with_membership`
- A new server action `submitPropertyCreation` that wraps validation, RPC call, contract + bill uploads, error mapping, and cleanup
- A persisted `submitErrors` slice on the wizard store so submit errors survive refresh
- Extension of the existing `useServerValidationErrors` pattern to consume submit errors, so per-section forms render submit errors via the same `getFieldError` pipeline they already use for per-section continue actions
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

### `contracts` table

```
id                          uuid primary key default gen_random_uuid()
property_id                 uuid not null references properties(id) on delete cascade
storage_path                text not null            -- contracts/{property_id}/{contract_id}.<ext>
mime_type                   text not null
bytes                       integer
original_filename           text
upload_status               contract_upload_status not null default 'pending'
extraction_data             jsonb                    -- ContractExtractionLlmResult shape
extraction_language         text                     -- 'pt-br' | 'en' | 'es'
extraction_model            text                     -- e.g. 'claude-sonnet-4-6'; free-form to match env override
extraction_schema_version   smallint                 -- bumps when ContractExtractionLlmResult shape changes
extracted_at                timestamptz              -- when extraction completed
raw_text                    text                     -- full contract text from extractText()
uploaded_by                 uuid not null references profiles(id)
is_active                   boolean not null default true
created_at                  timestamptz not null default now()
updated_at                  timestamptz not null default now()
deleted_at                  timestamptz
```

- Column name is `upload_status`; the enum type is `contract_upload_status` with values `pending`, `uploaded`, `failed`.
- `is_active` lets the property point at the current contract while preserving renewals/addendums as additional rows.
- Indexes: `(property_id)`, `(property_id) where is_active = true`.
- Audit trigger: `audit_<contracts>` using existing `audit_log_trigger()`.
- RLS: members read; landlords insert/update/delete (mirrors `properties`).

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

`ContractExtractionLlmResult` will evolve (new fields, restructured fields). Without a version on the row, old JSONB silently becomes harder to interpret as the typed shape moves. The column is a `smallint`; bump it on every shape change in `src/lib/contract-extraction/types.ts` and `schema.ts`. Initial value is `1`.

#### What the existing extraction code needs

`extractContract` in `src/lib/contract-extraction/extract-contract.ts` already knows the model id at extraction time but only emits it through the optional `onTelemetry` callback — it isn't on `ContractExtractionResult`. The implementation plan promotes `modelId` (and the new `schemaVersion` constant) into the result shape so the persistence path can read it without a side-channel. Token / latency telemetry continues to flow through the existing PostHog callback; we are explicitly **not** mirroring it onto the row in this work.

### `rent` table

```
id                  uuid primary key default gen_random_uuid()
property_id         uuid not null references properties(id) on delete cascade
unit_id             uuid not null references units(id) on delete cascade
amount_minor        integer not null
currency            text not null
due_day_of_month    integer not null
start_date          date
end_date            date
adjustment_frequency text             -- 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'other'
adjustment_method    text             -- 'index' | 'fixed_amount' | 'fixed_percentage' | 'other'
adjustment_index     text             -- 'IPCA', 'CPI', etc., when method = 'index'
adjustment_value     integer          -- minor units for fixed_amount; basis points for fixed_percentage
includes             expense_type[]   -- e.g. ['condo', 'water'] when rent is bundled
created_by          uuid not null references profiles(id)
created_at          timestamptz not null default now()
updated_at          timestamptz not null default now()
deleted_at          timestamptz
```

- Money: `amount_minor` (integer) + `currency` (text). No floats. Per `data-modeling`.
- Adjustment fields are nullable; rent without an adjustment clause is valid.
- `includes expense_type[]` carries the bundled-rent affordance — references the canonical `expense_type` enum so callers don't have to translate strings. Empty array (or null) means rent is just rent.
- `due_day_of_month` lives here, not on `units`. Rent is per-tenancy; the due day is a tenancy concern.
- Indexes: `(property_id)`, `(unit_id)`.
- Audit trigger.
- RLS: members read; landlords manage.

The unit-vs-property question for rent: rent is tied to a tenancy on a unit, but the MVP creates one unit per property. Rent rows reference both `property_id` (for fast property-scoped reads) and `unit_id` (correctness). When multi-unit support arrives, rent already speaks unit.

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
normalized_provider_name  text                                   -- generated/lowercased for dedupe
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
- `normalized_provider_name` is a generated column (lowercased, whitespace-collapsed, generic-suffix-stripped) used for fuzzy dedupe. Implementation plan picks the exact normalizer.
- Audit trigger.
- RLS: requesters read their own rows; engineers (per existing engineer allowlist) read all and write status. Insert path goes through the RPC.

The link from a request to its uploaded sample bill goes through `provider_test_bills.provider_request_id` (added by this spec — see below).

The link from a charge definition to its request goes through `charge_definitions.provider_request_id` (added by this spec under *Charge Definitions*).

### `charge_definitions` modifications

The Expenses guidepost previously assigned this to its Phase 3. Moved into this spec because the RPC writes here.

- New enum `expense_amount_behavior`: `fixed`, `variable`, `unknown`.
- Drop `charge_type` column.
- Add columns:
  - `expense_type expense_type` (nullable for now — the canonical enum is already present at `20260417120100`)
  - `amount_behavior expense_amount_behavior not null default 'unknown'`
  - `provider_profile_id uuid references provider_invoice_profiles(id)` — nullable
  - `provider_request_id uuid references provider_requests(id)` — nullable
  - `bundled_into_rent boolean not null default false`
  - `bundled_into_charge_id uuid references charge_definitions(id)` — nullable
- Constraint: at most one of the four states is set per row. Specifically:
  - At most one of `provider_profile_id`, `provider_request_id` is non-null.
  - When either bundle field is set, both provider columns must be null.
  - When `bundled_into_rent = true`, `bundled_into_charge_id` is null.
  - All four columns null is **valid** — represents "expense recorded but no provider chosen yet" (the `unspecified` state).

The original Expenses guidepost specified an "exactly one of three states" check constraint. This spec relaxes that to "at most one of four states" so the wizard can ship without forcing provider selection. The `unspecified` row carries `expense_type`, `amount_behavior`, `name`, optional `amount_minor`/`currency` — enough to be a useful list entry while leaving provider attachment for later.

#### Pre-implementation gate (per Expenses guidepost)

Before running this migration, verify `select count(*) from charge_definitions where charge_type = 'rent'` is zero (rent should not be in this table under the new model). If non-zero, stop and decide: backfill into the new `rent` table or treat as disposable test data.

### `provider_test_bills` modifications

```
alter table provider_test_bills
  add column provider_request_id uuid references provider_requests(id),
  add column upload_status contract_upload_status not null default 'pending';
create index idx_provider_test_bills_provider_request_id on provider_test_bills(provider_request_id);
```

- `provider_request_id` lets bills uploaded as part of a missing-provider draft attach to the request that produced them.
- `upload_status` mirrors the `contracts` pattern so a row's existence is decoupled from whether the file actually landed in Storage. Reuses the `contract_upload_status` enum (rename the type to a more generic `file_upload_status` if the implementation plan prefers — name is an implementation detail).
- The `source` column already supports `'provider_request'` — no enum change needed.
- Existing rows backfill: `update provider_test_bills set upload_status = 'uploaded'` (every existing row is for already-uploaded engineer/playground bills).
- RLS review: the existing "Users can upload test bills" policy (auth.uid() = uploaded_by) covers the wizard's insert path. Existing engineer-read policies cover triage. The implementation plan verifies whether the wizard's `update upload_status` after upload requires a new "Users can update own test bills" policy or can rely on engineer write-after-insert via the RPC.

### `invitations` modifications

- `alter type invitation_status add value 'not_invited'`
- `alter table invitations add column tax_id text`
- No backfill needed for `tax_id`; pre-existing rows are accepted/pending and the column is informational.

### `properties` modification: collapse draft id and primary key

The wizard already generates `draftId = crypto.randomUUID()`. The RPC accepts a `p_property_id uuid` argument and uses it as the row's primary key — `properties.id = draftId`.

This requires:

- No new column. `properties.id` is the primary key; the RPC inserts with the explicit id.
- The RPC's idempotency check: `select id from properties where id = p_property_id and created_by = auth.uid()`. If found, return it; if `created_by` differs (impossible under normal flow but cheap to guard), raise.
- Existing properties created via the old RPC stay valid; their ids are random UUIDs that no future wizard-redirect will collide with.

### `contracts` Storage bucket

- Create bucket `contracts`, private (`public = false`).
- RLS on `storage.objects` for `bucket_id = 'contracts'`:

```
SELECT  ↦ user is in property_memberships for (storage.foldername(name))[1]::uuid
INSERT  ↦ user has role 'landlord' on that property
UPDATE  ↦ user has role 'landlord' on that property
DELETE  ↦ user has role 'landlord' on that property
```

Tenants get read access by being members. Only the landlord can replace or delete the file. Path encoding `contracts/{property_id}/{contract_id}.<ext>` makes the RLS join trivial.

---

## RPC Contract

A single transactional Postgres function: `create_property_with_draft` (or similar; final name is an implementation detail). `SECURITY DEFINER`, `set search_path = public`, granted to `authenticated`.

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

1. Verify `auth.uid()` is set; raise otherwise.
2. **Idempotency check.** `select id from properties where id = p_property_id and created_by = auth.uid()`. If found, return a payload matching the success-path shape with `is_idempotent_replay = true`. No further writes.
3. Insert `properties` with `id = p_property_id`.
4. Insert one `units` row (no `due_day_of_month`).
5. Insert `memberships` (landlord = current user).
6. If `p_contract` present:
   - Compute `contract_id := gen_random_uuid()`.
   - Compute `storage_path := 'contracts/' || p_property_id || '/' || contract_id || '.' || extension`.
   - Insert `contracts` row with `upload_status = 'pending'`, `is_active = true`, and the extraction columns populated when present.
7. If `p_rent` present, insert `rent` row.
8. For each tenant in `p_tenants`:
   - Insert `invitations` row with `role = 'tenant'`, `status = 'pending'` if `invite_now`, else `status = 'not_invited'`. Email-send work happens *after* the RPC returns; the RPC sets only the row state.
9. **Provider request resolution and dedupe** (in-draft + cross-property):
   - For each draft in `p_provider_request_drafts`:
     - Try cross-property dedupe (see *Cross-property request dedupe* below).
     - If a match is found, link to that existing request id; if not, insert a new `provider_requests` row with `source = 'user_new_provider'`.
   - Build a draft-index → request-id map.
   - For each draft that has a `bill_file`:
     - Compute `test_bill_id := gen_random_uuid()`.
     - Compute `test_bill_storage_path := 'test-bills/' || provider_request_id || '/' || test_bill_id || '.' || extension`.
     - Insert `provider_test_bills` row with `provider_request_id`, `source = 'provider_request'`, `storage_path`, `uploaded_by = auth.uid()`, `upload_status = 'pending'` (column added in this spec via the same migration that adds `provider_request_id`; see migrations).
10. For each expense in `p_expenses`:
    - Resolve `provider_request_id` from the dedupe map when the row referenced a draft index.
    - Resolve `bundled_into_charge_id` from the in-flight `charge_definitions` IDs when the row referenced another expense by index. Insert order respects forward references — the implementation plan defines the topological order.
    - Insert `charge_definitions` row with the new columns (`expense_type`, `amount_behavior`, optional provider/request/bundle fields). The relaxed "at most one state" constraint enforces correctness.
    - **Never insert a `charge_definitions` row that represents rent.** Rent has its own table.
11. **Tax id update logic.** Read `profiles.tax_id` for the current user.
    - If `profiles.tax_id` is null/empty AND `p_tax_id` is non-empty, update.
    - If `profiles.tax_id` already has a value, do not update — `p_tax_id` is read-only confirmation in the wizard, and edits flow through profile settings.
    - If `p_tax_id` is null/empty, do not update (the section was skipped or unchanged).
12. Audit events fire via existing triggers on each affected table.
13. Return the success payload.

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
    storage_path: text,
    original_filename: text,
    upload_status: contract_upload_status,
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
    invitations_to_email: invitation_id[],
  },
  expenses: {
    count: int,
    by_type: { expense_type: int }[],
    unspecified_count: int,               -- expenses with no provider/profile/request and not bundled
    bundled_count: int,
  },
  provider_requests: {
    new_count: int,                       -- newly inserted in this submit
    deduped_count: int,                   -- linked to existing rows
    bill_uploads: { test_bill_id, storage_path, mime_type }[],
  },
  tax_id_updated: boolean,
}
```

### Error shape

The RPC raises typed exceptions on validation failures inside its transaction (e.g., constraint violations, unique conflicts). The server action translates Postgres errors into the typed error envelope below. Exceptions abort the transaction; nothing partial commits.

---

## Server Action Contract

`submitPropertyCreation` lives at `src/data/properties/actions/submit-property-creation.ts` (next to existing actions). It returns a discriminated union; never throws to the form.

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

1. **Auth.** `createClient()` → `auth.getUser()`. If no user, return `{ ok: false, errors: [{ section: null, field: null, code: 'unauthenticated' }] }`.
2. **Validate.** Compose the per-section Zod schemas (`src/schemas/property`, `src/schemas/tenant`, `src/schemas/tax-id`, `src/schemas/rent`, `src/schemas/expense`, `src/schemas/contract`) into a single `propertyCreationSubmissionSchema`. The composed schema makes per-section keys optional so the omit-when-skipped contract is enforced at the type level. Validate input. On failure, return the typed error envelope.
3. **Build the RPC payload.** Map section data to RPC arguments. Strip wizard-only UI fields (e.g., `isExtracted`, row touch state). Resolve expense rows that point at a missing-provider draft to a draft index in `p_provider_request_drafts`.
4. **Call the RPC.** Pass `p_property_id = draftId`. RPC returns the success payload (or raises).
5. **Upload contract** (only when contract path and the RPC reports a contract):
   - Use the `storage_path` returned by the RPC.
   - Upload the `File` blob to the `contracts` bucket.
   - On success: update `contracts.upload_status = 'uploaded'`.
   - On failure: update `contracts.upload_status = 'failed'`. Do **not** delete the contract row. Return a non-fatal warning in the success payload (the property exists; the file just isn't there yet). The success screen surfaces a "re-upload contract" affordance.
6. **Upload provider-request bills.** For each entry in `provider_requests.bill_uploads`:
   - Upload the bill file to the `test-bills` bucket at the deterministic path.
   - On success: update `provider_test_bills.upload_status = 'uploaded'`.
   - On failure: update to `'failed'`. Same non-fatal posture as contract — the request exists with file metadata; the file can be re-uploaded later via engineering tooling.
7. **Send tenant invite emails** for each id in `tenants.invitations_to_email`. Email send failures are non-fatal and log only — invitations remain `pending` and the landlord can retry sending from the property page.
8. **Revalidate** `/app` and any property-listing paths via `revalidatePath`.
9. **Return** `{ ok: true, summary }` where `summary` is the RPC payload extended with upload outcome flags (e.g., `summary.contract.upload_failed`, `summary.provider_requests.bill_uploads_failed: int`).

### Error envelope

```
type SubmitResult =
  | { ok: true; summary: SubmitSummary }
  | { ok: false; errors: SubmitError[] }

type SubmitError = {
  section: 'property' | 'rent-dates' | 'tenants' | 'expenses' | 'tax-id' | null
  field: string | null              // dot-path within the section (e.g., 'rows.0.amount_minor')
  code: string                      // typed; maps to i18n keys on the client
}
```

`section: null` for global errors (auth, network, RPC infra failures). `field: null` for section-level errors that don't bind to a specific input (e.g., "no rent provided on contract path"). `code` is a typed enum mapped by the frontend to i18n keys — the action never returns user-facing strings.

### Error wiring on the frontend

This spec **extends** the existing `useServerValidationErrors` pattern (already used by per-section continue actions like `validateProperty`). It does not introduce a parallel error system.

- A new persisted slice `submitErrors: SubmitError[]` is added to the wizard store. Survives refresh; cleared on successful submit, on the user opening a section and editing the offending field, or explicitly via `clearSubmitErrors(section?, field?)`.
- A small adapter converts the persisted `submitErrors` into the per-section `serverErrors` shape that `useServerValidationErrors` already consumes (a `Record<field, string[]>`). The wizard's section components keep using `getFieldError(form, field)` exactly as they do today.
- The merge order on a field stays: **client touched-error first** (`form.errors[field]`), **then server error** (from `submitErrors` adapted into the section's serverErrors). When the user edits the field, the per-field client error and the per-field submit error both clear via the existing `clearTouched` / `clearServerErrors` plumbing.

This means a section developer adds zero new error-handling code. The wizard's submit pipeline routes errors through the same lens the section already renders.

### Submit error precedence and section opening

When `{ ok: false, errors }` returns:

1. Persist the error list to `submitErrors` in the store.
2. Find the first error whose `section` matches the canonical order: `property` → `rent-dates` → `tenants` → `expenses` → `tax-id`. Open that section in the accordion.
3. Errors with `section: null` (global) bypass section opening and surface as a destructive toast at the top of the wizard.
4. Wizard draft state stays intact. The user fixes, re-submits.

### Storage cleanup model

Because uploads happen **after** the RPC commits, there is no DB-vs-Storage orphan to clean up. The remaining cases are:

- Contract upload fails → contract row exists with `upload_status = 'failed'`. Property is recoverable by re-submitting (same `draftId` short-circuits the RPC, retries the upload to the same path). The property page surfaces a "re-upload contract" affordance.
- Bill upload fails → `provider_test_bills` row exists with `upload_status = 'failed'`. Engineer-side tooling can prompt a re-upload; not user-visible.
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

`property-creation-submission.ts` composes the per-section schemas. Each section is optional in the composed schema so the "skipped sections are omitted" contract is enforced at parse time. Cross-section invariants live here (e.g., `path === 'contract'` requires `rent` and `contract`; `path === 'no_contract'` makes both optional).

### Refactor existing wizard schemas to derive from canonical

The wizard's checkout-local `expense-row-schema.ts` currently declares its own `EXPENSE_TYPES`, `EXPENSE_AMOUNT_BEHAVIORS`, and the row Zod schema. After `src/schemas/expense.ts` lands, the wizard schema imports the canonical types and arrays and only adds UI-only fields (`isExtracted`, draft missing-provider state, accordion id). This is part of this spec's scope.

Audit task for the implementation plan: identify every wizard-local declaration of expense, rent, tenant, contract, or tax-id types and re-anchor them on the canonical schemas. Remove duplicate enum literal arrays.

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

`properties.id = draftId`. The wizard already generates `draftId = crypto.randomUUID()` before any submit. The RPC's first action after auth is to look up `(id = p_property_id, created_by = auth.uid())`; if a row exists, the RPC returns the same shape as the success path with `is_idempotent_replay = true` and skips every other step.

### How the frontend uses `is_idempotent_replay`

The user-facing experience is identical between a fresh creation and a replay — both render the new success screen. The flag exists for:

- **Analytics.** Don't double-fire the `property_created` event on a retry. Fire once on `is_idempotent_replay === false`, log a `property_create_replay` event when `true`.
- **Diagnostics.** Server logs distinguish "user retried" from "user created a brand-new property."
- **Email idempotency.** On a replay the server action still receives `invitations_to_email`, but the email sender consults `invitations.status` and `last_emailed_at` (or a debounce window) to avoid double-sending. The first response wins.

The wizard page already handles the bookmark-revisit case via the `/p/new/[id]` → `/p/[id]` redirect, so the only realistic replay is a network glitch between server action and client response. Clean, transparent, no duplicates.

### Storage upload idempotency

Both contract uploads and bill uploads use deterministic, per-row paths (`contracts/{property_id}/{contract_id}.<ext>`, `test-bills/{provider_request_id}/{test_bill_id}.<ext>`). A retry uploads to the same path; Supabase Storage upserts overwrite the same object. The DB rows already have `storage_path` populated by the RPC, so paths are stable across retries.

### Tenant email idempotency

The email sender:

1. Reads `invitations.status` immediately before sending. Skip if not `'pending'`.
2. Optionally consults a debounce field (`last_emailed_at`) to avoid double-send within a short window. Implementation plan picks the column and threshold.

Replays through the server action re-emit the same `invitations_to_email` list. The send path's idempotency lives at the email layer, not at the server-action layer.

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

### Behavior on `{ ok: false, errors }`

1. Persist the error list to `state.submitErrors` in the wizard store. The slice is part of the persisted shape (per *State Persistence* in the shell spec) so it survives refresh, and it's cleared on:
   - Successful submit
   - User editing a field whose `(section, field)` matches a stored error
   - Explicit `clearSubmitErrors()` call (e.g., when the user opens a section and acknowledges the errors)
2. Find the first error in canonical order: `property` → `rent-dates` → `tenants` → `expenses` → `tax-id`. Global errors (`section: null`) bypass section opening and surface as a destructive toast.
3. Open that section in the accordion (replacing whichever section was active).
4. Render each error inline near the field identified by `field`, **using the existing `useServerValidationErrors` adapter** (see *Error wiring on the frontend* under *Server Action Contract*). The section developer reads errors via the same `getFieldError(form, fieldName)` helper they already use for per-section continue actions.
5. Wizard draft state is preserved — the user fixes the issue and clicks Create property again.

### Three error sources, one rendering pipeline

Today the wizard has three potential error sources:

| Source | Today's path | After this spec |
|---|---|---|
| Client-side schema errors (touched-only) | `useWizardForm.errors` | Unchanged |
| Per-section continue-button server actions (e.g., `validateProperty`) | `useServerValidationErrors` (per-section React state) | Unchanged |
| Final submit server action errors | (does not exist yet) | Adapter that projects `state.submitErrors` for this section into the same `useServerValidationErrors` shape |

The section component still calls `getFieldError(form, field)`. The submit-error adapter is invisible to the section.

### Property page hardening

The wizard's success path eventually navigates to `/p/[draftId]` via the success screen's "View property" CTA. The property page must handle:

1. `/p/[id]` for a property that doesn't exist → 404.
2. `/p/[id]` for a property the user is not a member of → 404 (don't leak existence).

This is property-page work, not part of this spec's deliverables. The implementation plan adds a thin `notFound()` fallback if the property page hasn't shipped this hardening yet, but otherwise treats it as a prerequisite.

---

## Success Behavior

### Flow on `{ ok: true, summary }`

1. Client: clear the wizard draft from IndexedDB (`actions.clearPersisted()`) — this is the only place the persisted slice (including `submitErrors`) gets wiped.
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

- Creates the `provider_requests` table and its enums.
- Adds `provider_test_bills.provider_request_id` and `provider_test_bills.upload_status`.
- The RPC dedupes draft missing-provider entries within a single submit and **also** matches against existing `provider_requests` rows across all landlords (cross-property dedupe — see *Cross-property request dedupe* under *RPC Contract*).
- The RPC inserts `provider_test_bills` rows for any draft with a bill file, linked back to the request by `provider_request_id`.
- The server action uploads bill files to the existing `test-bills` Storage bucket after the RPC commits, mirroring the contract upload pattern.
- Each affected `charge_definitions` row gets `provider_request_id` set when the row's wizard state pointed at a draft (resolved through the dedupe map).
- The wizard's IndexedDB pattern for storing bill `Blob`s during draft is owned by the Expenses workstream (its Phase 2 task 12). This spec consumes whatever pattern lands; it does not replace or extend the persistence mechanism. If Phase 2 task 12 is not yet implemented when this spec lands, the server action's bill-upload pass is wired but receives no bill blobs (the wizard simply doesn't surface a bill-upload UI yet); the RPC still creates the request row without a bill.

### What this spec does not do

- The engineering review surface (`/eng/requests`) — owned by the provider-request / engineering plan.
- The completion resolver that writes `provider_profile_id` onto linked `charge_definitions` rows when engineering ships a profile — owned by the same workstream.
- The in-wizard "match against existing requests" UI step from the Expenses guidepost — providers are optional in the form for the first cut. The RPC handles dedupe; the UI does not surface it.
- The fuzzy-name normalizer's exact algorithm — the implementation plan picks a sensible default and writes it as a Postgres function or a generated column expression.

---

## Implementation Boundaries

### This spec's plan owns

- All migrations listed under *Database Migrations*, including the previously Expenses-Phase-3-owned `charge_definitions` changes and the new `expense_amount_behavior` enum.
- The new transactional RPC (function definition, security definer, audit triggers, grants).
- The `submitPropertyCreation` server action and the deprecation of `createProperty` + `create_property_with_membership`.
- All new `src/schemas/` files: `expense.ts`, `rent.ts`, `contract.ts`, `property-creation-submission.ts`.
- Refactor of the wizard's checkout-local schemas (e.g., `expense-row-schema.ts`) to derive types from the canonical `src/schemas/` files.
- Frontend wiring: replace the existing `createProperty` action call with `submitPropertyCreation`. Adapter that projects `state.submitErrors` into the existing `useServerValidationErrors` shape per section.
- Persisted `submitErrors` slice on the wizard store (added to `partialize`, included in version bump, cleared on successful submit / field edit).
- The new success screen with the layout, content, and two CTAs described in *Success Behavior*.
- Storage bucket + RLS policies for `contracts`.
- RLS policy review across new tables (`contracts`, `rent`, `provider_requests`) and existing affected tables (`provider_test_bills` and the `test-bills` bucket policies).
- Wizard redirect-after-success behavior on `/p/new/[draftId]` revisit.
- Property page 404 fallback (cheap `notFound()` if property is missing or user isn't a member).
- TypeScript types regeneration (`pnpm supabase gen types --local`) after every migration in this work, with the resulting `src/lib/types/database.ts` committed.
- Bill upload integration: server action uploads `provider_test_bills` files to the existing `test-bills` bucket and updates `upload_status`.

### Other plans own

- **Expenses workstream Phase 1C / Phase 2 UI work** continues independently. Those plans now consume `src/schemas/expense.ts` shipped here.
- **Provider-request engineering plan** owns the eng queue UI, the completion resolver, deeper triage tooling, and any future schema additions to `provider_requests`.
- **Property detail / settings flow** owns the "missing contract file" affordance on the property page and any future contract / re-upload management UI. This spec depends on a thin `notFound()` fallback being in place.
- **Bank account workstream (later)** replaces the coming-soon section with real Open Finance integration.

---

## Sequencing Notes

This spec **absorbs** what was previously slated for Expenses workstream Phase 3 (charge_definitions migration, `expense_amount_behavior` enum, `src/schemas/expense.ts`). The Expenses workstream's UI tasks (Phase 1C provider picker, Phase 2 bill-draft IndexedDB, etc.) continue independently and now build on top of this spec's schema work.

Order:

1. **Existing checkout shell work** — accordion, section states, gating, `useActionState`. Already in place; this spec extends the store and adds the new submit path.
2. **This spec** — migrations + RPC + server action + schemas + success screen.
3. **Expenses workstream UI tasks** that haven't shipped — refactor to consume `src/schemas/expense.ts`, then layer on provider picker / bundled-row UI / bill-draft persistence as separate plans.
4. **Provider-request engineering work** — eng queue UI, resolver, triage. Independent.

This spec does not depend on the bank account work. It explicitly creates `provider_requests` so the eng workstream can layer on top.

---

## Open Questions

These are not blockers for plan-writing but should be resolved during implementation:

1. **Email send transport.** Tenant invitation emails fire via Resend per `email-templates`. The exact integration point (inline in the server action vs. a queued job) is an implementation detail. Sequencing emails after the RPC commit but before the server action returns is acceptable for MVP given expected volume.
2. **Contract bucket signed URL flow.** RLS-driven access works for direct queries from the app. The property page's contract download likely needs short-lived signed URLs; the implementation plan picks the URL-minting flow (Supabase `createSignedUrl` from the server with a small TTL).
3. **`contract_upload_status` enum reuse for bills.** This spec uses the same enum on both `contracts.upload_status` and `provider_test_bills.upload_status`. If a future spec wants to add bill-specific statuses (e.g., `quarantined`), the enum has to evolve — at which point renaming to `file_upload_status` or splitting into per-table enums is reasonable. Implementation plan picks initial naming.
4. **Bill-draft IndexedDB pattern timing.** This spec wires the bill-upload pass in the server action. If the Expenses workstream's Phase 2 task 12 (bill blob persistence) hasn't shipped, the wizard simply doesn't supply blobs — provider requests still get inserted, just without files. No blocking dependency.

---

## Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Final boundary | One transactional Postgres RPC | Atomic all-or-nothing semantics for property + contract row + rent + invitations + expenses + provider requests + provider test bills. Storage stays outside the transaction. |
| Reuse vs new | New RPC + new server action; deprecate the old | Existing surfaces are single-section; evolving them creates a confusing migration. Fresh names + clean deprecation. |
| Idempotency key | `properties.id = draftId` | Natural primary key. No extra column. Wizard URL becomes property URL after success. |
| Idempotent replay | Returned via `is_idempotent_replay: boolean` | User sees the same success screen; flag is for analytics + email send guards. |
| Storage upload order | After RPC commits | Avoids pre-creation gymnastics. Contract / bill rows hold deterministic paths; uploads happen against known targets. |
| Storage path (contract) | `contracts/{property_id}/{contract_id}.<ext>` | Property-scoped path survives co-landlord additions and ownership transfers. Per-contract uniqueness supports renewals. |
| Storage path (bill) | `test-bills/{provider_request_id}/{test_bill_id}.<ext>` | Request-scoped, deterministic, retry-safe. |
| Storage path storage | Stored on the row | Migration freedom; supports multiple files; existence is explicit. |
| Storage RLS (contracts) | Membership-driven via path-extracted `property_id` | Tenants read; landlords write. Robust to transfers. |
| Extraction storage | JSONB columns on the `contracts` row, plus `extraction_model` and `extraction_schema_version` | One row per upload. Re-extraction is a column update. Model + schema version on the row enable targeted re-extraction and shape-evolution safety. Token/latency telemetry stays in PostHog. |
| Validation | Zod schemas in `src/schemas/`, shared client/server | Single source of truth. No duplicated server schemas. Wizard checkout-local schemas derive from canonical. |
| Error shape | `{ section, field, code }` per error | Frontend can both open the right section and highlight the specific input. |
| Error rendering | Extend existing `useServerValidationErrors` pattern | One pipeline for client errors, per-section continue errors, and submit errors — section developers add zero new error code. |
| Submit error persistence | New `submitErrors` slice in the persisted wizard store | Survives refresh; cleared on success or field edit. |
| Skipped sections | UI omits from server payload | Simpler than server-side filtering. Server treats absence as "do not persist". |
| `tenants[i].invite_now=false` | `invitations.status = 'not_invited'`; no `role` from input | All wizard tenants are `role = 'tenant'`. Distinguishes "deferred send" from "sent but unredeemed". |
| Tax id update | RPC, not server action | Logic is "is the column empty?" — belongs in the transaction so concurrent profile edits can't race. |
| Expense provider attachment | Optional (4th `unspecified` state) | Ships the feature. Constraint relaxes from "exactly one of 3" to "at most one of 4". |
| Cross-property request dedupe | RPC handles it | Tax-id, then provider-id+region, then normalized-name+region. Conservative; engineering can collapse false negatives. |
| Bill uploads | In scope (RPC inserts row, server action uploads) | Same pattern as contract. Bucket already exists. |
| Bank account section | Deferred → coming-soon UI | Not load-bearing for first product cut. |
| Stale draft URL | Redirect `/p/new/[draftId]` → `/p/[draftId]` after success | Matches the collapsed identity model. |
| Property page 404 | Hardened to handle missing/forbidden | Avoids leaks; required for redirect to be safe. |
| Success behavior | Show new success screen with two CTAs (View property / Go to dashboard) | Milestone moment, not just a redirect. Confirms what was set up; hands off cleanly. |
| Success screen redesign | In scope | Creating a property terminates in this surface; building it together avoids a follow-up spec. |
| `due_day_of_month` | Moves from `units` to `rent` | Per-tenancy, not per-unit. |
| `units.currency` | Stays | Property denomination default; rent has its own currency for cross-currency contracts. |

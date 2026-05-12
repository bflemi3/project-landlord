# Expenses Checkout Section — Architecture Guideposts

**Date:** 2026-05-06  
**Scope:** Architecture and product guideposts for the Expenses section in the property creation checkout wizard. This is not an implementation plan. It records the decisions that future plans should follow.

---

## Context

The property creation checkout wizard needs an Expenses section that lets a landlord review extracted expenses, edit them, add new expenses, and remove expenses that do not apply. Expenses include recurring property obligations such as electricity, water, gas, internet, condo fees, sewer, cable, maintenance, and other property-linked charges.

This section sits in the post-pivot long-term rental model:

- Rent is first-class and must not be modeled as a charge definition.
- Property expenses are secondary to rent but still important for shared billing visibility, future ledger generation, provider coverage, payment detection, and tenant reputation.
- Expense ownership is not assigned during property creation. Responsibility is inferred later from ingested bills using bill addressee data such as CPF, name, and address.
- Missing provider support is expected during rollout and must degrade gracefully. Rent can work everywhere before every regional provider profile exists.

The old charge form and charge definitions model used `charge_type = rent | recurring | variable` and payer/split allocation. That model does not match the pivot. It can inform interaction patterns, but not the domain model for this section.

---

## Product Rules

### Rent Is Not A Charge

`charge_definitions` should represent expenses only. Rent belongs in a dedicated rent data model because it is contract-defined, drives landlord revenue, has adjustment rules, and uses different payment detection semantics.

The existing `charge_type` enum includes `rent`, which is stale for the pivot. Future data model work should migrate away from `charge_definitions.charge_type` toward expense-specific columns.

### Expenses Track Property Obligations

The landlord should review the expenses found in the contract, remove anything that is not actually tied to the property, and add any recurring expenses the extraction missed. They should keep expenses even when the tenant usually pays them. The UI should avoid asking "who pays this?" during creation.

Recommended copy direction:

> Add every recurring charge this property has, even ones your tenant pays. We'll figure out responsibility once bills start coming in.

### Provider Support Is Separate From Provider Identity

Providers are companies. Provider invoice profiles are regional/expense-type-specific support records for extracting and validating bills from those companies.

A provider may offer multiple utilities or bill types. Do not lock `providers` to a single expense type. Expense type belongs on `provider_invoice_profiles` and on the expense being configured, not on the provider company record.

Provider and provider profile are internal data model concepts. The landlord should not have to understand the distinction. In the product UI, a supported regional provider profile can simply appear as a provider option with clear availability copy, such as "Automatic tracking available in your area."

### Missing Providers Are Product Data

When a provider or regional profile is missing, the product should preserve what the landlord entered, show an honest status in the UI, and create a request for engineering. It should not create fake provider/profile rows that imply support exists.

---

## Data Model Direction

### Expense Definitions

`charge_definitions` should become the expense definition table. It should no longer encode rent.

Recommended direction:

- Add `expense_type expense_type not null`.
- Add `amount_behavior expense_amount_behavior not null`.
- Keep `amount_minor` / `currency` for expected or known amounts.
- Add `provider_profile_id uuid references provider_invoice_profiles(id)`.
- Add `provider_request_id uuid references provider_requests(id)` as a bridge to missing/unsupported provider work.
- Do not add `provider_id` to `charge_definitions`. Provider identity is derived: through `provider_invoice_profiles.provider_id` when a profile is set, and through `provider_requests.provider_id` when only a request is set. This avoids three columns that can drift.
- Add `bundled_into_rent boolean not null default false`.
- Add `bundled_into_charge_id uuid null references charge_definitions(id)` for expenses bundled into another expense (e.g., water included in condo fee).
- Drop `charge_type` in this slice. See "Removing `charge_type`" below for the migration approach.

Every `charge_definitions` row must satisfy exactly one of three states, enforced by a check constraint:

- **Tracked** — `provider_profile_id` is set, `provider_request_id` is null, and neither bundle column is set.
- **Pending** — `provider_request_id` is set, `provider_profile_id` is null, and neither bundle column is set.
- **Bundled** — both provider columns are null, and exactly one of `bundled_into_rent` or `bundled_into_charge_id` indicates the parent.

This is what makes provider attachment effectively required for non-bundled rows: the only way to add an expense without a provider is to declare it bundled into rent or another expense, which is an explicit visibility-only state.

The `expense_type` enum already exists, but it is not yet attached to `charge_definitions`. Add the missing column and use generated Supabase types throughout the codebase, following the existing database-enum pattern used by `property_type`.

The codebase currently also has a separate `provider_category` enum on `provider_invoice_profiles`. For the pivot, provider profile category and expense type are the same product concept. Prefer one canonical enum for both. The implementation plan should either migrate `provider_invoice_profiles.category` to use `expense_type` or otherwise make the mapping explicit and temporary. Do not let future code assume `provider_category` and `expense_type` are different product concepts.

The canonical expense enum should include every expense type the checkout can present. Add missing values such as `insurance` if they are supported in the UI. The current enum already includes `trash`; keep it in the UI/default map.

#### Removing `charge_type`

`charge_type` is dropped in this slice with no backfill of existing rows. There is no production user data yet, and the rent-as-charge → rent-as-its-own-table migration cannot be done cleanly because the missing rent fields aren't recoverable from existing rows.

Pre-implementation gate: run `select charge_type, count(*) from charge_definitions group by charge_type` against the linked Supabase. If the table is empty (or contains only disposable test data), proceed with the column drop. If real rows exist, stop and revisit the migration approach before merging.

The same PR drops the column and updates every TS reader of `charge_type` to use `expense_type` and `amount_behavior` instead. Future writes cannot keep populating a deprecated field.

### Amount Behavior

We still need to know whether an expense has a stable expected amount or a bill-driven variable amount, but the old `recurring | variable` charge type is the wrong abstraction.

Use a separate enum with these values:

- `fixed` — expected amount is stable month to month, such as many condo fees, internet plans, insurance, or fixed service fees.
- `variable` — amount is expected only after bill discovery/upload, such as electricity, gas, or water.
- `unknown` — fallback when the setup flow cannot infer the behavior.

The UI can default this from an expense-type map and let the user override it. Most users should not need to change it.

Example default behavior:

- electricity: variable
- water: variable
- gas: variable
- internet: fixed
- condo: fixed
- sewer: variable
- cable: fixed
- trash: fixed
- insurance: fixed
- maintenance: unknown
- other: unknown

This matters for the future ledger:

- Fixed expenses can create expected future activity before a bill arrives.
- Variable expenses should usually appear as expected-but-amount-pending until a bill is uploaded or discovered.
- Payment matching for both still depends on provider identity, amount/date windows, and transaction data, but expected amount confidence differs.

### Provider Requests

`provider_requests` is specified in the engineering playground architecture but is not implemented yet. It should be introduced as the canonical request queue for missing providers, unsupported regional profiles, user corrections, engineer-created requests, and system-generated accuracy regressions.

Align with the playground spec:

- `source`: `user_new_provider | user_correction | engineer | system`
- `status`: `pending | in_progress | testing | complete | declined`
- Links to `provider_id`, `profile_id`, and `test_bill_id`
- `requested_by`, `assigned_to`, `assigned_at`
- Correction fields for user corrections
- Notes, decline reason, timestamps

Additional property-checkout context is needed:

- requested provider display name
- requested provider tax ID, when extracted
- request origin detail, if needed, such as `extraction_detected`, `user_requested`, or `manual_without_bill`
- expense type context, nullable because a provider can serve multiple utility categories
- country/state/city/neighborhood snapshot from the property

Use explicit region columns rather than an opaque `region_context` JSON object unless a normalized region model exists by the time this is implemented:

- `country_code`
- `state`
- `city`
- `neighborhood`

When engineering later creates the provider/profile, migrate company identity into `providers` and region/expense-type support into `provider_invoice_profiles`. `providers` should remain company-level; region specificity belongs to provider profiles.

The "internal signal" language in earlier specs maps to `provider_requests` in this guidepost. Use the playground-style `source` enum as canonical. For a missing or unsupported provider surfaced during checkout, create or link a `provider_requests` row with `source = user_new_provider` during final property creation. Use request-origin detail, not a second source enum, to distinguish extraction-detected vs. explicit "I don't see my provider" paths.

Provider requests should not be created while the landlord is still in the checkout wizard. During checkout, missing-provider draft data belongs in the existing property creation Zustand store, inside the `expenses` section data slice. The existing store persistence middleware writes that section data to IndexedDB automatically; do not add a separate IndexedDB write path for provider-request drafts. The real `provider_requests` row and any `provider_test_bills` upload/link should be created only inside the final create-property flow. If the landlord abandons property creation, no provider request is created.

### Linking Provider Requests To Properties And Expenses

Do not put a `property_id` directly on `provider_requests`. Do not introduce a `provider_request_properties` join table either.

Use `charge_definitions.provider_request_id` as the single source of truth for which expenses (and therefore which properties) want a missing provider. Property-level demand is derivable: `select distinct property_id from charge_definitions where provider_request_id = $1`. Per-expense resolution and per-property demand fall out of the same column without a separate table to keep in sync.

One provider request can link to many `charge_definitions` rows. The same missing provider used by multiple expense rows in the same checkout is collapsed into a single request on save.

If a post-create expense is later deleted and the provider request it pointed at no longer has any other linked `charge_definitions` rows, corrections, or engineering work items, the cleanup path may remove the request and its request-only test bill. Do not apply that cleanup to requests still linked to other expenses.

### Resolving Requests

The mechanics of resolving requests (the resolver function, eng-side completion flow, audit trail) are owned by the provider-request / engineering plan. This guidepost only locks in the schema affordances they need from the expenses side:

- A pending charge has `provider_request_id` set and `provider_profile_id` null.
- When the request is completed, the resolver writes `provider_profile_id` onto each linked `charge_definitions` row in place, so runtime billing and payment-matching reads never need to follow the request.
- `provider_request_id` stays set after resolution as a breadcrumb of how the provider entered the system. It is not cleared.

The expenses plan does not implement the resolver. It only ensures the schema supports an in-place write at completion time.

---

## Provider Resolution UX

### Unified Provider Picker

When the landlord adds or edits an expense, the provider picker should search database-backed options only:

1. Real providers/profiles
2. Requested providers from the request queue

The provider picker does not search draft provider-request state from the current checkout session. Draft state is only for the row being edited and is submitted later during create-property.

The picker should normalize these into one option list with explicit status labels. Internally some options may be provider profiles, but the UI should present them as provider choices.

Example option states:

- `Enliv Energia` — Automatic tracking available in your area
- `Celesc` — We recognize this company, but automatic tracking is not available in your area yet
- `Floripa Energia` — Requested by landlords in your area; not supported yet
- `Add a new provider` — Upload a bill or type the provider name

The UI must make it visually clear when a provider exists and is supported versus when it has only been requested.

Provider selection should be frictionless. The landlord should choose from a short, ranked list; they should not see internal words like "profile", "parser", or "provider invoice profile." Use product language like provider, automatic tracking, requested, and not supported yet.

If the landlord selects a known provider that does not have a supported profile for the property's region and expense type, the row can keep the known `provider_id`, but final property creation should also create or link a `provider_requests` row for the missing regional profile. The UI should nudge this path instead of leaving the unsupported provider as a dead end.

### Extracted Expenses

When contract extraction returns an expense with provider name and/or tax ID:

- Seed an expense row from the extraction result.
- Use property region plus extracted provider name/tax ID to fuzzy-match against both real provider records and requested provider records.
- Present suggestions to the landlord.
- If CNPJ maps directly to one active provider profile that matches the property's region and expense context, assign that provider/profile to the row and call it out clearly in the UI as an automatic match the landlord can change.
- If CNPJ maps to a provider but not directly to one regional profile, or if multiple regional/category profiles could fit, ask the landlord to choose from the suggested options.
- For name-only or ambiguous matches, do not silently assign provider/profile records; present suggestions and let the landlord choose.

If a matching request already exists, suggest that requested provider rather than creating a duplicate request.

### Missing Provider Flow

The primary "provider does not exist" flow should be bill-first. Matching against existing provider requests is **mandatory in both the bill-upload and manual-entry paths** before the landlord can confirm a brand-new request. A new request is created only if no matches exist or the landlord declines all suggestions.

1. User taps "I don't see my provider."
2. Primary path asks them to upload a bill. The system extracts provider name and tax ID when possible.
3. Secondary path: "I don't have the bill" lets the user manually type the provider name and, optionally, a provider tax ID.
4. **Required matching step**, regardless of which path produced the data:
   - If CNPJ is available, first try direct request matching by tax ID.
   - Otherwise, fuzzy-match by provider name, property region, and expense type when available. Expense type is request/profile-support context, not a permanent provider-company classification.
   - Show likely existing requests to the landlord. They must select a match or explicitly decline before the flow allows a brand-new request.
5. The user reviews and edits the extracted/entered name if needed.
6. If an existing request is selected, persist a draft link to that request in checkout state.
7. If no existing request matches and the landlord declines suggestions, persist a draft new-provider request in checkout state.
8. Create or link the actual `provider_requests` row only when the property is created.
9. Link the created expense to the request via `provider_request_id`.

The expense row can then honestly show:

> Enliv Energia · Requested, not supported yet

If a bill is uploaded during checkout, the expense row should store enough draft file/request state in the property creation store to complete the request on final submit. Files cannot be JSON-serialized through the existing persist middleware as-is, so the expenses plan extends the same IndexedDB pattern that the contract-upload step uses for its draft file. Audit the contract-upload persistence path first and reuse it; do not invent a parallel mechanism. On property creation, store the bill in `provider_test_bills` with source `provider_request`, linked to the request. Add a `provider_request_id` foreign key to `provider_test_bills` when the request table lands so the bill/request link is explicit. The property region should be captured automatically from the property; the landlord should not enter region details.

If the landlord backs out before creating the property, discard the draft request with the rest of the wizard state.

If the landlord changes a row from one missing provider to another, replace the row's missing-provider draft state with the new provider information. If an uploaded bill only applied to the previous provider, clear it from that row's draft state so the final submit does not attach the wrong bill.

If multiple expense rows in the same checkout draft point to the same missing provider, the final create-property flow should create or link one `provider_requests` row and link all relevant charge definitions to it.

Condo expenses follow the same missing-provider flow as every other expense type for now. Require a condo bill/example document if the landlord is creating a new condo provider request through the bill-first path, and extract provider identity from that document when possible.

---

## Checkout State And Schemas

### Schema Layers

Use two schema layers:

1. `src/schemas/` for DB/domain-shaped schemas that are agnostic and reusable across client/server validation.
2. Checkout-local schemas next to the wizard state for UI-specific row validation and persisted wizard state.

Recommended canonical schema:

- `src/schemas/expense.ts`
- Represents the domain input for an expense definition.
- Uses database-derived enum values from generated Supabase constants/types.
- Does not include UI-only fields.

Recommended checkout-local schema:

- `src/app/app/(focused)/p/new/[draftId]/state/expense-row-schema.ts`
- Represents the dynamic row state used by the checkout section.
- Includes row `id`, row-level extraction metadata, selected provider option state, and any missing-provider draft state that must persist while the accordion panel unmounts.
- Missing-provider draft state should live in this row shape and be written through `setSectionData('expenses', ...)`, following the existing checkout store pattern.
- Stores draft missing-provider data, not a created request, until final property creation.

### Row-Level Extraction Metadata

Property and rent/dates derive extracted indicators by comparing current values to `extractionResult` through `useIsExtracted(path)`.

Expenses should follow the tenants pattern instead. Expenses are a dynamic list, and index-based extracted-field paths become fragile when rows are added, removed, or reordered.

Each extracted expense row should store row-level `isExtracted: true`. Manually added rows start with `isExtracted: false`. When the user edits anything within an expense row, flip the row to `false`.

`isExtracted` is the only extraction-related metadata stored on an expense row. Do not add origin-confidence, original-vs-edited diffs, or any other provenance fields unless a concrete UI need is established later.

This means the canonical `src/schemas` expense schema should not include `isExtracted`; it is checkout UI metadata only.

### Store Integration

The expenses section should follow existing checkout patterns:

- Add an `expenses` slice to `defaultSectionData()`.
- Seed `expenses` from `extractionResult.expenses` in `mergeExtractionIntoSectionData()`.
- Add schema/tests for default rows and extraction seeding.
- Keep section state in the persisted wizard store because accordion panels unmount when collapsed.
- Add a summary line for the collapsed section and desktop summary panel.

The checkout accordion section is already registered and rendered as a placeholder. The missing work is the `expenses` section data slice, extraction merge, validation schema, real UI, and final create-property mapping.

Manual no-contract flows use the same row schema and provider picker rules as contract-seeded flows. The only difference is that there are no extracted rows.

If the user removes an expense row before property creation, remove it from the `expenses` array in the store. Any missing-provider draft state and bill draft state attached to that UI row is removed with it and will not be submitted.

If the user skips the Expenses section, do not write expense charge definitions on final property creation unless the user later re-opens the section and completes it. The store may still preserve draft values for editing, but skipped section state means those values are not part of the final submission payload.

Keep the current section-based persisted store shape. Do not introduce a separate normalized IndexedDB persistence layer for expenses. If the expenses slice grows complex, normalize within the `expenses` slice itself, but continue writing it through the existing Zustand store and persistence middleware.

Provider-request bill drafts are an exception to "section data goes through the JSON-serializable store path": files cannot be JSON-serialized. Reuse whatever IndexedDB blob/file pattern the existing contract-upload step uses for its draft file. The expenses plan must audit that pattern first and extend it for bill drafts; do not invent a parallel mechanism. The reference key for the persisted bill blob lives in the row's section data; the blob itself lives wherever contract drafts already live.

---

## UI Guideposts

### Fast Expense Entry

Adding/editing an expense should be quick:

- Choose expense type from common options.
- Amount behavior defaults automatically from expense type.
- Provider suggestions appear based on property region and user/extracted provider text.
- Amount is optional and visually secondary.
- Missing provider flow is one clear path, with bill upload as the main CTA and manual typing as the fallback.
- Bundled expenses should still appear as rows. If an extracted expense is bundled into rent or another expense, the row should clearly say so, for example "Bundled with rent" or "Included in condo fee," so the landlord understands why it may not create a separate future amount.

### Honest Support Status

Every selected provider display should include support status:

- Supported profile: automatic tracking available.
- Known provider, no supported profile in region: recognized, not automatic in this area yet.
- Requested provider: requested, not supported yet.
- No provider: provider not selected.

This is critical because the product promise depends on automation. The UI should not imply bills will be tracked automatically when the provider profile does not exist.

### Optional Section Behavior

Expenses remain optional in both contract and no-contract paths. Skipping should be allowed, but the copy should make the value clear: completing this section improves automatic bill tracking and future payment visibility.

Follow the existing checkout empty-state pattern used by the Tenants section and explanatory body copy used by the Tax ID section: calm card-like content, short plain-language value statement, and a clear primary action. Bullets are optional; the important part is that the section explains why adding expenses matters without making the optional section feel mandatory.

---

## Implementation Boundaries

### Expenses Section Plan Should Own

- Pre-implementation gate: confirm `charge_definitions` is empty/disposable in the linked Supabase before proceeding.
- Database migrations on `charge_definitions`: add `expense_type`, `amount_behavior`, `provider_profile_id`, `provider_request_id`, `bundled_into_rent`, `bundled_into_charge_id`, the 3-state check constraint, and drop `charge_type`.
- New `expense_amount_behavior` enum.
- Aligning `provider_invoice_profiles.category` with `expense_type`, including adding missing enum values such as `insurance` and ensuring `trash` is represented in the UI.
- Auditing and updating every TS reader of `charge_type` in the same PR as the column drop.
- Auditing the existing contract-upload IndexedDB persistence pattern and extending it for provider-request bill drafts.
- Canonical `src/schemas/expense.ts` domain schema.
- Checkout-local expense row schema.
- Default section data and extraction seeding.
- Expense list UI inside the checkout accordion.
- Expense type selection.
- Amount behavior default map and override UI.
- Provider picker UI contract.
- Missing-provider draft UI contract, including the mandatory existing-request match step in both bill-upload and manual-entry paths.
- Bundled-row UI (mark a row as bundled into rent or another expense) and the bundling fields on the row schema.
- Summary row/collapsed state.

### Provider Request / Eng Queue Plan Should Own

- `provider_requests` table and enums (no `provider_request_properties` join table).
- Request creation/linking server actions.
- Request deduping rules.
- `/eng/requests` queue implementation.
- Request completion resolver that writes `provider_profile_id` onto linked `charge_definitions` rows in place, keeping `provider_request_id` as a breadcrumb.
- Provider-request file upload handling for bills that become `provider_test_bills`.
- A `provider_test_bills.provider_request_id` link so uploaded example bills can be tied directly to the request that generated them.

### Create Property Plan Should Own

- Designing the rent + contract data model (rent table, contract table, storage bucket layout) — these are not specified by this guidepost.
- Final transaction that writes the property, units, rent, tenants/invites, contract metadata, and expense `charge_definitions` together.
- Mapping checkout expense rows to canonical expense inputs.
- Linking each expense to either `provider_profile_id` or `provider_request_id` (or marking it as bundled), per the 3-state constraint.
- Creating or linking `provider_requests` from checkout draft missing-provider state, deduping when multiple expense rows in the same draft point at the same missing provider.
- Moving the contract draft file from its temp location into the permanent storage bucket and linking it to the new contract row.
- Uploading/linking provider-request bills to `provider_test_bills` after the property exists.
- Ensuring no rent rows are inserted into `charge_definitions` (rent lives in the rent table).
- Server action shape: return the created summary payload (property id, name, unit/expense counts, anything the success screen renders) so the UI does not need a follow-up fetch.
- IndexedDB cleanup of the wizard's persisted draft on success.
- Success screen rendering and the redirect-to-home behavior when a stale draft URL is revisited after success.
- Visual treatment of skipped sections in the review/summary step.
- Cleanup/retry behavior for storage uploads that succeeded while the DB transaction failed (or vice versa).

The create-property DB writes should run inside a single Postgres RPC/function so property, units, rent, tenant invites, contract row, expense charge definitions, and provider request links commit transactionally. Storage uploads (contract file, provider-request bills) remain outside the DB transaction.

### Out Of Scope For This Guidepost

- Full provider matching algorithm details and thresholds.
- Engineering playground request UI implementation.
- Provider profile creation workflow.
- Payment matching implementation.
- Monthly ledger implementation.
- Tenant/landlord notification flows when a requested provider becomes supported.
- The completion-resolver mechanics (function shape, audit logging, error handling) — owned by the provider-request plan.
- The rent + contract table designs and contract storage layout — owned by the create-property plan.
- The visual treatment of skipped sections in the review/summary UI — owned by the create-property plan.

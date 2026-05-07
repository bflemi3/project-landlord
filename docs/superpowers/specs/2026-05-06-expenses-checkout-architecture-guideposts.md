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
- Keep or add `provider_id uuid references providers(id)` for known company identity.
- Add `provider_request_id uuid references provider_requests(id)` as a bridge to missing/unsupported provider work.
- Add database constraints so `provider_profile_id`, when present, belongs to the same `provider_id`.
- Eventually remove or deprecate `charge_type` after old call sites are migrated.

The `expense_type` enum already exists, but it is not yet attached to `charge_definitions`. Add the missing column and use generated Supabase types throughout the codebase, following the existing database-enum pattern used by `property_type`.

The codebase currently also has a separate `provider_category` enum on `provider_invoice_profiles`. For the pivot, provider profile category and expense type are the same product concept. Prefer one canonical enum for both. The implementation plan should either migrate `provider_invoice_profiles.category` to use `expense_type` or otherwise make the mapping explicit and temporary. Do not let future code assume `provider_category` and `expense_type` are different product concepts.

The canonical expense enum should include every expense type the checkout can present. Add missing values such as `insurance` if they are supported in the UI. The current enum already includes `trash`; keep it in the UI/default map.

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

### Provider Request Properties

Do not put a single `property_id` directly on `provider_requests` as the only property link. Multiple properties may need the same requested provider/profile.

Use a join table:

- `provider_request_properties.provider_request_id`
- `provider_request_properties.property_id`
- timestamps

This lets the product dedupe "same missing provider in same region" while tracking demand across many properties.

When the final create-property action creates or links a provider request, it should also create a `provider_request_properties` row for the newly-created property.

Use `charge_definitions.provider_request_id` to link exact expense rows to provider requests. One provider request can link to multiple `charge_definitions` rows because many charge rows may reference the same request. `provider_request_properties` remains the property-level demand tracking table; `charge_definitions.provider_request_id` is the expense-level resolution link.

If a post-create expense is later deleted and its provider request is no longer linked to any property, charge definition, correction, or engineering work item, the cleanup path may remove the request and its request-only test bill. Do not apply that cleanup to existing requests used by other properties or expenses.

### Resolving Requests

Use Option A: resolve affected expense rows in place when engineering completes a request.

Initial state:

- `provider_requests.provider_id = null`
- `provider_requests.profile_id = null`
- `charge_definitions.provider_request_id = <request id>`
- `charge_definitions.provider_id = null`
- `charge_definitions.provider_profile_id = null`

When engineering completes the request:

1. Engineering creates or links the real `providers` row.
2. Engineering creates or links the relevant `provider_invoice_profiles` row.
3. The request is updated with `provider_id`, `profile_id`, and `status = complete`.
4. A resolver finds affected `charge_definitions` through `charge_definitions.provider_request_id` and updates those rows in place, setting `provider_id` and `provider_profile_id`.
5. Keep `provider_request_id` on the charge for traceability.

This keeps runtime billing/payment logic clean while preserving how the provider entered the system.

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

The primary "provider does not exist" flow should be bill-first:

1. User taps "I don't see my provider."
2. Primary path asks them to upload a bill.
3. The system extracts provider name and tax ID when possible.
4. The system makes a best-effort match against existing provider requests.
   - If CNPJ is extracted, first try direct request matching by tax ID.
   - If no direct match exists, fuzzy-match by extracted provider name, property region, and expense type when available. Expense type is request/profile-support context, not a permanent provider-company classification.
   - Show likely existing requests before allowing a new request.
5. The user reviews and edits the extracted name if needed.
6. Secondary path: "I don't have the bill" lets the user manually type the provider name and, optionally, a provider tax ID.
7. If an existing request is selected, persist a draft link to that request in checkout state.
8. If no existing request matches, persist a draft new-provider request in checkout state.
9. Create or link the actual `provider_requests` row only when the property is created.
10. Link the created expense to the request via `provider_request_id`.

The expense row can then honestly show:

> Enliv Energia · Requested, not supported yet

If a bill is uploaded during checkout, the expense row should store enough draft file/request state in the property creation store to complete the request on final submit. Let the existing store persistence middleware handle IndexedDB persistence. On property creation, store the bill in `provider_test_bills` with source `provider_request`, linked to the request. Add a `provider_request_id` foreign key to `provider_test_bills` when the request table lands so the bill/request link is explicit. The property region should be captured automatically from the property; the landlord should not enter region details.

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

- Database migrations needed to make expense-backed charge definitions possible: `expense_amount_behavior`, `charge_definitions.expense_type`, `charge_definitions.amount_behavior`, `charge_definitions.provider_profile_id`, `charge_definitions.provider_request_id`, constraints, and any temporary compatibility notes for `charge_type`.
- Database migrations needed to align provider profile category with expense type, including adding missing enum values such as `insurance` and ensuring `trash` is represented in the UI.
- Checkout-local expense row schema.
- Default section data and extraction seeding.
- Expense list UI inside the checkout accordion.
- Expense type selection.
- Amount behavior default map and override UI.
- Provider picker UI contract.
- Missing-provider draft UI contract.
- Summary row/collapsed state.

### Provider Request / Eng Queue Plan Should Own

- `provider_requests` table and enums.
- `provider_request_properties` join table.
- Request creation/linking server actions.
- Request deduping rules.
- `/eng/requests` queue implementation.
- Request completion resolver that updates affected `charge_definitions`.
- Provider-request file upload handling for bills that become `provider_test_bills`.
- A `provider_test_bills.provider_request_id` link so uploaded example bills can be tied directly to the request that generated them.

### Create Property Plan Should Own

- Final transaction that writes expense `charge_definitions`.
- Mapping checkout expense rows to canonical expense inputs.
- Linking selected `provider_id`, `provider_profile_id`, or `provider_request_id`.
- Creating or linking `provider_requests` from checkout draft missing-provider state.
- Creating `provider_request_properties` rows for the newly-created property.
- Uploading/linking provider-request bills to `provider_test_bills` after the property exists.
- Ensuring no rent rows are inserted into `charge_definitions`.

The create-property flow should be implemented as a Postgres RPC/function so property, unit, rent, tenant invites, expense charge definitions, provider request links, and related join rows are written transactionally. Storage uploads remain outside the database transaction, so the implementation plan must define cleanup/retry behavior for uploaded contract files and provider-request bills.

### Out Of Scope For This Guidepost

- Full provider matching algorithm details and thresholds.
- Engineering playground request UI implementation.
- Provider profile creation workflow.
- Payment matching implementation.
- Monthly ledger implementation.
- Tenant/landlord notification flows when a requested provider becomes supported.

# Property Checkout Shell: Accordion-Style Property Setup

**Date:** 2026-04-22
**Parent spec:** `2026-04-16-property-creation-design.md`
**Scope:** The checkout-style accordion UX for property setup (Step 2 of the wizard), section state management, navigation behavior, skippability rules, and the create-property server action. Individual section forms are specified in the parent spec and will each get their own implementation plan.

---

## Status (last updated 2026-05-16, shipped in v1.0.0)

**Shipped:**
- Accordion shell with all four section states (upcoming / active / completed / skipped), IconTile tones, "Done" / "Skipped" badges, summary text, smooth-scroll on transitions
- Section-level progress bar inline in the Step-2 TopBar, mobile sticky bottom bar with dot row, desktop sticky summary panel
- 5 of 6 sections fully built: Property details, Rent & dates, Tenants, Expenses (partial — see below), CPF
- `createProperty` server action: single-transaction writes, contract upload before DB writes, idempotent via `draftId`, returns structured error envelope
- Reusable primitives: `<TaxId>`, `src/lib/country/` provider, `<TenantForm>` / `<TenantList>`
- Wizard state schema extended in the existing Zustand + IDB persistence layer; version bump handled

**Outstanding:**
- **Bank account section (Pluggy OAuth).** Section renders in the accordion but the OAuth consent flow, trust-copy content, "already connected" detection, and dual-side payment-state plumbing are not implemented. Privacy policy link uses the "Coming soon" toast until the policy ships. Tracked in parent spec.
- **Provider matching for expenses.** Section accepts free-text provider entry and reads from the seeded `providers` table. The four-case resolution flow, CNPJ cache, fuzzy name search (pg_trgm or alternative), regional support detection, landlord-facing RLS on `providers`, and the auto-queued support-request signals are deferred. Research notes: memory `project_provider_matching_research.md`.

---

## Context

After the landlord uploads a contract (or skips it), they land on a single page where all property setup sections are presented as an accordion. This replaces the original multi-step wizard approach (steps 2-8 in the parent spec) with a progressive-disclosure checkout flow. The user completes sections top-to-bottom, with completed sections collapsing into summaries and upcoming sections staying muted until reached.

This spec defines the **shell** — the accordion container, section states, progress tracking, navigation, and the final "Create property" action. Each section's internal form (address fields, rent inputs, tenant list, etc.) follows the parent spec and will be planned separately.

---

## UX Architecture

### Layout

**Mobile (primary):** Single column. Sticky bottom bar with dot progress indicator and a disabled "Create property" CTA that enables when all required sections are complete.

**Desktop:** Two columns. Left: accordion sections. Right: sticky summary panel showing completion state per section and the "Create property" button. The summary panel scrolls with the page but stays visible via `position: sticky`.

### Visual references

- Desktop mockup: `.superpowers/brainstorm/27525-1776865809/content/checkout-flow-v2.html`
- Mobile mockup: `.superpowers/brainstorm/27525-1776865809/content/mobile-selected.html`

These are **design references only** — the implementor must use existing codebase primitives (`Card`, `IconTile`, `SectionLabel`, `InfoBox`, `Button`, `Input`, `StickyBottomBar`, etc.) from the component library, not copy raw HTML. The implementor should also follow established design patterns and use the appropriate claude project skills when implementing.

### Landlord identity — the creator is "you"

The user creating the property is the landlord. Anywhere the landlord is referenced in a surface they themselves will see, refer to them as "you" / "me" / "your" rather than echoing their name back — showing a landlord their own name in a field that represents them feels robotic. This principle applies to:
- The desktop summary panel (header, creator/landlord references)
- Confirmation copy in the accordion sections
- The extracted-parties filtering in Tenants (the creator is filtered out; no "this is you" row)
- Any future surface where the current user sees themselves referenced as the landlord (e.g., property detail page, settings)

The principle is about the current user's own view. Anywhere the landlord is referenced to a *different* user (e.g., a tenant viewing the property, an invite email), the landlord's actual name is correct.

Match the creator to extracted parties when possible (by name, CPF, or email against the current user's profile). Match against **both** `landlords[]` and `tenants[]` since LLM role classification is unreliable — the creator could plausibly appear in either array. If a match is found, filter that party out of the Tenants section's candidate list (they're the implicit landlord of record, not a tenant). If no match is found, still treat the creator as the landlord of record; no mismatch UI for MVP. Multi-landlord / co-landlord support is out of scope.

---

## Wizard Flow

The property creation wizard has two phases:

1. **Step 1 — Contract upload** (existing, already built): Upload contract or tap "I don't have a contract." Uses the current `WizardShell` step-based flow with `SlideIn` transitions.

2. **Step 2 — Property setup** (this spec): A single page with accordion sections. A section-level progress bar tracks completion across all accordion sections.

Transition from Step 1 to Step 2:
- **Contract path:** After extraction completes, the wizard auto-advances to Step 2. Extracted data pre-fills the accordion sections — the accordion IS the review experience. The current review-extraction step is temporary and will be replaced by this flow.
- **No-contract path:** After tapping "I don't have a contract," the user goes directly to Step 2 with empty forms.

### Wizard header per step

The `WizardShell` primitives (TopBar, Back, Close, Progress) are retained — this change is about *what renders* per step, not about removing the primitives.

- **Step 1:** `WizardShell.TopBar` with `WizardShell.Close` only. No Back (nothing to go back to within the wizard). No progress bar — it's a single-action screen. Title/label in the TopBar is optional (the upload UI carries its own heading).
- **Step 2:** `WizardShell.TopBar` with `WizardShell.Back` (returns to Step 1 to change/remove the contract) and `WizardShell.Close`. The 6-segment section-level progress bar renders *inline within the TopBar* (between Back and Close) — not on its own row below — to save vertical space. The 2-segment wizard-level progress bar is NOT rendered.

The Close button's position is consistent across both steps so it feels stable as the user moves through the flow.

---

## Sections

Six accordion sections, always presented in this order:

| # | Section | Icon | Required (contract path) | Required (no-contract path) |
|---|---------|------|---|---|
| 1 | Property details | Home | Yes | Yes |
| 2 | Rent & dates | DollarSign | Yes | No |
| 3 | Tenants | Users | No | No |
| 4 | Expenses | Zap | No | No |
| 5 | Your CPF | CreditCard | Yes | Yes |
| 6 | Bank account | Landmark | No | No |

**"Create property" enables when all required sections for the active path are complete.**

- Contract path minimum: Property details + Rent & dates + CPF
- No-contract path minimum: Property details + CPF

---

## Section States

Each section exists in one of four states:

### Upcoming
- Collapsed, muted presentation
- `IconTile tone="muted"`
- Title visible, subtitle visible (describes what the section covers)
- No shadow on the card
- Not interactive — user must complete previous required sections first (but can skip optional sections)

### Active
- Expanded, showing the section's form
- `IconTile tone="primary"`
- Card has elevation (`shadow-card`)
- Contains the section's form fields
- "Continue" and "Back" buttons at the bottom of the section body, separated by a `border-top`
- "Continue" validates the section, collapses it to completed state, and opens the next section
- "Back" collapses the current section (preserving entered data) and re-opens the previous section

### Completed
- Collapsed, showing a one-line summary of what was entered
- `IconTile tone="success"`
- "Done" badge (`badge.done` with checkmark icon)
- Summary text below the header (left-aligned under the title, indented to clear the icon tile)
- Tapping the section header re-expands it to the active state

### Skipped
- Collapsed, same as upcoming but with a "Skipped" badge (`badge` with muted tone)
- Can be re-opened by tapping the section header
- Only available for optional sections

---

## Navigation Behavior

### Linear progression with free editing
- Sections open top-to-bottom by default
- "Continue" in the active section → validates → collapses to completed → opens next section
- "Back" in the active section → collapses current (preserving entered data) → re-opens previous section
- Tapping any completed or skipped section header → re-opens it as active (current active section collapses, preserving its data)
- "Skip" button appears next to "Continue" for optional sections → marks as skipped → opens next section. "Skip" is a text button (ghost variant), not a primary button.

### Button layout in the action bar
- "Back" is anchored to the left side of the card actions area
- "Continue" is anchored to the right side
- When "Skip" is present, it sits immediately to the left of "Continue" (also right-aligned), keeping Back and Continue visually separated on opposite ends of the bar

### Scroll behavior
- Smooth-scroll so the newly active section's header is near the top of the viewport when the user taps "Continue" or "Back"
- Do NOT auto-scroll when the user taps a section header directly to re-open it — the user is already looking at that section, moving the page under them would be disorienting
- On mobile, account for the sticky bottom bar height when calculating scroll position

### Validation
- Each section runs live validation as the user fills it out. "Continue" is disabled until the section is valid — no need to submit-then-show-errors
- Inline field errors surface on blur (not on submit — submit is gated by the Continue button, which is disabled when the section is invalid)
- "Create property" is only enabled once every required section is marked complete. Since sections can only be marked complete when valid, the submission payload is already guaranteed valid client-side
- **One Zod schema per section, shared between client and server** — imported by the client form (live validation) and the server action (authoritative trust boundary). Derive TS types via `z.infer`. No duplicated client/server schemas

---

## Progress Tracking

### Section-level progress bar
- Reuse the existing `StepProgress` component, adapted to support per-segment state (`done` / `active` / `upcoming` / `skipped`) so the same component powers both the wizard-level bar and this section-level bar
- Rendered inline within the Step 2 TopBar (between Back and Close), one segment per section
- Visually distinct states per segment — design tokens per the design system (completed distinct from active distinct from upcoming/skipped)
- Segments only — no labels. The TopBar doesn't have room, and the mobile dot progress + desktop summary panel already communicate section identity
- Consider extending `StepProgress` to accept optional per-segment labels in the same adaptation pass, so future surfaces can render labeled variants without another rewrite

### Mobile sticky bottom bar
- Dot progress: one dot per section, colored by state (done/current/pending)
- "Create property" button: disabled with count of remaining required sections (e.g., "Create property - 4 remaining")
- Enabled with primary styling when all required sections are complete

### Desktop summary panel
- Sticky sidebar listing each section with its completion state
- Shows entered values for completed sections (e.g., "Av. Campeche, 1234, Apto 501")
- "Create property" button at the bottom of the panel

---

## State Persistence

**Reuse the existing versioned, IndexedDB-backed wizard state utility — do not build a new persistence layer.** It lives under `src/app/app/(focused)/p/new/[draftId]/state/` and is already wired into this wizard (Zustand + persist middleware backed by IDB; see `state/store.ts` and `state/persistence.ts`). The only changes this spec asks for:

- Extend the existing `PropertyCreationStateShape` to include per-section form data, active section index, and per-section completion state (completed / skipped / incomplete). Existing extraction + contract-file fields stay as-is
- Bump `PROPERTY_CREATION_STATE_VERSION` when the shape changes — old persisted states are then discarded on load (the persist middleware already handles version mismatch)
- Save on every Continue and on section completion/skip — same save pattern as today, just more frequent

---

## "Create Property" Server Action

When the user taps "Create property," a single server action writes all collected data to the database:

### Contract file upload

During the wizard the contract lives as a Blob in IndexedDB (per the parent spec) — it has not been uploaded to Storage. The "Create property" flow is where the file finally lands in Storage.

- **Contract path:** upload the Blob to Supabase Storage **before** the DB writes, then include the storage path/ID in the property record write. If the upload fails, don't attempt the DB writes — surface the error and let the user retry
- **No-contract path:** skip the upload step entirely
- Reuse the existing storage-upload utility in `src/lib/storage/`
- After successful upload and property creation, the IndexedDB blob is cleared as part of wiping wizard state on success

### What it creates
1. **Contract file in Supabase Storage** (if uploaded) — uploaded first so subsequent records can reference the storage path
2. **Property record** — address, property type, name, created_by
3. **Rent record** (if provided) — amount, currency, due day, start/end dates, adjustment details, linked to property
4. **Tenant invitations** (if provided) — one `invitations` row per tenant (email, name, role=`tenant`, property_id, `tax_id`). **Why the landlord adds tenants at property creation:** the platform surfaces bills and payments *from* the tenant to the landlord — payment matching against the tenant's bank transactions, on-time-payment signals feeding the tenant's reputation score, late-payment notices, and rent-received / rent-due notifications all depend on the tenant being associated with the property before bills start flowing. Without tenants on the property, the landlord can't see who owes what or get the automation the product promises. Status depends on the "invite now" toggle:
   - Toggle on → `pending` status + send invite email immediately
   - Toggle off → `not_invited` status + no email sent. The landlord can trigger the invite later from the property page
   - `not_invited` is a new status, distinct from `draft` (which may be used for landlord-side in-progress invitations later). `not_invited` specifically means "the tenant is known but the landlord has chosen not to invite them yet" — this lets us query "invitations still pending an invite send" separately from "invitations sent but not yet redeemed"

   **Profiles are NOT created directly here** — tenant profiles only come into existence after the invited person redeems the invite via the existing signup flow (`profiles.id` references `auth.users(id)`, so a profile requires an auth user). **Membership rows are NOT created here either** — they're created as part of invite redemption. The `invitations` table acts as the holding place for every tenant the landlord has added but who hasn't joined yet.

   **Schema changes needed (planning task):**
   - Add `tax_id text` column to `invitations` — stores the tenant's tax ID so it can be pre-filled into the profile form during signup redemption (one less thing for the tenant to type, and the landlord-provided value is the more authoritative source for billing records)
   - Add `not_invited` to the `invitation_status` Postgres enum (via `ALTER TYPE ... ADD VALUE`)
   - **Note:** `profiles.tax_id` already exists — the `profiles.cpf` → `profiles.tax_id` rename shipped in migration `20260413120000_billing_intelligence_profiles.sql`. No rename needed
5. **Charge definitions** (if provided) — type, provider association, amount per expense
6. **Tax ID update** (if collected) — updates `profiles.tax_id` with the landlord's own tax ID. UI copy for Brazilian users still reads "CPF" — only the underlying column is renamed
7. **Contract link** (if uploaded) — associates the uploaded contract file (Storage path) and extraction record with the property

### Behavior
- DB writes happen in a single transaction — all-or-nothing
- Storage upload is outside the DB transaction (Storage isn't transactional with Postgres). On DB failure after a successful upload, the orphan Storage file should be cleaned up or tracked for cleanup
- On success: clear wizard state from IndexedDB and navigate to the existing success screen. The success screen will be redesigned in a future spec/plan — this flow just routes to whatever exists today
- On failure: surface errors to the user. If an error ties to a specific field (e.g., "CPF already in use on another account", "address duplicate"), the error should appear inline near that field in its section, and that section should auto-open so the user sees it. For generic/unknown errors, fall back to a toast. Keep wizard state intact so the user can retry
- **Research needed during planning:** Determine how granular server-action errors can get. Options include (a) the server action returns a discriminated union with per-field error codes that map to specific section fields, (b) errors are all-or-nothing and field-specific errors require pre-submit validation via separate server calls (e.g., check address uniqueness before submit), or (c) a hybrid. The plan should specify which approach is feasible and design the error-to-field mapping accordingly
- Idempotent — safe to retry without creating duplicates (use the wizard draft ID as an idempotency key). A retry after a successful upload but failed DB write should reuse the existing Storage object rather than re-uploading

### Input validation
- Server action composes the per-section Zod schemas (the same ones the client uses for live validation) into a combined submission schema — single source of truth, no duplication
- Validates all required fields for the active path (contract vs no-contract)
- Returns typed error codes, not user-facing strings. The frontend maps codes to i18n keys and to the field/section the error belongs to (per the error-surfacing behavior above)

---

## Section-Specific UX Notes

These notes flag non-obvious complexity within each section. The section forms themselves follow the parent spec; these are implementation considerations the plan author should be aware of.

### Property details
- **Existing component:** `PropertyForm` + `CepField` already handle CEP lookup, address auto-fill, and duplicate address validation. Reuse them
- **New field:** Property type selector (apartment/house/commercial/other). The `property_type` enum exists in the DB but the column hasn't been added to the `properties` table yet — a migration is needed
- **Contract pre-fill:** Extracted address fields pre-populate the form. Visually indicate which fields came from extraction vs. manual entry (subtle, not intrusive)
- **Responsive layout:** The existing `PropertyForm` was built for a narrow wizard step; on desktop the accordion section is much wider. Adapt the form to use the available space on desktop while staying stacked on mobile. The plan decides the exact field grouping
- **Complexity:** Low-medium. The form exists; main work is integrating it into the accordion section wrapper and adapting the layout for desktop widths

### Rent & dates
- **Bundled rent:** If extraction detected bundled rent (e.g., R$6,300 covering rent + condo + IPTU), surface this with an `InfoBox` explaining what's included. The user confirms or adjusts
- **Currency input:** Amount stored as integer minor units. The form needs a currency-formatted input (R$ 6.300,00 for BRL). A hero-style currency input exists in the charge form but is too visually specific for an inline accordion field — a reusable primitive with standard Input chrome is needed here. The plan extracts the shared behavior (amount state, currency symbol, formatting) and refactors the existing hero input to compose it. The existing formatting helper stays as-is
- **Adjustment details:** Frequency, method, index name are secondary fields. Consider collapsing them under an "Adjustment details" expandable within the section to keep the primary view clean
- **Complexity:** Medium. Currency primitive extraction, bundled rent UX, and adjustment details add nuance

### Tenants
- **Invite toggle:** Each tenant row has a "Send invite email" toggle (default on). The toggle controls whether an invite email is sent when the landlord taps "Create property" — explained inline with helper copy on the first row only ("We'll email them when you create the property"). Suppressing the email still creates the tenant association.
- **Add/remove:** Landlord can add or remove tenants. Minimum 0 (section is optional).
- **Email requirement:** Email is required per tenant if the invite toggle is on. If toggled off, email is optional.
- **Contract pre-fill — seed from `extractionResult.tenants[]`:** Each `ContractParty` in `extractionResult.tenants` becomes a pre-filled tenant row. The creator match (by name / tax_id / email against the current user's profile) is filtered out before rendering — they're the implicit landlord of record. Misclassified parties (a guarantor/fiador the LLM dropped into `tenants[]`, a witness, etc.) are handled by the per-row Remove action; the landlord can also manually add anyone extraction missed. We do not unify `landlords[]` into the candidate list — the spec previously did this to hedge against role-classification noise, but in practice trusting `tenants[]` plus easy Remove + Add covers the same ground without the cognitive overhead.
- **Field pre-fill per row:** Name, tax ID (`taxId`), and email pre-filled from the `ContractParty` when extraction returns them. Extracted emails are rare but do happen — populated when present, left empty when absent (required to enter if the invite toggle is on).
- **Auto-filled indicator (per row):** Each row carries an `isExtracted: boolean` flag. Set `true` when the row was seeded from extraction; flipped to `false` the first time any field on the row changes from its current value (the row's setter handles the comparison-and-flip). Manually-added rows are born `false`. The auto-filled indicator reads this boolean — no comparison against `extractionResult` at render time, no duplication of extraction values into `sectionData`. This is row-level (not field-level) on purpose: a tenant is a person, and field-level sparkles per row would be visually noisy with multiple rows.
- **Reusable component:** Build a reusable `<TenantForm>` (single tenant, decomposed into smaller field primitives — name input, `<TaxId>`, email, invite toggle) and a `<TenantList>` that owns add/remove and renders rows. Located under `src/components/tenant-form/`. The wizard checkout section composes `<TenantList>`. The existing `InviteTenantModal` at `src/app/app/(main)/p/[id]/sections/tenants-section.tsx` is **not refactored as part of this work** — it stays as-is to keep scope tight; future work can swap its body for `<TenantForm>` if/when it needs the same fields.
- **Complexity:** Medium. Dynamic list with per-row toggles, conditional email validation, country-aware tax ID input, and the `isExtracted` flag plumbing.

### Expenses

- **Design principle — track every expense tied to the property, regardless of who pays.** Landlord and tenant see the same list of charges the property carries (electricity, water, condo, internet, etc.) and can see that everything is up to date. Who is *responsible* for paying a given bill is a separate concern — determined later, potentially per-bill, never dictated by who the landlord entered the expense for. The section's copy must make this explicit to the landlord, e.g., "Add every recurring charge this property has, even ones your tenant pays. We'll figure out who's responsible for each charge once bills start coming in."
- **Add/remove/edit:** Dynamic list of expense rows. Each has a `type` (ExpenseType), a `provider` (selected from suggestions or typed free-form), and an optional amount.
- **Contract pre-fill:** Each `extractionResult.expenses` item (`{ type, bundledInto, providerName, providerTaxId }`) becomes a pre-filled row. The landlord reviews and removes **only** items that aren't actually charges for this property (e.g., extraction hallucinations, expenses that don't apply). Items the tenant pays should stay — they're still property-associated charges

#### Provider selection — design intent

The seeded `providers` table is sparse, and the extraction gives us at most a name + CNPJ per expense. The landlord needs help finding a match without being forced to pick one, and the product must never silently create or assign providers on their behalf.

- **CNPJ is the strongest signal when present; name is the fallback.** The matcher uses both, but neither filters out the other — a contract with a stale CNPJ should still produce name-based suggestions the landlord can pick from.
- **Property region matters for support, not for match quality.** Having the provider in our DB isn't enough — we also need to know we can auto-track bills from them *in the landlord's region*. Region enters the flow as a support signal (can we auto-track?), not as a rerank signal (which candidate is best?). A provider with a regional match is "fully supported"; a provider without one is "recognized but not yet supported in your area".
- **Never auto-assign.** Even a perfect CNPJ match is presented as a suggestion the landlord taps to accept. The landlord always makes the final call.
- **Free-text fallback.** When no match is offered (or the landlord rejects them all), a plain text field captures the provider name. Typed-only providers store as a name string on the charge definition — no `provider_id`, no silently created row. The only path that creates provider records is the engineer-reviewed "we don't see your provider" flow — never auto-creation on typo.

#### Provider resolution flow (per extracted expense)

Given an extracted `ContractExpense { type, providerName, providerTaxId }` and the property's region (state / city / neighborhood):

1. **Fully supported match** — Provider exists in our DB *and* we have regional support (a billing-intelligence profile covering the property's region, matching the expense type): present as a selectable suggestion. This is the ideal path; bills from this provider can be auto-tracked end-to-end.

2. **Recognized but not yet supported** — Provider exists in our DB *but* we have no regional support for the landlord's area (no profile for the region, or a profile exists but covers a different region). Show the recognized provider name to the landlord, tell them in plain language that we don't auto-track bills from this company in their area *yet* but we'll be adding support, and quietly queue an internal signal flagging this property/region/provider combination for the engineering team to prioritize. The expense row still gets created and linked to the known provider.

3. **Unknown provider, CNPJ present and resolvable** — Provider isn't in our DB but the contract's CNPJ resolves to a real company (via a cached lookup — see planning notes). Show the official company name to the landlord, tell them in plain language we don't yet support this company, and queue the same kind of internal signal. Do **not** create a `providers` row from this path — creation stays gated on engineering review. The expense row captures the name + CNPJ as free-text.

4. **Unknown provider, no CNPJ or CNPJ unresolvable** — Fall back to free-text name entry for the expense. Offer the "we don't see your provider" link if the landlord wants to flag it for engineering.

**Internal signal queued in steps 2 and 3** — a provider-support request record that engineering reviews. This is the same mechanism as the landlord-initiated "we don't see your provider" flow, just triggered automatically from the resolution flow rather than by an explicit landlord click. The landlord never sees the word "request" or the internal status — they just see the acknowledgement copy.

#### Language and tone

The landlord doesn't know what a "profile" is, what "extraction" means, or why "regional support" matters internally. Translate internal concepts to product language in all copy:

- ✅ "We automatically track bills from this company in your area."
- ✅ "We recognize [Celesc] but don't yet track bills from them automatically in Florianópolis. We'll add support soon — you can still upload bills manually in the meantime."
- ✅ "We don't have [Provider] on file yet. We've flagged it to add soon."
- ❌ "Provider profile not found for region."
- ❌ "Extraction pipeline lacks support for this company."
- ❌ "Parser request submitted."

Keep the acknowledgement calm, not apologetic. The product is doing the right thing by being honest about what's supported; a landlord who's told "we'll have this working soon" feels cared for, not neglected. Pair the message with what the landlord *can* do today (upload bills manually, or skip for now).

#### Planning tasks for the Expenses section

The implementation plan for this section owns the specifics. Items to work out there:

- The matching algorithm — CNPJ lookup, fuzzy name search approach, similarity thresholds, result limits
- How regional support is determined (which `provider_invoice_profiles` field(s) represent coverage, how to compare profile region text against property state/city/neighborhood, what counts as "supported")
- The `ExpenseType` ↔ `provider_category` mapping (lossy — some expense types have no category counterpart)
- Company-name normalization (stripping generic corporate suffixes) before fuzzy matching
- Migration to enable fuzzy search on `providers` (extension + indexes)
- RLS and access policy changes — a landlord-facing read path for `providers` (the existing `findProviderByTaxId` is engineer-gated). Also consider whether resolution-flow step 3 needs a landlord-facing wrapper on CNPJ lookup
- CNPJ resolution — the flow's step 3 depends on turning an unresolved CNPJ into an official company name. Prefer `company_cache` (already populated from prior lookups) over live external calls; only fall back to a live call if cache miss, and budget for that latency (background the call and defer the acknowledgement copy if needed). Landlord UX must not hang on external APIs
- A server action (e.g., `resolveExpenseProvider`) that returns one of: `{ kind: 'matched', provider, supported: boolean }`, `{ kind: 'recognized_by_cnpj', companyName }`, or `{ kind: 'unknown' }` — i.e., one call encapsulates the whole resolution flow
- The internal provider-support request record — schema (property_id, provider_id or tax_id, region context, source: 'auto' | 'user_requested'), engineering review surface, and how the same record serves both the auto-queued signal (steps 2/3) and the explicit "we don't see your provider" flow

#### Out of scope for the Expenses section plan

- Landlord-side creation of `providers` rows — provider records are only created through the engineer-reviewed support flow, never as a side effect of expense entry
- Assigning `bill_holder` (who pays) at property creation — responsibility is deferred per the "track every expense, defer responsibility" principle; it's set later, potentially per-bill
- Engineering's review surface for support-request records — this plan creates the records; the internal review/triage UI is a separate workstream
- Engineering actually building the provider billing profile once a request lands — an engineering follow-up, not this plan
- Editing or removing expenses after property creation — that belongs to the property detail / settings flow, not the creation flow
- Notifying the landlord when a previously-unsupported provider becomes supported — a future notifications workstream

- **Complexity:** High. Matching logic, CNPJ resolution with caching, regional support detection, dynamic list, suggestion UX, internal support-request flow, and a new landlord-facing read path for `providers`.

### Your CPF
- **Always visible.** The section appears in every property creation flow. When `profiles.tax_id` already has a value, the field is pre-filled and rendered **read-only** so the landlord can confirm "yes, that's me" rather than being asked for data the system already has. The section can still be marked complete in this state — the read-only field satisfies the required validation
- **Why-we-ask copy (required inline).** The section must explain *why* we collect the CPF, in plain language. The three reasons:
  1. **Bill matching** — bills the landlord uploads or that arrive via ingestion get matched to them automatically when addressed to their CPF. Without it, every bill has to be confirmed manually
  2. **Bank connection** — the Open Finance flow (Bank account section, Pluggy) requires the CPF to associate the connection with the right person
  3. **DDA / condo fee auto-discovery (future)** — DDA is a CPF-indexed registry; boletos addressed to the landlord's CPF will be discovered automatically once we ship this
  Translate these to product language — avoid the terms "DDA" and "Open Finance" in the copy itself (use "condo fees show up automatically" and "connecting your bank"). Keep the tone reassuring, not demanding: we ask because it unlocks the automation, not because we need to ID them
- **Editing an existing CPF is out of scope here.** If the landlord wants to correct a CPF already on their profile, they do it from profile settings (or wherever profile editing lives), not from this section. The read-only field can link out to that surface, but this flow doesn't need to support in-place edits
- **Tax ID update rule.** The server action writes `profiles.tax_id` **only when the landlord entered a new value** (empty-case path). When the section was pre-filled read-only, skip the update — the data is already correct and overwriting it with an identical value is pointless noise on the profile record
- **UI copy** reads "CPF" for Brazilian users — the column is renamed to `tax_id` at the data layer only, per the country-agnostic data-modeling principle. The label string is derived from the country provider, not hardcoded
- **Validation:** Country-aware. For Brazil: CPF format (11 digits, check digits) via the existing `isValidCpf` helper. The masked input format, placeholder, and validation come from the country provider, so this section never imports CPF specifics directly
- **Reusable primitive — `<TaxId>`:** A country-aware tax-ID input lives at `src/components/ui/tax-id.tsx` (or similar), decomposed from the existing `<Input>` primitive. It accepts a `countryCode` prop and resolves format/mask/placeholder/validation/label from the country provider (see "Country provider" architectural note below). Used here, in the Tenants section, the existing `InviteTenantModal` (future), profile settings, and invite redemption. Built as part of the Tenants section plan since both sections need it; the CPF section consumes it without needing its own primitive work
- **Country provider direction:** The codebase consolidates per-country specialization into a single provider tree at `src/lib/country/` — `getCountryProvider('BR').address` and `.taxId`, with future room for phone, business ID, etc. The existing `getAddressProvider` becomes a thin convenience wrapper over the new shape. This direction is established by the Tenants section plan; the CPF section reads from it
- **Complexity:** Low. Country-aware masked input for the empty case, a read-only presentation for the pre-filled case, and provider-driven validation

### Bank account
- **Trust-critical:** This section must communicate why (automation), how (Pluggy, read-only), and safety (can't move money, regulated, etc.). All trust content from the parent spec (Step 7) must appear inline, not collapsed.
- **Privacy policy link:** The trust copy references a privacy policy — a "Learn more about how we use your data" or similar link must be present inline with the trust content. The policy itself doesn't exist yet; for now, the link triggers a "Coming soon" toast (reuse the existing toast pattern) instead of navigating. The link is required from day one so the UI doesn't need to change when the policy ships — only the click handler gets swapped for a real route
- **OAuth flow:** Pluggy consent flow opens in a new window/tab. The section needs to handle the callback and show connection status.
- **Already connected:** If the user has an existing Pluggy connection, show it and ask if it's the right account for this property.
- **Skip messaging:** Skipping is allowed but should feel like missing out. Use an `InfoBox` with warning tone explaining what they lose (manual payment confirmation for every payment).
- **Complexity:** High. OAuth integration, trust copy, connection status management, skip-discouragement UX.

---

## Scope Boundaries

### Component approach
- Install shadcn Accordion (`npx shadcn@latest add accordion`) — built on Radix, provides accessible open/close primitives and `type="single"` behavior (one section open at a time)
- Build a reusable `CheckoutAccordion` compound component on top that adds: section states (upcoming/active/completed/skipped), `IconTile` integration, summary slot for completed sections, Continue/Back/Skip action bar, and progress tracking
- This component should be generic enough to reuse for future multi-section flows (e.g., tenant onboarding), not coupled to property creation

### In scope (this spec)
- Accordion shell component and section state management
- Section-level progress bar (segmented)
- Mobile sticky bottom bar with dot progress and CTA
- Desktop sticky summary panel
- Section navigation (continue, back, re-open via header tap, skip)
- State persistence extensions to `PropertyCreationData`
- "Create property" server action (single transaction write)
- Scroll behavior on section transitions
- Integration with existing `WizardShell` (Step 1 → Step 2 transition)

### Out of scope (this spec)

**Deferred to per-section plans:**
- Individual section form implementations (each section gets its own plan)
- Provider matching logic and suggestion UX (Expenses section plan)
- Pluggy OAuth integration (Bank account section plan)

**Deferred to other workstreams:**
- Success screen redesign (the action routes to whatever exists today)
- Resume-from-home UI for abandoned wizards (tracked in memory)
- The actual privacy policy page — the Bank account section links to it, but clicks trigger a "Coming soon" toast until the policy ships. The link swap is trivial when the policy is ready
- Editing a pre-filled CPF in the Your CPF section — handled from profile settings, not this flow
- Engineering's review surface for provider support-requests (this flow creates the records; the internal triage UI is a separate workstream)
- The schema changes this spec flags as planning tasks (`invitations.tax_id`, `not_invited` status, fuzzy-search extension and indexes on `providers`, landlord-facing RLS on `providers`, `property_type` column on `properties`, the support-request record) — each belongs to the per-section plan that surfaces it, not this shell spec

---

## Implementation Approach

The recommended implementation order:

1. **Accordion shell + section state machine** — the container, state transitions, progress bar, sticky bars. Use placeholder content for each section.
2. **Property details section** — first real section, reuses existing `PropertyForm`. Proves the accordion integration pattern.
3. **CPF section** — simple, proves the read-only-completed-section pattern (pre-filled tax ID renders read-only while still marking the section complete).
4. **Rent & dates section** — medium complexity, currency input and bundled rent UX.
5. **Tenants section** — dynamic list with toggles.
6. **Expenses section** — most complex form, provider matching.
7. **Bank account section** — OAuth integration, trust copy.
8. **"Create property" server action** — ties everything together.
9. **Contract pre-fill integration** — wire extraction data into all section forms.

Each step is a separate plan. The accordion shell (step 1) is the immediate next plan. Property details (step 2) can likely be combined with the shell plan since the form already exists.

---

## Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Multi-step wizard vs. accordion | Accordion on a single page | Research (NN/g, Baymard) supports progressive disclosure for 5+ related sections. Users can see full scope, edit freely, and don't lose context. |
| Desktop layout | Two-column with sticky summary | Summary panel gives constant progress visibility without scrolling. Standard checkout pattern. |
| Mobile layout | Single column + sticky bottom bar with dots | Dot progress is compact, CTA always visible. No space wasted on summary panel. |
| No-contract required sections | Property details + CPF only | Minimal friction for landlords without a contract handy. Everything else can be added later. |
| Contract required sections | Property details + Rent & dates + CPF | Rent data is extracted and should be confirmed. Other sections optional even with extraction data. |
| Create property action | Single transaction, all data at once | User expectation after completing a checkout flow. No orphaned partial state. |
| Section navigation | Linear with free editing | Top-to-bottom default, but completed/skipped sections can be re-opened anytime by tapping the section header. |
| Skippable sections | Tenants, Expenses, Bank account (both paths); Rent & dates (no-contract only) | Low friction entry. Landlords add details as they become available. |
| Implementation order | Shell first, then sections by complexity | Accordion shell is the foundation. Simple sections first to prove patterns, complex sections last. |

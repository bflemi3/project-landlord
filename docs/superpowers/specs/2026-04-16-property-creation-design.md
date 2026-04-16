# Property Creation: Contract-Driven Onboarding

**Date:** 2026-04-16
**Scope:** The property creation wizard — from contract upload through success screen. First feature in the product pivot to long-term rental management.

---

## Context

Mabenn is pivoting from short-term rental billing to long-term rental management. The property creation flow is the first thing a landlord touches. It needs to be simple, enjoyable, and demonstrate the platform's value immediately — "I uploaded a contract and the platform understood my property."

Alex (landlord, 3 properties) is the first user. This flow is designed for him to add his first property and invite Brandon (tenant).

---

## Flow Overview

A wizard-style flow where the contract PDF drives everything. The landlord uploads a contract, the platform extracts structured data, and subsequent steps present that data for review and editing. Every extracted field is editable — the platform suggests, the landlord confirms.

**State preservation:** All wizard data is persisted to local storage / IndexedDB via a reusable wizard state persistence hook/utility. This serves both purposes: navigating back and forward within the wizard preserves all user edits, and if the user abandons the wizard, they can resume later from where they left off. State is only cleared when the contract is removed/replaced (which resets all extraction-derived fields) or the wizard is completed successfully.

The persistence utility should be reusable — not coupled to property creation. Future wizards (e.g., tenant onboarding) should be able to use the same mechanism. This spec covers the persistence mechanism only — the UI for resuming an abandoned wizard (e.g., a prompt on the dashboard) will be handled in a later spec.

**Contract PDF:** Since the contract is uploaded to Supabase Storage immediately in step 1, the persisted wizard state only stores a pointer to the uploaded file (storage path/ID), not the file itself.

**Step transitions:** Steps slide in/out as the user progresses forward or goes back — slide left to advance, slide right to go back. Step 1 displays immediately on mount with no animation. This should be part of the reusable wizard infrastructure, not specific to property creation.

**With contract:** Upload → Property details → Contract terms → Tenants → Expenses → CPF (if missing) → Bank account → Success

**Without contract:** "I don't have a contract" → Manual address form → Manual rent/expenses (optional) → CPF (if missing) → Bank account → Success (tenants skipped)

---

## Wizard Steps

### Step 1: Upload Contract

Two paths presented on one screen:

**Primary path:** Upload contract PDF (drag-and-drop or file picker). Extraction runs immediately. Supports EN, PT-BR, and ES contracts via a pluggable language adapter pattern — extraction code is abstracted so languages are plug-and-play.

**Alternate path:** "I don't have a contract" link/toggle. Skips extraction and enters a lighter manual flow (address form, manual rent/expenses optional, CPF if missing, bank account connection). Tenants are skipped.

**After upload:** A polished "thinking..." overlay appears while extraction runs — the platform is "reading" the contract. Should include a smooth animation (e.g., document scanning effect, pulsing/morphing logo, or animated progress indicator) to make the wait feel intentional and premium. Keep it simple — if a polished animation is straightforward to build, include it in the first pass; if not, ship with a clean loading state and improve later. Once extraction completes, the wizard auto-advances to step 2. The user does not need to tap "Next."

**Going back to step 1:** From any subsequent step, the user can go back to step 1 to remove the contract or upload a new one. If the contract is removed or replaced:
- The previous PDF is deleted from Supabase Storage
- The previous extraction record is deleted from the database
- All pre-filled fields from the old extraction are cleared
- If a new contract is uploaded, extraction runs again and re-populates subsequent steps

**If extraction fails entirely:** Clear error message explaining what happened. CTAs: retry upload, try a different file, or switch to manual setup. Never a dead end.

### Step 2: Property Details

Extracted from contract, all fields editable:

- Property address (street, number, complement, neighborhood, city, state, CEP)
- Property type or description (if extractable)

From the address, the platform derives the region and looks up utility providers available in the system. This is used in step 5 for provider matching.

**No-contract path:** This step becomes a manual address entry form.

**Note:** An address form already exists in the codebase — reuse it rather than building a new one. The implementation plan should review the existing form to ensure it meets the needs of the pivot (correct fields, validation, mobile UX) and adapt if necessary.

### Step 3: Contract Terms

Extracted from contract, all fields editable:

- Rent amount and currency (BRL)
- Contract start date
- Contract end date
- IPCA adjustment date(s) / adjustment frequency
- Charge-related info (expense types, provider names/CNPJs, amounts, responsibility) — used to pre-populate step 5 (expenses)

Rent is stored in a dedicated rent table (separate from charge definitions) because it is fundamentally different from expenses: defined by the contract, flows to the landlord, is the primary revenue metric, has IPCA adjustments, and payment detection works differently (incoming transfer to LL's bank).

**No-contract path:** Manual entry form for rent amount and optionally contract dates.

### Step 4: Tenants

Extracted from contract:

- Tenant name(s)
- Tenant CPF(s) (if present)
- Tenant email(s) (if present)

Tenants are **invited by default** but the landlord can toggle "don't invite yet" per tenant. This toggle suppresses the invitation email but still creates the tenant association on the property.

If tenant email is missing from extraction, the landlord enters it here (required for invitation).

**No-contract path:** This step is skipped entirely.

### Step 5: Expenses

Charges extracted from the contract are presented here. For each expense:

- Charge type (electricity, water, gas, internet, condo fee, etc.)
- Provider matching using **both** the property region (from step 2) and extracted provider info:
  - If CNPJ is extracted: match directly against seeded providers in the DB
  - If only provider name: fuzzy match against providers for the region
  - Present matches as suggestions: "Looks like Enliv provides electricity for this region. Is this right?"
  - If no match: "Don't see your provider? Let us know." (flags for engineering)
- Amount (if extracted)
- The landlord can add, remove, or edit any expense

**Responsibility is NOT assigned here.** When bills are ingested later, the platform determines responsibility automatically by matching the bill's addressee info (CPF, name, address) against known users on the property. This avoids unnecessary friction during creation. The UX should communicate this clearly — something like "We'll figure out who's responsible for each charge once bills start coming in" — so the landlord isn't left wondering why they weren't asked.

**No-contract path:** Optional — landlord can add expenses manually or skip entirely.

### Step 6: CPF Collection (conditional)

Only shown if the landlord's CPF is not already on their profile. CPF is required for:

- Automatic bill matching (bills addressed to the LL's CPF)
- DDA registration (future — condo fee auto-discovery)
- Open Finance bank connection

Collected inline during property creation rather than as a separate onboarding flow — least friction, collected when it's actually needed. This step is required — the user cannot proceed without entering their CPF. If CPF is already on file from a previous property setup, this step is skipped.

### Step 7: Bank Account Connection

**Strong nudge — this is critical infrastructure, not optional polish.**

Messaging should sell the value clearly:
- "Connect your bank account so rent payments are detected automatically."
- "Without this, you'll need to manually confirm every payment."
- Emphasize what they GET (automatic payment detection, zero effort each month) not what we're asking for.

**Trust and safety messaging:** The bank connection step must include clear, reassuring language about data usage. The user should feel 100% comfortable before connecting. Key points to communicate:
- We only read transactions — we cannot move, transfer, or withdraw money
- Your data is never sold to third parties
- We use bank data solely to detect payments on your property
- Connection is read-only and can be disconnected at any time
- Your banking credentials and financial data are stored securely by Pluggy (our Open Finance partner), not on Mabenn's servers
- Pluggy is regulated by the Central Bank of Brazil and compliant with Open Finance standards
- Links to Pluggy's security and privacy documentation so users can verify for themselves
- Link to Mabenn's privacy policy for full details

This isn't fine print — it should be prominent and part of the flow, not buried in a tooltip. The implementation plan should research and include the correct Pluggy documentation URLs (privacy policy, security practices, user rights, LGPD compliance).

**If already connected at user level:** "We see your [Bank Name] account — is this the right one for this property?" with option to confirm, pick a different connected account, or add a new one. **Planning note:** Verify with Pluggy's API whether we can retrieve connected account metadata (bank name, account details) to display here — this depends on what Pluggy exposes after the OAuth consent flow. Don't assume; confirm during planning.

**If not connected:** Pluggy OAuth flow to connect. Users can have multiple bank accounts — one per property or shared across properties.

**Skip is allowed** but should feel like they're missing out on the core value. Not blocking, but strongly discouraged.

**Dual-side payment detection:** The platform detects payments from both sides when both are connected — not just one as a fallback. This enables richer payment states:
- **Pending** — due, no activity detected
- **Sent** — detected leaving tenant's account, not yet confirmed received
- **Confirmed** — detected arriving in landlord's account (or matched on both sides)
- **Overdue** — past due, no activity detected

For instant methods (Pix), sent → confirmed happens near-simultaneously. For slower methods (TED, boleto), the "sent" state gives the landlord reassurance before the money lands. If only one side is connected, we detect from that side alone (sent or confirmed, depending on whose account we see).

### Step 8: Success

Summary of what was set up:
- Property address
- Rent amount and key dates
- Number of expenses configured
- Tenant(s) invited (or pending invitation)
- Bank account status

**CTAs:**
- "View property" → property details page
- "Go to dashboard" → home/dashboard

---

## Data Model

### Contract storage
- Contract PDF stored in Supabase Storage, linked to property
- Extracted contract data stored as a structured record (separate from the PDF)
- Extraction metadata: language detected, confidence, fields extracted vs manually entered
- If a contract is removed or replaced, the previous PDF is deleted from Supabase Storage and the previous extraction record is deleted from the database

### Rent (dedicated table)
- Linked to property and contract
- Amount, currency, due day of month
- IPCA adjustment date(s) / frequency
- Contract start and end dates
- Separate from charge definitions — rent is first-class

### Charge definitions (expenses)
- Linked to property
- Charge type, provider association (if matched), expected amount (if known)
- No responsibility assignment at creation — inferred from bills later via CPF/name/address matching on ingested bills

### Provider matching
- Providers are manually seeded in the DB for now
- Matched by region + CNPJ or region + name
- If no match is found, the charge is still created but with no provider associated
- A provider request is only created if the user explicitly taps "Don't see your provider? Let us know" — we don't auto-create requests from extraction data since it may be inaccurate
- Provider requests are stored in the existing provider request table with associated info

### Bank account connections
- Users can have multiple connections (via Pluggy) — bank accounts, debit cards, credit cards
- Connections are at the user level, optionally associated to specific properties
- A user can map specific connections to specific charges/properties (e.g., "rent comes from Itaú, electric bill from Nubank")
- Dual-side detection: platform reads from both landlord and tenant bank feeds when available
- Payment states: pending → sent (detected leaving tenant's account) → confirmed (detected arriving in landlord's account) → overdue (past due, no activity)

### CPF
- Stored on user profile
- Required — collected inline during property creation if missing (cannot proceed without it)
- Used for automatic bill responsibility matching (CPF on ingested bills matched against known users) and future DDA/Open Finance flows

### Wizard state persistence
- All wizard data persisted to local storage / IndexedDB via a reusable utility (not coupled to property creation)
- Stores form data, current step, and a pointer to the uploaded contract PDF (storage path/ID — not the file itself)
- Preserves user edits across back/forward navigation within the wizard
- Persists if the wizard is abandoned so the user can resume later
- Cleared on successful wizard completion or when a contract is removed/replaced (resets extraction-derived fields)

---

## Contract Extraction

### Input
- PDF file (uploaded by landlord)

### Output
Structured data covering: property address, rent amount/currency, contract start/end dates, IPCA adjustment dates, tenant names/CPFs/emails, expenses/providers/CNPJs.

### Language handling
- Supports EN, PT-BR, ES
- Extraction code uses a pluggable language adapter pattern — each language is a module that can be added independently
- Language is detected from the document, not configured by the user

### Partial extraction
- Any field can fail to extract — this is expected and handled gracefully
- Successfully extracted fields are pre-filled; failed fields are left empty for manual entry
- The UI clearly distinguishes "extracted" vs "manually entered" (subtle indicator, not intrusive)

### Provider matching from extraction
- If a CNPJ is found alongside a charge, match directly against the provider DB
- If only a provider name is found, combine with the property region to suggest matches
- Present suggestions to the landlord for confirmation — never auto-assign without review

---

## Error Handling Principles

- **Never a dead end.** Every error state has a clear message and at least one CTA (retry, skip, manual entry, go back).
- **Partial success is fine.** Extraction that gets 70% of fields is still valuable — show what worked, let the user fill the rest.
- **User-friendly language.** No technical jargon in error messages. "We couldn't read your contract" not "PDF extraction failed with error code 422."
- **Graceful degradation.** If extraction fails entirely, the manual path is always available. The product works without extraction — it's just more manual.

---

## Scope Boundaries

### In scope
- The wizard flow (steps 1-8)
- Contract PDF upload and storage
- Contract extraction (EN, PT-BR, ES)
- Structured data storage from extraction
- Rent as a separate data entity
- Charge definition creation from extraction
- Provider matching (region + CNPJ/name against seeded DB)
- CPF collection (inline, conditional)
- Bank account connection via Pluggy (nudge + OAuth flow)
- Tenant association and invitation (from extraction)
- No-contract manual path
- Error handling and partial extraction UX
- Reusable wizard state persistence utility
- Privacy policy (required dependency — must exist before bank connection flow can ship)

### Out of scope (future work)
- Settings: connected accounts management (view, add, remove bank accounts / debit cards / credit cards)
- Property details page (next brainstorming session)
- Landlord dashboard
- Tenant experience / tenant-side flows
- DDA registration for condo fees
- Automated bill ingestion (email forwarding, upload)
- Payment detection and matching
- Revenue tracking and reporting
- Eng playground for provider management
- Tenant/landlord reputation system
- IPCA adjustment calculation and reminders
- Communication hub
- AI knowledgebase

---

## Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Rent storage | Dedicated table, not a charge definition | Rent is first-class: contract-defined, flows to LL, has IPCA adjustments, different payment detection |
| Responsibility assignment | Inferred from bills, not declared at creation | Bills have addressee info (CPF, name). Asking "who pays this?" is unnecessary friction |
| CPF collection | Inline during property creation, not separate onboarding | Least friction — collected when actually needed |
| Bank account nudge | Strong nudge, not required (for LL) | The automation backbone depends on it, but blocking creation would kill conversion |
| No-contract path | Supported but secondary | Some landlords are pre-lease or don't have the PDF handy. Manual path keeps them on the platform |
| Extraction languages | Pluggable adapter pattern | Brazil-first but supports EN/ES. Adding languages shouldn't require restructuring extraction code |
| Provider matching | Region + CNPJ/name, suggestion-based | Never auto-assign — always present for LL confirmation. Unmatched providers flagged for engineering |

# Billing Intelligence Foundation — Plan 1a: Database & Types

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create database migrations and shared TypeScript types for the billing intelligence system.

**Architecture:** Extend existing `providers` and `provider_invoice_profiles` tables. Create `company_cache` and `engineer_allowlist` tables. Define the `ExtractionResult` contract and `Provider` interface that all subsequent plans depend on.

**Tech Stack:** Supabase (Postgres, RLS), TypeScript

**Part of:** Billing Intelligence Foundation (Plan 1)
**Depends on:** Phase 0 spike (complete)
**Blocks:** Plans 1b, 1c, 1d

---

## Existing DB Schema

We already have these tables (from `20260318120000_data_model_foundation.sql`):

**`providers`** — the company:
- `id` uuid PK
- `name` text
- `country_code` text (default 'BR')
- `tax_id` text (CNPJ)
- `phone`, `website`, `logo_url`
- `created_at`, `updated_at`

**`provider_invoice_profiles`** — a bill format for a provider:
- `id` uuid PK
- `provider_id` uuid FK → providers
- `name` text
- `parser_strategy` text
- `extraction_config` jsonb
- `validation_config` jsonb
- `version` integer
- `notes` text
- `is_active` boolean
- `created_at`, `updated_at`

**`example_documents`** — sample bills for a profile

## What We're Adding

**Extend `providers`:**
- No changes needed. The company table is fine as-is.

**Extend `provider_invoice_profiles`:**
- `category` — electricity, water, gas, internet, condo, etc.
- `region` — where this bill format is used (e.g., 'SC-florianopolis-campeche')
- `status` — draft, active, deprecated (replaces `is_active` boolean for richer lifecycle)
- `capabilities` — jsonb declaring what the code module can do

**New tables:**
- `company_cache` — cached CNPJ lookups from BrasilAPI/ReceitaWS
- `company_cache_history` — audit trail for company data changes
- `engineer_allowlist` — email allowlist for `/eng/` routes

## DB → Code Linking

The link between a database profile and its code module is the **profile UUID**:

```
DB: provider_invoice_profiles.id = 'uuid-for-enliv-campeche'
                    ↕
Code: registry.ts maps 'uuid-for-enliv-campeche' → enlivCampeche module
```

When a bill comes in:
1. Extract CNPJ from PDF text
2. Query DB: `provider_invoice_profiles JOIN providers WHERE providers.tax_id = {cnpj}` → returns candidate profiles
3. For each profile, check if registry has a code module registered
4. If multiple, run each module's `identify()` → pick highest confidence
5. If one, use it
6. If none have code modules → unknown profile, queue for engineering

A profile can exist in the DB (created via playground) before its code module is written. The code module is added when engineering builds the parser.

## Code Structure

```
src/lib/billing-intelligence/
  types.ts                              # ExtractionResult, shared types
  normalize.ts                          # date, month, barcode, money normalization
  
  identification/
    cnpj-extract.ts                     # extract CNPJs from text
    cnpj-lookup.ts                      # BrasilAPI + ReceitaWS + DB cache
    identify.ts                         # orchestration: PDF text → provider identification
    __tests__/
  
  extraction/
    pdf.ts                              # PDF buffer → raw text
  
  providers/
    types.ts                            # Provider interface
    registry.ts                         # profile UUID → code module mapping
    enliv-campeche/
      index.ts                          # exports Provider implementation
      parser.ts                         # bill text → ExtractionResult
      api-client.ts                     # Enliv API
      validate.ts                       # cross-validation
      __tests__/

src/lib/external/
  types.ts                              # ExternalCallResult, ExternalCallError types
  call.ts                               # externalCall(), externalFetch() wrappers
  __tests__/

src/lib/cnpj/validate.ts                # stays — generic CNPJ validation
src/lib/cpf/validate.ts                 # stays — generic CPF validation
```

---

## Task 1: Database migration — extend provider_invoice_profiles

**Files:**
- Create: `supabase/migrations/20260413120000_billing_intelligence_profiles.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260413120000_billing_intelligence_profiles.sql`:

```sql
-- =============================================================================
-- Billing Intelligence: extend provider_invoice_profiles
-- =============================================================================

create type provider_profile_status as enum ('draft', 'active', 'deprecated');
create type provider_category as enum (
  'electricity', 'water', 'gas', 'internet', 'condo',
  'sewer', 'insurance', 'other'
);

alter table provider_invoice_profiles
  add column category provider_category,
  add column region text,
  add column status provider_profile_status not null default 'draft',
  add column capabilities jsonb not null default '{}'::jsonb;

-- Backfill: set existing active profiles to 'active' status
update provider_invoice_profiles
  set status = 'active'
  where is_active = true;

update provider_invoice_profiles
  set status = 'deprecated'
  where is_active = false;

-- Add index for CNPJ-based lookups through the join
create index idx_providers_tax_id on providers(tax_id) where tax_id is not null;

-- Rename profiles.cpf to profiles.tax_id (country-agnostic)
-- and add index for bill-to-user matching
alter table profiles rename column cpf to tax_id;
comment on column profiles.tax_id is 'Personal or business tax ID (e.g., CPF/CNPJ in Brazil). Used to match bills to users.';
create unique index idx_profiles_tax_id on profiles(tax_id) where tax_id is not null;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413120000_billing_intelligence_profiles.sql
git commit -m "feat: extend provider_invoice_profiles with category, region, status, capabilities"
```

---

## Task 2: Database migration — company_cache and history

**Files:**
- Create: `supabase/migrations/20260413120100_company_cache.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260413120100_company_cache.sql`:

```sql
-- =============================================================================
-- Billing Intelligence: Company cache with audit history
-- Country-agnostic schema (tax_id = CNPJ in Brazil, RFC in Mexico, etc.)
-- =============================================================================

create table company_cache (
  id uuid primary key default gen_random_uuid(),
  tax_id text unique not null,             -- CNPJ in Brazil, RFC in Mexico, etc.
  country_code text not null default 'BR',
  legal_name text,                         -- razao_social in Brazil
  trade_name text,                         -- nome_fantasia in Brazil
  activity_code integer,                   -- CNAE in Brazil
  activity_description text,
  city text,
  state text,
  source text not null,                    -- 'brasilapi', 'receitaws', etc.
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_company_cache_tax_id on company_cache(tax_id);

create table company_cache_history (
  id uuid primary key default gen_random_uuid(),
  company_cache_id uuid not null references company_cache(id) on delete cascade,
  field_changed text not null,
  old_value text,
  new_value text,
  detected_at timestamptz not null default now()
);

create index idx_company_cache_history_cache_id on company_cache_history(company_cache_id);

-- Server-side only
alter table company_cache enable row level security;
alter table company_cache_history enable row level security;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413120100_company_cache.sql
git commit -m "feat: add company_cache and company_cache_history tables"
```

---

## Task 3: Database migration — external_call_log

**Files:**
- Create: `supabase/migrations/20260413120200_external_call_log.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260413120200_external_call_log.sql`:

```sql
-- =============================================================================
-- External dependency call log
-- Captures all external API calls (successes and failures) for monitoring.
-- The engineering playground surfaces this data for debugging and alerting.
-- =============================================================================

create table external_call_log (
  id uuid primary key default gen_random_uuid(),
  service text not null,                  -- 'brasilapi', 'receitaws', 'enliv-api', etc.
  operation text not null,                -- 'cnpj-lookup', 'fetch-debitos', etc.
  success boolean not null,
  duration_ms integer not null,
  error_category text,                    -- 'timeout', 'network', 'server_error', 'client_error', 'unexpected_shape', 'unknown'
  error_message text,
  status_code integer,
  created_at timestamptz not null default now()
);

create index idx_external_call_log_service on external_call_log(service, created_at);
create index idx_external_call_log_errors on external_call_log(success, created_at) where success = false;

-- Server-side only
alter table external_call_log enable row level security;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413120200_external_call_log.sql
git commit -m "feat: add external_call_log table for dependency monitoring"
```

---

## Task 4: Database migration — engineer_allowlist

**Files:**
- Create: `supabase/migrations/20260413120300_engineer_allowlist.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260413120300_engineer_allowlist.sql`:

```sql
-- =============================================================================
-- Engineer allowlist for /eng/ routes
-- Middleware checks this table (via service role) to gate access.
-- Engineers manage rows directly in the DB — no UI needed.
-- =============================================================================

create table engineer_allowlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,            -- denormalized for readability when inserting manually
  created_at timestamptz not null default now()
);

-- Server-side only (middleware uses service role to bypass RLS)
alter table engineer_allowlist enable row level security;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase migration up
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413120300_engineer_allowlist.sql
git commit -m "feat: add engineer_allowlist table"
```

---

## Task 5: Shared types for billing intelligence

**Files:**
- Create: `src/lib/billing-intelligence/types.ts`

- [ ] **Step 1: Create the shared types file**

Create `src/lib/billing-intelligence/types.ts`:

```typescript
/**
 * The standard output contract for bill data extraction.
 * All providers produce this shape. The orchestration layer
 * and database only work with this type.
 *
 * This is a CODE abstraction, not a DB model. It defines what
 * provider code modules return. DB types are generated by Supabase.
 */
export interface ExtractionResult {
  provider: {
    profileId: string         // provider_invoice_profiles.id (links to DB)
    companyName: string
    taxId: string             // company tax ID (e.g., CNPJ in Brazil, RFC in Mexico)
    category: ProviderCategory
  }
  customer: {
    /** Customer name as printed on the bill */
    name: string
    /** Customer tax ID as printed on the bill */
    taxId: string
    taxIdType: TaxIdType
    countryCode: string       // ISO 3166-1 alpha-2 (e.g., 'BR')
    /** Provider-specific account identifier (installation number, account number, etc.) */
    accountNumber: string
  }
  billing: {
    referenceMonth: string    // YYYY-MM (normalized)
    dueDate: string           // YYYY-MM-DD (normalized)
    amountDue: number         // integer minor units (centavos)
    currency: string          // 'BRL'
  }
  /** Usage/consumption data — optional, varies by provider type */
  consumption?: {
    value: number
    unit: string              // 'kWh', 'm³', 'GB', etc.
  }
  payment: {
    linhaDigitavel?: string
    pixPayload?: string
  }
  confidence: ExtractionConfidence
  rawSource: ExtractionSource
}

export type ExtractionSource = 'pdf' | 'api' | 'dda' | 'ocr' | 'web-scrape' | 'email'

/**
 * Per-field confidence with separate extraction and validation dimensions.
 *
 * Extraction confidence: "did we read the document correctly?"
 * Validation confidence: "does the extracted data match reality?"
 *
 * These are independent signals. A field can have high extraction confidence
 * (parser found it cleanly) but low validation confidence (API returned a
 * different value). Or high extraction + no validation (no second source).
 *
 * Status routing is threshold-based per field, not a single composite score.
 */
export type FieldStatus = 'confirmed' | 'high' | 'needs-review' | 'failed'

export interface FieldConfidence {
  /** 0-1: how sure are we the parser read this correctly? */
  extraction: number
  /** 0-1: how sure are we this matches reality? null if not validated */
  validation?: number
  /** Which source was used for validation */
  validationSource?: string   // 'api', 'web', 'barcode-math', etc.
  /** Routing status derived from extraction + validation */
  status: FieldStatus
}

export interface ExtractionConfidence {
  fields: Record<string, FieldConfidence>
  source: {
    method: ExtractionSource
    /** Base reliability score for this source method (e.g., api=0.95, pdf=0.8) */
    methodScore: number
  }
  summary: {
    totalFields: number
    confirmed: number
    high: number
    needsReview: number
    failed: number
    /** True if zero needs-review and zero failed — can be processed without human */
    autoAcceptable: boolean
  }
}

export type ProviderCategory =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'condo'
  | 'sewer'
  | 'insurance'
  | 'other'

export type ProviderProfileStatus = 'draft' | 'active' | 'deprecated'

/**
 * Tax ID types by country.
 * Brazil: 'cpf' (individuals), 'cnpj' (businesses)
 * Extensible for other countries.
 */
export type TaxIdType = 'cpf' | 'cnpj' | string

export interface ProviderCapabilities {
  extraction: boolean
  apiLookup: boolean
  validation: boolean
  paymentStatus: boolean
}

export interface ValidationResult {
  valid: boolean
  source: 'api' | 'web' | 'barcode'
  discrepancies: Array<{
    field: string
    extracted: string | number
    expected: string | number
  }>
}

export interface PaymentStatus {
  paid: boolean
  paidDate?: string           // YYYY-MM-DD
  paidAmount?: number         // integer minor units
  source: 'provider-api' | 'open-finance' | 'dda' | 'user-confirmed' | 'provider-web-scrape'
  /** User ID when source is 'user-confirmed' */
  confirmedBy?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing-intelligence/types.ts
git commit -m "feat: add shared types for billing intelligence system"
```

---

## Task 6: Provider interface

**Files:**
- Create: `src/lib/billing-intelligence/providers/types.ts`

- [ ] **Step 1: Create the provider interface**

Create `src/lib/billing-intelligence/providers/types.ts`:

```typescript
import type {
  ExtractionResult,
  ProviderCategory,
  ProviderProfileStatus,
  ProviderCapabilities,
  ValidationResult,
  PaymentStatus,
} from '../types'

/**
 * Interface that every provider code module implements.
 *
 * Each method returns data or null ("I can't do this").
 * The orchestration layer handles fallbacks.
 *
 * The profileId links this code module to its DB record
 * in provider_invoice_profiles.
 */
export interface Provider {
  /** The provider_invoice_profiles.id this code module implements */
  profileId: string

  /** Metadata (mirrors DB but available without a query) */
  meta: {
    companyName: string
    companyTaxId: string        // company tax ID (e.g., CNPJ in Brazil)
    countryCode: string         // ISO 3166-1 alpha-2 (e.g., 'BR')
    displayName: string
    category: ProviderCategory
    region: string
    status: ProviderProfileStatus
    capabilities: ProviderCapabilities
  }

  /**
   * Can this provider identify itself from the given PDF text?
   * Used when multiple profiles share the same company tax ID.
   * Returns a confidence score (0-1) or null if it can't determine.
   */
  identify(text: string): number | null

  /**
   * Extract structured data from bill text.
   */
  extractBill(text: string): ExtractionResult | null

  /**
   * Look up open bills for a customer.
   * Only available if capabilities.apiLookup is true.
   */
  lookupBills?(document: string): Promise<ExtractionResult[] | null>

  /**
   * Check payment status for a customer's bills.
   * Only available if capabilities.paymentStatus is true.
   */
  checkPaymentStatus?(document: string): Promise<PaymentStatus[] | null>

  /**
   * Validate an extraction against an external source.
   * Only available if capabilities.validation is true.
   */
  validateExtraction?(extraction: ExtractionResult): Promise<ValidationResult | null>
}
```

- [ ] **Step 2: Create provider directory README**

Create `src/lib/billing-intelligence/providers/README.md`:

```markdown
# Provider Modules

Each provider represents **one bill format** — not one company. If a company
issues different bill formats in different regions, each format is a separate
provider module (e.g., `enliv-campeche/` and `enliv-centro/`).

## Directory Structure

Each provider lives in its own directory. The structure is semi-standard:

### Required files

- `index.ts` — Exports a `Provider` implementation. This is the entry point
  the registry imports. Contains `profileId` (links to the DB record in
  `provider_invoice_profiles`), metadata, and wires up all the methods.

- `parser.ts` — Takes raw text (from PDF or OCR) and returns an
  `ExtractionResult` or `null`. This is the core extraction logic — regex
  patterns specific to this bill format. Uses shared utilities from
  `../normalize.ts` for dates, money, and barcodes. Uses
  `../confidence.ts` for uniform confidence scoring.

### Optional files (add only if the provider supports the capability)

- `api-client.ts` — If the provider has a public API for looking up bills
  or checking payment status. Not all providers have this.

- `validate.ts` — Cross-validation logic. Compares extraction results
  against another source (API, web portal, barcode math) to verify accuracy.

- `scraper.ts` — If the provider has a web portal that can be scraped
  for bill data or validation. Use as a validation source, not a primary
  extraction method.

### Tests

Every file in the provider directory must have a corresponding test file.
If an optional file is present, its test is required.

- `__tests__/parser.test.ts` — **Required.** Tests the parser against known
  bill text with expected field values.

- `__tests__/api-client.test.ts` — **Required if `api-client.ts` exists.**
  Mock the API responses, test error handling.

- `__tests__/validate.test.ts` — **Required if `validate.ts` exists.**
  Test cross-validation logic with mocked external sources.

- `__tests__/scraper.test.ts` — **Required if `scraper.ts` exists.**
  Test scraping logic with mocked responses.

## Example

```
enliv-campeche/
  index.ts              # Provider implementation (required)
  parser.ts             # Bill text → ExtractionResult (required)
  api-client.ts         # Provider API (optional — present, so tests required)
  validate.ts           # Cross-validation (optional — present, so tests required)
  __tests__/
    parser.test.ts      # Required
    api-client.test.ts  # Required because api-client.ts exists
    validate.test.ts    # Required because validate.ts exists
```

## Adding a New Provider

1. Create a new directory under `providers/`
2. Implement `parser.ts` — start with a sample bill's raw text
3. Implement `index.ts` — export a `Provider` with the `profileId` matching
   the `provider_invoice_profiles.id` from the database
4. Add optional files if the provider supports API lookup, validation, etc.
5. Register in `registry.ts` — import and add to the providers array
6. The DB profile must exist (created via the playground) before the code
   module can be linked. The `profileId` is the bridge.

## What goes in the provider vs. shared utilities

- **Provider-specific:** regex patterns, API endpoints, field mapping,
  identification logic (how to tell this bill apart from others with the
  same company tax ID)
- **Shared:** date normalization, money parsing, barcode normalization,
  confidence scoring, tax ID extraction/validation, PDF-to-text conversion

## Mandatory: external dependency monitoring

All external API calls in providers (api-client.ts, scraper.ts, validate.ts)
**must** use `externalFetch` from `@/lib/external/call` — never raw `fetch()`.
This ensures every external call is monitored, timed, error-normalized, and
logged to the `external_call_log` table. The engineering playground surfaces
this data for debugging and alerting on external dependency issues.
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing-intelligence/providers/types.ts src/lib/billing-intelligence/providers/README.md
git commit -m "feat: add Provider interface and provider directory documentation"
```

---


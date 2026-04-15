# Billing Intelligence Architecture

**Date:** 2026-04-13
**Status:** Design — partially implemented (Phase 0 spike in progress)

---

## Overview

The billing intelligence system is the core competency of Mabenn. It handles bill identification, data extraction, validation, payment detection, and payment matching. This document defines the architecture for the system and the engineering apparatus used to build, test, and maintain it.

---

## Core Competencies

1. **Bill identification** — Given a bill PDF, identify which provider issued it via CNPJ extraction and lookup.
2. **Bill data extraction** — Given a bill from a known provider, extract structured fields (amount, due date, reference month, customer info, account number, barcode).
3. **Bill data validation** — Cross-check extracted data against another source (provider API, website, barcode math).
4. **Bill discovery** — Proactively find bills for a CPF/CNPJ via provider APIs, DDA, or other sources. Must not miss information.
5. **Payment detection** — Determine whether a specific bill has been paid via provider API, Open Finance transactions, DDA status, or user confirmation.
6. **Payment matching** — Given a bank transaction, match it to a known bill/charge instance using CNPJ + amount + date window + transaction type.

### Accuracy requirements

Near 100% accuracy on all competencies. Tracked at three levels:

```
Overall system accuracy
  └─ Per competency (identification, extraction, validation, detection, matching)
      └─ Per provider (Enliv Campeche, Condo Sunclub, etc.)
          └─ Per field (amount, due date, barcode, etc. — for extraction)
```

---

## Provider Model

### What is a provider?

A provider represents **one bill format from one company in one region**. It is NOT the same as the company. If a company issues different bill formats in different areas, each format is a separate provider.

Examples:
- `enliv-campeche` — Enliv electricity bills for the Campeche area of Florianopolis
- `enliv-centro` — Same company, different bill format for Centro area (hypothetical)
- `condo-sunclub` — Residencial Multifamiliar Sunclub condo fee boleto

Two providers can share the same company CNPJ but have different parsers.

### Provider metadata (stored in DB)

```
providers
  id                  text primary key    -- 'enliv-campeche'
  company_cnpj        text not null       -- '49449868000162'
  company_name        text not null       -- 'Enliv'
  display_name        text not null       -- 'Enliv (Campeche)'
  category            text not null       -- 'electricity', 'water', 'gas', 'internet', 'condo'
  region              text not null       -- 'SC-florianopolis-campeche'
  status              text not null       -- 'draft', 'active', 'deprecated'
  capabilities        jsonb not null      -- { extraction: true, apiLookup: true, ... }
  created_at          timestamptz
  updated_at          timestamptz
```

### Provider code (in repo)

```
src/lib/billing-intelligence/providers/
  enliv-campeche/
    index.ts              # metadata + capability exports
    parser.ts             # bill text → structured fields (required)
    api-client.ts         # provider API (optional)
    validate.ts           # cross-validation (optional)
    scraper.ts            # web scraping (optional)
  condo-sunclub/
    index.ts
    parser.ts
```

### Provider registry

Maps CNPJ → provider code. When a bill comes in:

1. Extract CNPJ from PDF text (generic, not provider-specific)
2. Look up CNPJ in registry → returns matching provider(s)
3. If one match → run that provider's parser
4. If multiple matches (same CNPJ, different regions) → try each parser, pick highest confidence
5. If no match → unknown provider, queue for engineering

```typescript
// registry.ts
const providers = [enlivCampeche, condoSunclub, ...]

function getProvidersByCnpj(cnpj: string): Provider[]
function getProviderById(id: string): Provider | undefined
```

---

## Company Cache (CNPJ Lookup)

External CNPJ data is cached locally to reduce API calls and provide audit history.

### Database

```
company_cache
  id                  uuid primary key
  cnpj                text unique not null
  razao_social        text
  nome_fantasia       text
  cnae_fiscal         integer
  cnae_fiscal_descricao text
  municipio           text
  uf                  text
  source              text               -- 'brasilapi', 'receitaws'
  fetched_at          timestamptz
  created_at          timestamptz

company_cache_history
  id                  uuid primary key
  company_cache_id    uuid references company_cache(id)
  field_changed       text
  old_value           text
  new_value           text
  detected_at         timestamptz
```

### Refresh policy

- Serve from cache if exists
- Re-fetch from public API if `fetched_at` is older than 30 days
- If re-fetch returns different data, update cache + insert history row + alert engineering
- Primary: BrasilAPI (`brasilapi.com.br/api/cnpj/v1/{cnpj}`)
- Fallback: ReceitaWS (`receitaws.com.br/v1/cnpj/{cnpj}`, 3 req/min free tier)

---

## Provider Request Flow (User → Engineering)

When a user uploads a bill for an unsupported provider:

```
User uploads bill during expense charge setup
  → provider_requests record created (status: pending)
  → Bill stored in Supabase Storage
  → Visible in engineering playground
  → Engineering (human + Claude) picks it up
  → Provider created (status: draft)
  → Parser built, test cases created
  → Accuracy threshold met → provider status: active
  → provider_requests status: complete
  → User notified (email + in-app) via notification system
```

### Database

```
provider_requests
  id                  uuid primary key
  status              text not null       -- pending, in_progress, testing, complete, failed
  source              text not null       -- 'expense_charge_setup', 'engineer', etc.
  requested_by        uuid not null references auth.users(id)
  property_id         uuid                -- optional, null if not tied to a property
  test_bill_id        uuid not null references provider_test_bills(id)
  provider_id         text                -- null until provider created, then linked
  notes               text                -- engineering notes
  created_at          timestamptz
  updated_at          timestamptz
```

The `requested_by` role (user vs engineer) is derived from the engineer allowlist table — not stored on the request.

---

## Bill Processing Pipeline

### Reactive (user uploads a bill)

```
PDF uploaded
  → pdf.ts: PDF buffer → raw text
  → identification: extract CNPJs → lookup in registry
  → If known provider: parser extracts structured fields
  → If validation available: cross-check against API/web
  → Store extraction result with confidence score
  → If confidence < threshold: flag for human review
```

### Proactive (system discovers bills)

```
Scheduled / webhook-triggered
  → Provider API poll (Enliv: fetch open debts by CPF)
  → DDA webhooks (Celcoin: new boleto for registered CPF)
  → Open Finance transaction scan (Pluggy: new CONVENIO_ARRECADACAO or BOLETO transactions)
  → Match discovered data to existing charge instances
  → Create or update charge instances as needed
  → Notify LL/tenant of new bills or payments
```

---

## Extraction Output Contract

All providers produce the same base output shape. Provider-specific fields are allowed but the orchestration layer only uses the base fields.

```typescript
interface ExtractionResult {
  provider: {
    id: string
    companyName: string
    cnpj: string
    category: string
  }
  customer: {
    name: string
    document: string          // CPF or CNPJ
    documentType: 'cpf' | 'cnpj'
    accountNumber: string     // installation number, account number, etc.
  }
  billing: {
    referenceMonth: string    // YYYY-MM (normalized)
    dueDate: string           // YYYY-MM-DD (normalized)
    amountDue: number         // integer minor units (centavos)
    currency: string          // 'BRL'
  }
  payment: {
    linhaDigitavel?: string   // boleto barcode digits
    pixPayload?: string       // PIX QR code data
  }
  confidence: ExtractionConfidence
  rawSource: 'pdf' | 'api' | 'dda' | 'ocr'
}

interface ExtractionConfidence {
  overall: number                       // 0-1
  fields: Record<string, number>        // per-field confidence
  factors: {
    sourceMethod: number                // api=0.95, pdf=0.75, ocr=0.5
    validationBonus: number             // +0.15 if cross-validated
    fieldCompleteness: number           // +0.05 if all expected fields found
    mathConsistency: number             // +0.05 if values are internally consistent
  }
}
```

### Date normalization

All dates stored in ISO 8601:
- Full date: `YYYY-MM-DD` (e.g., `2026-04-24`)
- Month: `YYYY-MM` (e.g., `2026-03`)

Parsers convert from provider-specific formats (Brazilian `DD/MM/YYYY`, ISO with time `2026-04-24T19:33:21.923Z`, etc.) to these normalized forms.

### Money

Stored as integer minor units (centavos) + currency code, consistent with the existing money model in the app.

---

## Code Structure

```
src/lib/billing-intelligence/
  types.ts                              # shared types (ExtractionResult, Provider, etc.)
  
  identification/
    cnpj-extract.ts                     # extract CNPJs from text (regex + validation)
    cnpj-lookup.ts                      # BrasilAPI + ReceitaWS with DB cache
    identify.ts                         # orchestration: PDF text → provider identification
  
  extraction/
    pdf.ts                              # PDF buffer → raw text (pdf-parse wrapper)
    extract.ts                          # orchestration: PDF + provider → ExtractionResult
  
  validation/
    validate.ts                         # orchestration: ExtractionResult → ValidationResult
  
  payment/
    detect.ts                           # check if a bill was paid (provider API, Open Finance, DDA)
    match.ts                            # match bank transactions to bills
  
  providers/
    registry.ts                         # CNPJ → provider lookup, provider registration
    enliv-campeche/
      index.ts                          # provider metadata + exports
      parser.ts                         # text → ExtractionResult
      api-client.ts                     # Enliv API (optional)
      validate.ts                       # cross-validation (optional)
    condo-sunclub/
      index.ts
      parser.ts
  
  test-runner/
    types.ts                            # TestCase, AccuracyReport types
    runner.ts                           # execute test cases, compute accuracy
    reporter.ts                         # format accuracy output
  
  pluggy/
    client.ts                           # Pluggy SDK wrapper
    transactions.ts                     # fetch + filter transactions
  
  dda/
    client.ts                           # Celcoin DDA client (future)
    webhooks.ts                         # handle DDA webhook events (future)
```

---

## Engineering Apparatus

### Purpose

A UI-driven tool where humans and Claude Code collaborate to build, test, and maintain providers. The human uploads bills and validates results. Claude writes parsers and generates test cases. Accuracy is measured and tracked.

### Architecture

Three consumers of the same underlying service layer:

```
src/lib/billing-intelligence/    ← shared service layer
  ├── Custom MCP                 ← Claude Code interface
  ├── CI (scripts/)              ← automated accuracy checks
  └── UI (/eng/playground)       ← human interface
```

### Custom MCP operations

```
identifyBill({ billFileId })              → provider identification
extractBill({ billFileId, providerId })   → extraction result
validateExtraction({ extractionId })      → validation result
lookupCnpj({ cnpj })                     → company info
createProvider({ metadata })              → draft provider in DB
saveTestCase({ providerId, billFileId, expectedFields })
runTestSuite({ providerId? })             → accuracy report
getAccuracyStats({ providerId? })         → current accuracy
getPendingBills()                         → bills uploaded without a provider
getProviderRequests({ status? })          → user requests for new providers
getProductionCorrections({ providerId? }) → user corrections
```

No auth needed — uses same Supabase credentials as the app via env vars.

### Test cases

Stored per provider. Each test case is a real bill with human-verified expected values.

```
provider_test_bills
  id                  uuid primary key
  profile_id          uuid references provider_invoice_profiles(id)  -- null before profile exists
  storage_path        text not null
  file_name           text not null
  mime_type           text not null
  file_size_bytes     integer
  uploaded_by         uuid references auth.users(id)  -- null for service role uploads
  source              text not null         -- 'provider_request', 'playground', 'production_correction'
  created_at          timestamptz

extraction_test_cases
  id                  uuid primary key
  profile_id          uuid references provider_invoice_profiles(id)
  test_bill_id        uuid not null references provider_test_bills(id)
  description         text                  -- 'March 2026 bill', 'Bill with overdue penalty'
  expected_fields     jsonb not null         -- human-verified expected extraction values
  competencies_tested text[] not null        -- ['identification', 'extraction', 'validation']
  created_by          text                  -- 'engineer', 'production_correction'
  created_at          timestamptz

test_runs
  id                  uuid primary key
  provider_id         text                  -- null for full suite run
  total_fields        integer
  passed_fields       integer
  accuracy            numeric(5,4)          -- 0.9850
  report              jsonb                 -- detailed per-field results
  triggered_by        text                  -- 'ci', 'playground', 'mcp'
  created_at          timestamptz
```

### Test case creation flow (human + Claude)

1. Human uploads a bill PDF through the playground UI
2. Claude (via MCP) calls `identifyBill` → proposes provider
3. Human confirms or corrects provider metadata in UI
4. Claude calls `extractBill` → returns extracted fields
5. UI shows extracted fields to human for review
6. Human validates each field, corrects if needed, confirms
7. Confirmed fields become `expected_fields` in a new test case
8. Claude proposes edge cases to test → human uploads more bills → repeat

### Test runner

Iterates through all test cases for a provider (or all providers):

1. Load test case: bill PDF + expected fields
2. Run identification → did we identify the correct provider?
3. Run extraction → does each field match expected?
4. Run validation (if available) → does cross-check confirm?
5. Score per-field, per-competency, per-provider
6. Store results in `test_runs`

Runnable from:
- CI: `node scripts/run-accuracy-suite.js` → fails build if accuracy drops below threshold
- Playground UI: click "Run tests" for a provider
- MCP: `runTestSuite({ providerId })`

### Production corrections feedback loop

When a user corrects an extracted value in the app:

```
user_corrections
  id                  uuid primary key
  extraction_id       uuid
  provider_id         text
  field               text                  -- 'amountDue', 'dueDate', etc.
  extracted_value     text
  corrected_value     text
  corrected_by        uuid references auth.users(id)
  test_bill_id        uuid references provider_test_bills(id)
  created_at          timestamptz
```

Corrections are visible in the playground. An engineer reviews them and decides whether to create new test cases from them. The correction + original bill = a test case where the corrected value is the expected value. This is the feedback loop that improves accuracy over time.

### Accuracy monitoring

| Location | What it tracks | Purpose |
|---|---|---|
| Test runner (CI) | Per-provider, per-competency, per-field accuracy | Regression prevention |
| Playground UI | Live accuracy from last test run | Quick reference while working |
| Production DB | Confidence scores, validation results, corrections | Real-world accuracy |
| Production alerts | Accuracy drops below threshold | Engineering notification |

---

## Playground UI

Route: `/eng/playground`

Auth: Supabase auth + engineer allowlist table. Middleware checks allowlist only for `/eng/` routes. Zero impact on regular users.

### Sections

1. **Provider lab** — upload bill, identify provider, run extraction, validate, save test cases
2. **Provider registry** — list all providers with capabilities and accuracy stats
3. **Bill lookup** — direct API testing for providers with lookup APIs
4. **Transaction lab** — connect bank accounts via Pluggy, browse transactions, test payment matching
5. **DDA lab** — register CPF for DDA, view incoming boletos (when Celcoin access available)
6. **Accuracy dashboard** — per-provider, per-competency accuracy from latest test runs
7. **Production corrections** — review user corrections, create test cases from them
8. **Provider requests** — pending user requests for new providers

---

## What Exists Today (Phase 0)

From the infrastructure spike:

- CNPJ extraction + validation (`src/lib/cnpj/`)
- CPF validation (`src/lib/cpf/`)
- CNPJ lookup with BrasilAPI + ReceitaWS fallback (`src/lib/cnpj/lookup.ts`)
- Enliv API client (`src/lib/providers/enliv/api-client.ts`)
- Enliv PDF parser (`src/lib/providers/enliv/pdf-parser.ts`)
- Enliv cross-validation (`src/lib/providers/enliv/compare.ts`)
- Pluggy client + connect token route (`src/lib/pluggy/`, `src/app/api/pluggy/`)
- Dev page with test panels (`src/app/app/(main)/dev/phase0/`)

### Migration path

The Phase 0 code will be refactored into the `src/lib/billing-intelligence/` structure. The dev page at `/dev/phase0/` will evolve into the playground at `/eng/playground/`.

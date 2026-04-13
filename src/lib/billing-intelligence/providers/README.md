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

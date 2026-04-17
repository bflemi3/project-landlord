# Contract Extraction Engine — Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build a standalone, thoroughly tested contract extraction module that accepts rental contracts (PDF or DOCX) and returns structured data using LLM-based extraction via the Vercel AI SDK.

**Deliverable:** A working extraction module at `src/lib/contract-extraction/` with tests passing against real and synthetic contracts in EN, PT-BR, and ES, in both PDF and DOCX formats. No UI — pure logic.

**Spec:** `docs/superpowers/specs/2026-04-16-property-creation-design.md` (Contract Extraction section)

**Code review policy:** After completing each task, dispatch `superpowers:code-reviewer` to review the task's changes before moving to the next task. The final task (Task 8) includes a comprehensive code review of the entire plan's implementation against the spec.

**Depends on:** Nothing — this is the first plan in the property creation sequence.

**Blocks:** Plan 2 (Wizard framework + Step 1 UI)

---

## Codebase Context

**Existing extraction patterns:**
- Bill text extraction lives in `src/lib/billing-intelligence/extraction/pdf.ts` — uses `unpdf` to extract raw text from PDF buffers. Follow this pattern for PDF text extraction.
- Bill-specific parsers live in `src/lib/billing-intelligence/providers/` — each provider has a `parser.ts` that takes raw text and returns a `BillExtractionResult`. Our contract extraction is analogous but uses LLM instead of regex.
- `BillExtractionResult` in `src/lib/billing-intelligence/types.ts` is bill-specific (provider, customer, billing, consumption, payment fields). Rename is complete (Task 1). A new `ContractExtractionResult` type will be defined for contracts in Task 2.

**Data layer patterns:**
- Types/interfaces colocated with the module that owns them
- Tests in `__tests__/` directories colocated with the module
- Unit tests: `.test.ts`, integration tests: `.integration.test.ts`

**Dependencies to add:**
- `mammoth` — DOCX-to-text extraction (lightweight, well-maintained, already used successfully to read the sample contract during planning)
- `franc` — trigram-based language detection (~200KB, lightweight)
- `ai` + `@ai-sdk/anthropic` — Vercel AI SDK for LLM calls with structured output via `generateObject` + Zod schemas

**No AI SDK or Anthropic SDK currently installed.** This is greenfield for LLM integration.

**Test fixtures:**
- Real PT-BR DOCX contract at `/Users/brandonfleming/Downloads/260218 - Contrato de locação Sun Club (1).docx` — copy into test fixtures
- Synthetic contracts need to be created for EN, ES, and additional PT-BR variants, in both PDF and DOCX formats

**Cost reference:** `docs/project/llm-extraction-costs.md`

---

## File Structure

```
src/lib/contract-extraction/
├── types.ts                          — ContractExtractionResult, ContractExtractionInput, language types
├── extract-text.ts                   — PDF and DOCX raw text extraction (format detection + extraction)
├── extract-contract.ts               — Main entry point: takes file buffer → returns ContractExtractionResult
├── prompts/
│   ├── system.ts                     — Shared system prompt (extraction instructions, output schema guidance)
│   ├── pt-br.ts                      — PT-BR language-specific prompt
│   ├── en.ts                         — EN language-specific prompt
│   └── es.ts                         — ES language-specific prompt
├── language-detection.ts             — Detect contract language from extracted text
├── schema.ts                         — Zod schema for ContractExtractionResult (used by generateObject)
├── __tests__/
│   ├── extract-text.test.ts          — Text extraction unit tests (PDF + DOCX)
│   ├── extract-contract.test.ts      — Pipeline unit tests (mocked LLM)
│   ├── extract-contract.integration.test.ts — Full extraction tests (real LLM calls)
│   ├── language-detection.test.ts    — Language detection unit tests
│   ├── schema.test.ts                — Zod schema validation tests
│   └── fixtures/
│       ├── pt-br-real.docx                — Real contract (Brandon/Alex)
│       ├── pt-br-synthetic-1.pdf          — Synthetic PT-BR contract (variation 1)
│       ├── pt-br-synthetic-2.pdf          — Synthetic PT-BR contract (variation 2)
│       ├── pt-br-synthetic-1.docx         — Synthetic PT-BR DOCX (variation 1)
│       ├── pt-br-synthetic-2.docx         — Synthetic PT-BR DOCX (variation 2)
│       ├── en-synthetic-1.pdf             — Synthetic EN contract (variation 1)
│       ├── en-synthetic-2.pdf             — Synthetic EN contract (variation 2)
│       ├── en-synthetic-1.docx            — Synthetic EN DOCX (variation 1)
│       ├── en-synthetic-2.docx            — Synthetic EN DOCX (variation 2)
│       ├── es-synthetic-1.pdf             — Synthetic ES contract (variation 1)
│       ├── es-synthetic-2.pdf             — Synthetic ES contract (variation 2)
│       ├── es-synthetic-1.docx            — Synthetic ES DOCX (variation 1)
│       ├── es-synthetic-2.docx            — Synthetic ES DOCX (variation 2)
│       └── expected/
│           ├── pt-br-real.expected.json
│           ├── pt-br-synthetic-1.expected.json
│           ├── pt-br-synthetic-2.expected.json
│           ├── en-synthetic-1.expected.json
│           ├── en-synthetic-2.expected.json
│           ├── es-synthetic-1.expected.json
│           └── es-synthetic-2.expected.json

src/lib/billing-intelligence/
├── types.ts                          — Rename BillExtractionResult → BillExtractionResult (+ update all imports)
```

---

## Tasks

### Task 1: Rename ExtractionResult → BillExtractionResult ✅ DONE

**What:** Renamed `ExtractionResult` to `BillExtractionResult` in `src/lib/billing-intelligence/types.ts` and updated all files that import it. Also renamed `ExtractionConfidence` → `BillExtractionConfidence`, `ExtractionSource` → `BillExtractionSource`, and `buildExtractionConfidence` → `buildBillExtractionConfidence`. This clarifies the distinction between bill extraction and the new contract extraction.

**Where:** `src/lib/billing-intelligence/types.ts` and all files found by grepping for `BillExtractionResult` — including providers, test-runner, tests, and docs.

**How to verify:** Run the type checker and test suite. All existing tests pass, no type errors. Grep for the old name `BillExtractionResult` (excluding the new `BillExtractionResult` and `ContractExtractionResult`) returns zero results in source files. Then dispatch `superpowers:code-reviewer` to review the rename changes.

**Check:** `testing` skill (test patterns)

---

### Task 2: Define ContractExtractionResult types + Zod schema

**What:** Define the output types and Zod schema for contract extraction. The schema is used by the Vercel AI SDK's `generateObject` to guarantee structured output from the LLM.

**Where:** Create `src/lib/contract-extraction/types.ts` and `src/lib/contract-extraction/schema.ts`

**Types to define (in `types.ts`):**
- `ContractExtractionResult` — the structured output: `isRentalContract` (boolean — LLM classifies whether the document is a rental contract; if false, the extraction engine returns `not_a_contract` error code instead of the result), property address (street, number, complement, neighborhood, city, state, postal code), rent (amount as integer minor units, currency, due day of month, includes — optional array of what the stated amount covers e.g. ["rent", "condo", "IPTU"] when the contract bundles charges into one amount), contract dates (start, end), IPCA adjustment info (date/frequency), landlords (array of name, CPF, email — all optional per field), tenants (array of name, CPF, email — all optional per field), expenses (array of type/category, provider name, provider CNPJ — all optional per field), language detected, raw extracted text (the full text extracted from the document — stored for future features like "chat with your contract", re-extraction with improved prompts, and full-text search)
- `ContractExtractionInput` — file buffer + file type (pdf/docx)
- `SupportedLanguage` — 'pt-br' | 'en' | 'es'
- `ContractExtractionErrorCode` — string literal union type of all possible error codes: `file_too_large`, `unsupported_format`, `corrupt_file`, `empty_file`, `scanned_document`, `empty_content`, `password_protected`, `unsupported_language`, `not_a_contract`, `extraction_failed`, `extraction_timeout`, `rate_limited`, `api_key_missing`. Strongly typed — no arbitrary strings. Both backend and frontend use this type.
  - `unsupported_language` — franc detects a language that doesn't map to our supported languages (pt-br, en, es). Returned before the LLM call so we don't waste tokens on a contract we can't properly extract. The UI can show "We don't support contracts in this language yet" with supported languages listed.
  - `not_a_contract` — the LLM returns `isRentalContract: false` in its response, indicating the document is not a rental contract. The extraction engine checks this field before returning the result. The UI can show "This doesn't appear to be a rental contract" with a CTA to try another file or switch to manual entry.
- `ContractExtractionError` — `{ code: ContractExtractionErrorCode }`. The code is the only field used for control flow and UI rendering. No user-facing strings anywhere in the error. The UI layer maps codes to i18n keys (e.g., `contractExtraction.errors.scanned_document`) and attaches appropriate CTAs. If internal debugging context is needed, log it server-side — do not include it in the error response.
- `ContractExtractionResponse` — discriminated union: `{ success: true, data: ContractExtractionResult }` or `{ success: false, error: ContractExtractionError }`. This is the return type of `extractContract()`.

**Zod schema (in `schema.ts`):** Mirror `ContractExtractionResult` as a Zod schema. All fields that might not be extractable should be optional/nullable in the schema. This is what `generateObject` validates against.

**TDD:** Write tests first in `__tests__/schema.test.ts` — verify the Zod schema accepts valid extraction results, rejects malformed data, handles partial extraction (many fields null/undefined), and correctly types money as integer minor units.

**How to verify:** Run the type checker and schema tests. Then dispatch `superpowers:code-reviewer` to review the types and schema.

**Check:** `data-modeling` skill (money as minor units)

---

### Task 3: Build text extraction for PDF + DOCX

**What:** Create a unified text extraction function that accepts a file buffer, detects the format (PDF or DOCX), and returns raw text. PDF extraction reuses the existing `unpdf` pattern. DOCX extraction uses `mammoth`.

**Where:** Create `src/lib/contract-extraction/extract-text.ts`. Install `mammoth` as a dependency.

**TDD:** Write tests first in `__tests__/extract-text.test.ts`:

Happy path:
- PDF buffer → returns extracted text string
- DOCX buffer → returns extracted text string
- Multi-page PDF → text from all pages concatenated (not just first page)
- DOCX with tables/headers → text extracted from tables and headers, not just body paragraphs (contracts often have tabular data in the Quadro Resumo)
- Unicode/accents preserved → PT-BR characters (ç, ã, ô, é), ES characters (ñ, ú) survive extraction intact

Error handling (extractText throws typed errors that extractContract in Task 7 maps to `ContractExtractionErrorCode`):
- Zero-byte buffer (empty ArrayBuffer) → error (maps to `empty_file`)
- Corrupt/malformed file (valid magic bytes but broken content) → error (maps to `corrupt_file`)
- Unknown format (e.g., PNG, plain text, random bytes) → error (maps to `unsupported_format`)
- Password-protected PDF → error (maps to `password_protected`)
- Password-protected DOCX → error (maps to `password_protected`)
- Null/undefined buffer → error (maps to `empty_file`)
- File exceeding size limit → error (maps to `file_too_large`, max 10MB)

Edge cases:
- PDF with no extractable text (scanned image, no text layer) → returns a structured error that the extraction engine maps to `scanned_document` error code. OCR support will be added later — the text extraction layer is the right place to plug it in without changing the rest of the pipeline.
- DOCX with no text content (valid structure, empty body) → returns empty string

Use the real PT-BR DOCX contract as a test fixture (copy from Downloads into `__tests__/fixtures/pt-br-real.docx`). For PDF, create a simple synthetic PDF fixture or convert the DOCX.

**Implementation notes:**
- Detect format from file magic bytes (PDF starts with `%PDF`, DOCX is a ZIP starting with `PK`), not file extension — the caller may not provide an extension
- For PDF: follow the pattern in `src/lib/billing-intelligence/extraction/pdf.ts` (uses `unpdf`)
- For DOCX: use `mammoth` with `extractRawText` (not HTML conversion — we need plain text for the LLM)

**How to verify:** Run the text extraction tests. Both formats produce readable text from the fixtures. Then dispatch `superpowers:code-reviewer` to review the extraction code and tests.

**Check:** `testing` skill

---

### Task 4: Build language detection

**What:** Detect the language of a contract from its extracted text. Returns a `SupportedLanguage` value. This determines which language-specific prompt to use for LLM extraction.

**Where:** Create `src/lib/contract-extraction/language-detection.ts`. Install `franc` (lightweight trigram-based language detection, ~200KB).

**TDD:** Write tests first in `__tests__/language-detection.test.ts`:

Happy path:
- PT-BR contract text → returns 'pt-br'
- EN contract text → returns 'en'
- ES contract text → returns 'es'
- Real contract text (use extracted text from the PT-BR fixture) → returns 'pt-br'

Ambiguity and overlap:
- PT-PT text (European Portuguese) → returns 'pt-br' (mapped — only supported Portuguese variant)
- English contract containing Brazilian names and addresses (PT-BR characters in proper nouns, but legal text in English) → returns 'en'
- Bilingual contract (clauses in two languages) → returns the dominant language
- Unsupported language (e.g., French, German) → returns `null` (not a default) so the extraction engine can return `unsupported_language` error code

Edge cases:
- Empty string → returns `null` gracefully, not crash
- Very short text (a few words, insufficient signal for franc) → returns `null` gracefully (insufficient confidence to determine language)
- Text that's mostly numbers/dates with very few words → returns `null` if insufficient keywords found
- Null/undefined input → returns `null` gracefully

**Test inputs:** Use inline text snippets hardcoded in the test file — representative paragraphs of legal text in each language, not full contract documents. This tests language detection in isolation as a pure function (string → language code). Full pipeline testing with real contract fixtures happens in Task 7's integration tests.

**Implementation notes:** Use `franc` for trigram-based language detection — far more robust than hand-rolled keyword matching, handles overlap and ambiguity well, especially on long text like contracts (1000+ words). Map franc's ISO 639-3 codes to `SupportedLanguage`: `por` → 'pt-br', `eng` → 'en', `spa` → 'es'. Unrecognized languages, undetermined results, and edge cases (empty/short text) return `null` — the extraction engine maps this to `unsupported_language` error code. Return type is `SupportedLanguage | null`.

**How to verify:** Run the language detection tests. Then dispatch `superpowers:code-reviewer` to review the detection logic and tests.

---

### Task 5: Research and create test fixture contracts

**What:** Research real rental contract structures for each language and create realistic synthetic test contracts in both PDF and DOCX formats. This is research-heavy — the contracts must reflect how real contracts are structured in each country, not be invented from scratch.

**Where:** `src/lib/contract-extraction/__tests__/fixtures/`

**Research required:**
- **PT-BR:** Study the real contract (Brandon/Alex) plus find 2-3 Brazilian contrato de locação templates online (jusbrasil, modeloinicial, government templates). Understand the "Quadro Resumo" pattern, how different contracts structure landlord/tenant identification, rent clauses, expense clauses, and date formatting. The synthetic PT-BR contract must use a **different structure** than the real one — different clause ordering, different way of stating rent/dates, different section naming — to test that extraction handles variation.
- **EN:** Research US residential lease agreement templates (lawdepot, eforms, templatelab, state-specific templates). Understand common structures: parties section, premises, lease term, rent, security deposit, utilities. Note how US contracts differ from Brazilian ones — different section ordering, SSN vs CPF, USD formatting, MM/DD/YYYY dates.
- **ES:** Research Spanish-language rental contracts — contrato de arrendamiento from Mexico, Spain, or Colombia. Understand the structure: arrendador/arrendatario sections, renta/alquiler clauses, vigencia, RFC/DNI/CURP identification. Find at least 2 real templates to base the synthetic on.

**Fixtures to create (2 synthetic contracts per language, each in both PDF + DOCX, plus 1 real PT-BR DOCX = 13 files total):**

PT-BR (5 files — 1 real + 2 synthetic × 2 formats):
- `pt-br-real.docx` — copy from `/Users/brandonfleming/Downloads/260218 - Contrato de locação Sun Club (1).docx`
- `pt-br-synthetic-1.pdf` + `pt-br-synthetic-1.docx` — synthetic contract based on research, structurally different from the real one (e.g., different clause ordering, formal "Quadro Resumo" style)
- `pt-br-synthetic-2.pdf` + `pt-br-synthetic-2.docx` — another variation (e.g., simpler/informal structure, different date format, different way of stating rent)

EN (4 files — 2 synthetic × 2 formats):
- `en-synthetic-1.pdf` + `en-synthetic-1.docx` — US-style residential lease agreement
- `en-synthetic-2.pdf` + `en-synthetic-2.docx` — different structure (e.g., state-specific template, different section ordering, different date format MM/DD/YYYY vs Month DD, YYYY)

ES (4 files — 2 synthetic × 2 formats):
- `es-synthetic-1.pdf` + `es-synthetic-1.docx` — Mexican contrato de arrendamiento
- `es-synthetic-2.pdf` + `es-synthetic-2.docx` — different structure (e.g., Colombian or Spanish style, different terminology, different currency formatting)

**Requirements for each synthetic contract:**
- Must contain extractable: property address, rent amount + currency, contract start/end dates, at least one landlord with name + tax ID, at least one tenant with name + tax ID, at least 2 expenses
- Must use realistic formatting, legal language, and section structure for its language/country — based on the templates researched, not invented
- Each pair within a language must have meaningful structural variation — different date formats (DD/MM/YYYY vs written out), different ways of expressing rent (monthly value vs annual), different section ordering, different section headings
- PDF files must be valid PDFs (use a programmatic PDF generation library or convert from DOCX)
- DOCX files must be valid DOCX documents

**Expected values files:** For each fixture, create a companion `.expected.json` in the `expected/` subdirectory documenting the exact values the extraction should produce. These are used by integration tests in Task 7. Include every extractable field with the expected value (or null if intentionally absent). 7 expected files total (one per unique contract content — PDF and DOCX of the same content share one expected file).

**How to verify:** All fixtures can be opened and read. Each contains the documented extractable data. The `.expected.json` files accurately reflect what's in each contract. Review the research sources and synthetic contract content for realism. Then dispatch `superpowers:code-reviewer` to review the fixtures and expected values for accuracy and realism.

---

### Task 6: Build language-specific prompts

**What:** Build the language-specific prompts that tell the LLM how to extract structured data from rental contracts in each language.

**Where:** `src/lib/contract-extraction/prompts/`

**Prompts to create:**
- `system.ts` — shared system prompt explaining the extraction task, the output schema, and the rules (extract what's there, leave null what's not, amounts in integer minor units, dates in ISO 8601 format YYYY-MM-DD, addresses as structured components not a single string)
- `pt-br.ts` — PT-BR specific guidance: "Quadro Resumo" structure, Brazilian address format (rua/avenida, número, complemento, bairro, cidade, estado, CEP), CPF patterns (XXX.XXX.XXX-XX), R$ currency, common section headings (LOCADOR/LOCADORES, LOCATÁRIO, VALOR DO ALUGUEL, PRAZO, etc.), how rent is typically expressed, how expenses are listed (CLÁUSULA TERCEIRA pattern)
- `en.ts` — EN specific guidance: US/UK lease structure, SSN/Tax ID patterns, USD/GBP, common section headings (PARTIES, PREMISES, RENT, TERM, UTILITIES, etc.), how rent is typically expressed, common expense/utility clauses
- `es.ts` — ES specific guidance: Spanish contract structure, RFC/DNI/CURP patterns, MXN/EUR currency, common section headings (ARRENDADOR, ARRENDATARIO, RENTA, VIGENCIA, SERVICIOS, etc.)

**How prompts work with the Vercel AI SDK:**
The `generateObject` function takes a Zod schema (Task 2), a system prompt, and a user prompt. The schema constrains the model's output shape and the SDK validates the response against it. The prompts guide the model on *how* to extract — the schema handles *what* to return. They work together:
- **Zod schema** → guarantees output structure (fields, types, optionality)
- **System prompt** → shared extraction rules (don't hallucinate, use null for missing fields, amounts in minor units, dates in ISO format)
- **Language prompt + contract text** → language-specific guidance on where to find fields, combined with the actual contract text as input

**Prompt design principles:**
- The system prompt does NOT need to describe the output fields — the Zod schema handles that automatically. Focus the system prompt on behavioral rules (accuracy over completeness, null over guessing, formatting conventions)
- Language prompts guide the LLM on where to find each field in the typical contract structure — not rigid rules, but hints (e.g., "rent amount is typically stated in a section titled VALOR DO ALUGUEL or in the Quadro Resumo")
- Prompts should instruct the LLM to return null for fields it cannot confidently extract — never guess or hallucinate values
- Use the researched contract structures from Task 5 to inform what the prompts should guide the LLM to look for

**How to verify:** Prompts are TypeScript modules exporting strings. Prompt quality is verified in Task 7 via extraction tests against the fixtures. Review prompts for completeness — every field in `ContractExtractionResult` should have extraction guidance in each language prompt. Then dispatch `superpowers:code-reviewer` to review the prompts for completeness and quality.

---

### Task 7: Build the extraction engine + tests (unit + integration)

**What:** The main entry point that ties everything together: takes a file buffer → extracts text → detects language → selects prompt → calls LLM via Vercel AI SDK `generateObject` → returns typed `ContractExtractionResult`. Plus two layers of tests.

**Where:**
- Create `src/lib/contract-extraction/extract-contract.ts`
- Install `ai` and `@ai-sdk/anthropic` dependencies
- Add `ANTHROPIC_API_KEY` to `.env.local`
- Unit tests in `__tests__/extract-contract.test.ts`
- Integration tests in `__tests__/extract-contract.integration.test.ts`

**Implementation:**
- `extractContract(input: ContractExtractionInput): Promise<ContractExtractionResponse>` — the public API (returns discriminated union: success with data or failure with error code)
- Uses `extractText` (Task 3) to get raw text
- Uses `detectLanguage` (Task 4) to determine language
- Selects the language-specific prompt (Task 6)
- Calls `generateObject` from the AI SDK with the Zod schema (Task 2) and Anthropic provider
- Model: start with Sonnet 4.6, configurable via parameter or env var
- Combine the shared system prompt + language-specific prompt into the `system` parameter of `generateObject`. The contract text goes in `prompt`. This maximizes prompt caching — consecutive contracts in the same language get full cache hits on the instruction set, and the contract text (always unique) stays in the uncached `prompt` parameter

**Unit tests (fast, deterministic, no LLM calls) — `extract-contract.test.ts`:**

Pipeline flow (mock generateObject):
- Extracts text → detects language → selects correct prompt → passes correct arguments to generateObject → returns typed result
- Correct prompt selection: PT-BR detected text → PT-BR prompt used, EN → EN prompt, ES → ES prompt
- Partial LLM result — generateObject returns some fields null → result passes through nulls correctly
- rawText is populated in the result with the full extracted document text
- Bundled rent — when LLM returns an `includes` array (e.g., ["rent", "condo", "IPTU"]), it surfaces in the result

Error code mapping (verify each failure returns the correct `ContractExtractionErrorCode`):
- File exceeds 10MB → `file_too_large`
- Unsupported format (not PDF/DOCX) → `unsupported_format`
- Corrupt file → `corrupt_file`
- Scanned PDF (no text layer) → `scanned_document`
- Password protected file → `password_protected`
- Valid file but no text content → `empty_content`
- Empty/null/undefined input → `empty_file`
- Unsupported language detected by franc → `unsupported_language` (returned before LLM call)
- LLM returns `isRentalContract: false` → `not_a_contract` (extraction engine checks this field before returning the result)
- LLM call fails (network error, model error) → `extraction_failed`
- LLM returns data that fails Zod schema validation → `extraction_failed`
- LLM call exceeds timeout → `extraction_timeout`
- Anthropic rate limit → `rate_limited`
- API key missing → `api_key_missing`

Response shape:
- Success response matches `{ success: true, data: ContractExtractionResult }` shape
- Error response matches `{ success: false, error: { code: ContractExtractionErrorCode } }` shape — no arbitrary strings anywhere

These run with `pnpm test` (normal test suite), every commit, no API key needed.

**Integration tests (real LLM calls) — `extract-contract.integration.test.ts`:**

These make real LLM calls to verify extraction accuracy. **They must NOT run as part of the normal test suite** (`pnpm test`). They run only via a dedicated command (e.g., `pnpm test:llm` or `pnpm test:integration:llm`) and only when contract extraction code is modified. This avoids racking up API costs on every code change.

Assertions are **field-level with tolerance** since LLM output is non-deterministic:

- **Exact match** for: rent amount (630000), currency ("BRL"), dates ("2026-02-28", "2026-12-15"), due day (5)
- **Contains/normalized match** for: address components (street name present, city correct, postal code correct — don't assert exact formatting), person names (correct name present, don't assert exact casing/accents)
- **Present check** for: fields we know exist in the fixture are non-null (e.g., landlord CPF extracted, tenant name extracted)
- **Not present check** for: fields we know are absent stay null

Test cases (13 fixture files, 7 unique contract contents):

Per-fixture extraction accuracy:
- PT-BR real DOCX (Brandon/Alex contract) — verify: address (Avenida Campeche 533, Florianópolis, SC, 88063-300), rent (630000 BRL, due day 5, includes: ["rent", "condo", "IPTU"]), dates (2026-02-28 to 2026-12-15), landlords (both Alex CPF 040.032.329-09 AND Daiana CPF 008.899.229-26 — verify multiple landlords are extracted, not just the first), tenant (Brandon), expenses (IPTU, electricity, water, gas), language (pt-br), date extraction uses specific dates not approximate description ("aproximadamente nove meses e meio")
- PT-BR synthetic 1 (PDF + DOCX) — verify extraction with different contract structure than the real one
- PT-BR synthetic 2 (PDF + DOCX) — verify extraction with another structural variation
- EN synthetic 1 (PDF + DOCX) — verify extraction with USD amounts, US-style dates, EN-specific fields
- EN synthetic 2 (PDF + DOCX) — verify extraction with different US/UK structure
- ES synthetic 1 (PDF + DOCX) — verify extraction with ES-specific patterns (Mexican style)
- ES synthetic 2 (PDF + DOCX) — verify extraction with different ES structure (Colombian/Spanish style)

Cross-cutting concerns:
- **Format consistency** — same contract in PDF vs DOCX produces the same (or very similar) extraction result. Pick one synthetic per language, compare PDF and DOCX results field-by-field.
- **Multiple landlords** — real contract has 2 landlords. Verify both are extracted with correct CPFs.
- **Multiple tenants** — at least one synthetic fixture should have 2+ tenants. Verify all are extracted.
- **Bundled rent** — real contract bundles rent + condo + IPTU into one amount. Verify `includes` array is populated and the amount is the stated total (not decomposed).
- **rawText populated** — verify the raw text is included in the result and contains the full document text (not truncated). Spot check a known phrase exists in the raw text.
- **Currency formatting** — R$6.300,00 (PT-BR), $2,500.00 (EN), €1.200,00 or MXN (ES) → all correctly parsed to integer minor units.
- **CPF formatting** — with dots/dashes (040.032.329-09) extracted and normalized consistently.
- **Partial extraction** — contract missing some fields → those fields are null, others still extracted.
- **Error cases** — corrupt file, empty file, non-contract document → graceful error, not crash.

**Expected values:** Each fixture loads its companion `.expected.json` from the `expected/` subdirectory. Integration tests assert against these. PDF and DOCX of the same content share one expected file (same extraction result regardless of format).

**Test runner setup:**
- **Exclude LLM tests from `pnpm test`:** Update the default vitest config to exclude `*.integration.test.ts` files in `src/lib/contract-extraction/` so they never run with `pnpm test`, even if `ANTHROPIC_API_KEY` is present in the environment. This is critical — an accidental LLM test run on every code change would rack up costs.
- **Create `pnpm test:llm`:** A dedicated vitest config or script that only runs `.integration.test.ts` files in `src/lib/contract-extraction/`. Requires `ANTHROPIC_API_KEY` in the environment — if missing, tests should skip with a clear message, not fail cryptically.
- This is separate from both `pnpm test` (unit tests) and `pnpm test:integration` (DB integration tests). Each fixture is tested once per run — if flakiness is observed, the prompt or assertion tolerance needs tuning, not retry logic.

**How to verify:** Unit tests pass with `pnpm test` (no API key). LLM integration tests pass with `pnpm test:llm` (API key required). All 13 fixtures produce correct structured data within assertion tolerances. Then dispatch `superpowers:code-reviewer` to review the extraction engine, unit tests, and integration tests.

**Check:** `testing` skill (integration test patterns), `claude-api` skill (Anthropic SDK usage, prompt caching)

---

### Task 8: Verification & Code Review

1. Run the type checker, full test suite (unit + integration), and linter. Everything passes.
2. Verify the rename is complete — grep for bare `BillExtractionResult` (not `BillExtractionResult` or `ContractExtractionResult`) in source files returns zero results.
3. Verify all 13 fixture files (7 unique contract contents) produce correct extraction results (Task 7 integration tests).
4. Verify partial extraction and error cases are handled.
5. Review extraction accuracy — for the real PT-BR contract, manually verify every extracted field matches the contract content.
6. Dispatch `superpowers:code-reviewer` against the spec's Contract Extraction section and the implementation.
7. Address any findings and re-verify.

**Do not commit.** Present results for user testing.

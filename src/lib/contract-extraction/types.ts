/**
 * Types for contract extraction.
 *
 * ContractExtractionResult is the structured output from LLM-based
 * contract parsing. The matching Zod schema in schema.ts is used by
 * Vercel AI SDK's generateText + Output.object to guarantee this shape.
 *
 * Money is always integer minor units (e.g., centavos, cents). Never floating point.
 */

import type { Database } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export type SupportedLanguage = 'pt-br' | 'en' | 'es'

// ---------------------------------------------------------------------------
// Property type — Postgres enum is source of truth (see property_type enum migration)
// ---------------------------------------------------------------------------

export type PropertyType = Database['public']['Enums']['property_type']

// ---------------------------------------------------------------------------
// Expense type — Postgres enum is source of truth (see expense_type enum migration)
//
// Canonical English vocabulary across all supported languages. The LLM
// normalizes the contract's native term (PT-BR "luz"/"energia elétrica",
// ES "energía eléctrica") to a single canonical value ("electricity").
// Downstream consumers (billing, payment matching, ledger, analytics, UI)
// work off this canonical set — they never need per-language synonym logic.
// "other" is the escape hatch for expenses that don't fit (e.g., IPTU, IBI,
// predial, security fees).
// ---------------------------------------------------------------------------

export type ExpenseType = Database['public']['Enums']['expense_type']

// ---------------------------------------------------------------------------
// Extraction result — the LLM output shape
// ---------------------------------------------------------------------------

export interface ContractAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export interface ContractRent {
  /** Integer minor units (e.g., centavos, cents). Never floating point. */
  amount: number
  /** ISO 4217 currency code. Null when the contract's currency is undeterminable. */
  currency: string | null
  /** Day of month (1-31) */
  dueDay: number | null
  /**
   * What the stated amount covers, e.g. ["rent", "condo", "IPTU"]. Always an
   * array — an empty array means the contract doesn't itemize what rent bundles
   * (treat as "rent only"), not "field is absent".
   */
  includes: string[]
}

export interface ContractDates {
  /** ISO date string YYYY-MM-DD. Null if the contract doesn't state a start date. */
  start: string | null
  /** ISO date string YYYY-MM-DD. Null if the contract doesn't state an end date. */
  end: string | null
}

export type RentAdjustmentFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'other'
export type RentAdjustmentMethod = 'index' | 'fixed_amount' | 'fixed_percentage' | 'other'

export interface ContractRentAdjustment {
  /** ISO date string or descriptive string */
  date: string | null
  frequency: RentAdjustmentFrequency | null
  method: RentAdjustmentMethod | null
  /** Name of the index if method is "index" (e.g., "IPCA", "CPI", "IPC"). Null if not index-based. */
  indexName: string | null
  /** Fixed amount (integer minor units) or percentage value, if applicable. Null if index-based. */
  value: number | null
}

export interface ContractParty {
  name: string | null
  taxId: string | null
  email: string | null
}

/**
 * Where an expense is paid from:
 * - "rent" → bundled into the rent payment (e.g., "rent includes IPTU")
 * - An ExpenseType (e.g., "condo") → bundled into that expense's bill
 *   (e.g., a condo fee that covers water and trash)
 * - null → this expense has its own dedicated bill
 */
export type ExpenseBundledInto = ExpenseType | 'rent' | null

export interface ContractExpense {
  /** Canonical category. See ExpenseType — the LLM normalizes native terms to this set. */
  type: ExpenseType | null
  /** If this expense is paid as part of another payment stream. See ExpenseBundledInto. */
  bundledInto: ExpenseBundledInto
  providerName: string | null
  providerTaxId: string | null
}

/**
 * LLM-produced fields only — the shape returned by generateText + Output.object.
 * Does NOT include engine-produced fields (languageDetected, rawExtractedText).
 */
export interface ContractExtractionLlmResult {
  /**
   * LLM classification: is this document a rental contract?
   * If false, the extraction engine returns `not_a_contract` error.
   */
  isRentalContract: boolean
  propertyType: PropertyType | null
  address: ContractAddress | null
  rent: ContractRent | null
  contractDates: ContractDates | null
  rentAdjustment: ContractRentAdjustment | null
  landlords: ContractParty[] | null
  tenants: ContractParty[] | null
  expenses: ContractExpense[] | null
}

/**
 * Full extraction result — LLM output plus engine-produced fields.
 */
export interface ContractExtractionResult extends ContractExtractionLlmResult {
  languageDetected: SupportedLanguage
  /** Full text extracted from the document — kept for re-extraction and search */
  rawExtractedText: string
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ContractExtractionInput {
  fileBuffer: Buffer
  /**
   * Advisory — the engine does not read this field. `extractText` detects
   * the format from the buffer's magic bytes (`%PDF-` for PDFs, the PK zip
   * header + `word/` entry for DOCX). Kept in the public API as a hint for
   * callers who already know the format from an upload's MIME type; mismatches
   * between `fileType` and the actual content are resolved in favor of the
   * content.
   */
  fileType: 'pdf' | 'docx'
}

// ---------------------------------------------------------------------------
// Models — typed default, free-form env override
//
// The default is the model we've calibrated the cost/accuracy envelope
// against (see fixtures/README.md for the most recent numbers). Adding a
// new model to this union is a signal that it's been calibrated; the
// CONTRACT_EXTRACTION_MODEL env var accepts any string so an engineer can
// try a new model locally before committing it to the union.
// ---------------------------------------------------------------------------

export type ContractExtractionModelId =
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001'
  | 'claude-opus-4-7'

// ---------------------------------------------------------------------------
// Telemetry — surfaced via optional onTelemetry callback, not part of the
// response shape. The engine fires it on the success path only; failure
// paths either don't reach the LLM or have no usable usage data.
// ---------------------------------------------------------------------------

export interface ContractExtractionTelemetry {
  inputTokens: number
  outputTokens: number
  /** Tokens the provider billed as "cache write" (priced 1.25x input for Anthropic ephemeral). */
  cacheWriteTokens: number
  /** Tokens served from cache (priced 0.1x input for Anthropic ephemeral). */
  cacheReadTokens: number
  modelId: string
  language: SupportedLanguage
  durationMs: number
}

export interface ContractExtractionOptions {
  onTelemetry?: (telemetry: ContractExtractionTelemetry) => void
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ContractExtractionErrorCode =
  | 'file_too_large'
  | 'unsupported_format'
  | 'corrupt_file'
  | 'empty_file'
  | 'no_text_extractable'
  | 'password_protected'
  | 'unsupported_language'
  | 'not_a_contract'
  | 'extraction_failed'
  | 'extraction_timeout'
  | 'rate_limited'
  | 'api_key_missing'

export interface ContractExtractionError {
  code: ContractExtractionErrorCode
}

// ---------------------------------------------------------------------------
// Response — discriminated union
// ---------------------------------------------------------------------------

export type ContractExtractionResponse =
  | { success: true; data: ContractExtractionResult }
  | { success: false; error: ContractExtractionError }

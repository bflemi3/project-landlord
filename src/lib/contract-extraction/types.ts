/**
 * Types for contract extraction.
 *
 * ContractExtractionResult is the structured output from LLM-based
 * contract parsing. The matching Zod schema in schema.ts is used by
 * Vercel AI SDK's generateObject to guarantee this shape.
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
  /** ISO 4217 currency code */
  currency: string
  /** Day of month (1-31) */
  dueDay: number | null
  /** What the stated amount covers, e.g. ["rent", "condo", "IPTU"] */
  includes: string[] | null
}

export interface ContractDates {
  /** ISO date string YYYY-MM-DD */
  start: string
  /** ISO date string YYYY-MM-DD */
  end: string
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
 * LLM-produced fields only — the shape returned by generateObject.
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
  fileType: 'pdf' | 'docx'
}

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

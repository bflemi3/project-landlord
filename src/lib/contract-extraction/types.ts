/**
 * Types for contract extraction.
 *
 * ContractExtractionResult is the structured output from LLM-based
 * contract parsing. The matching Zod schema in schema.ts is used by
 * Vercel AI SDK's generateObject to guarantee this shape.
 *
 * Money is always integer minor units (e.g., centavos, cents). Never floating point.
 */

// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export type SupportedLanguage = 'pt-br' | 'en' | 'es'

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

export interface ContractExpense {
  /** Category/type of expense, e.g. "electricity", "water", "condo" */
  type: string | null
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
// Errors
// ---------------------------------------------------------------------------

export type ContractExtractionErrorCode =
  | 'file_too_large'
  | 'unsupported_format'
  | 'corrupt_file'
  | 'empty_file'
  | 'scanned_document'
  | 'empty_content'
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

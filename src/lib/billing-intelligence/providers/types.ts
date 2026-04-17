import type {
  BillExtractionResult,
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
  extractBill(text: string): BillExtractionResult | null

  /**
   * Look up open bills for a customer.
   * Only available if capabilities.apiLookup is true.
   */
  lookupBills?(document: string): Promise<BillExtractionResult[] | null>

  /**
   * Check payment status for a customer's bills.
   * Only available if capabilities.paymentStatus is true.
   */
  checkPaymentStatus?(document: string): Promise<PaymentStatus[] | null>

  /**
   * Validate an extraction against an external source.
   * Only available if capabilities.validation is true.
   */
  validateExtraction?(extraction: BillExtractionResult): Promise<ValidationResult | null>
}

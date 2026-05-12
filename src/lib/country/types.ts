import type { z } from 'zod'

import type { AddressProvider } from '@/lib/address/types'

// =============================================================================
// CountryProvider — per-country runtime specialization for any concern that
// varies by country: address (postal code format, state list, lookup),
// tax ID (validation schema, future mask/label/placeholder), and (future)
// phone, business ID, currency defaults, locale defaults.
//
// Address-only callers should keep using `getAddressProvider(code)` from
// `@/lib/address/provider` — that helper is now a thin wrapper over
// `getCountryProvider(code).address`. New cross-cutting code that needs
// multiple country-specific concerns should consume `getCountryProvider`
// directly.
// =============================================================================

export interface TaxIdProvider {
  /**
   * Zod schema for the tax-id field. Brazil enforces CPF check digits;
   * fallback only enforces length. Re-imported from `src/schemas/tax-id.ts`
   * so the provider and the form-level schemas share one source of truth.
   */
  schema: z.ZodType<string>
  // Future: `label` (e.g., 'CPF'), `placeholder` (e.g., '000.000.000-00'),
  // `format(raw: string)` for masking, `validate(raw: string)` for runtime
  // checks outside Zod. None are needed yet.
}

export interface CountryProvider {
  /** ISO 3166-1 alpha-2 country code (e.g., 'BR'). Empty string on fallback. */
  code: string
  address: AddressProvider
  taxId: TaxIdProvider
}

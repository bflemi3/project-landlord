import { getCountryProvider } from '@/lib/country/provider'

import type { AddressProvider } from './types'

/**
 * Returns the address-specific behavior for `countryCode`. This is now a thin
 * wrapper over `getCountryProvider(code).address` — `src/lib/country/` is
 * the canonical location for per-country specialization (address, tax-id,
 * future phone/business-id/etc.). New code that needs multiple country
 * concerns should consume `getCountryProvider` directly.
 */
export function getAddressProvider(countryCode: string): AddressProvider {
  return getCountryProvider(countryCode).address
}

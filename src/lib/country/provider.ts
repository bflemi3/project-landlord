import { brazilCountryProvider } from './providers/brazil'
import { fallbackCountryProvider } from './providers/fallback'

import type { CountryProvider } from './types'

const providers: Record<string, CountryProvider> = {
  BR: brazilCountryProvider,
}

/**
 * Returns the per-country provider for `countryCode`, or the fallback
 * provider for unsupported countries. Consumers needing only address-level
 * behavior should keep using `getAddressProvider` from `@/lib/address/provider`
 * — it is now a thin wrapper over `getCountryProvider(code).address`.
 */
export function getCountryProvider(countryCode: string): CountryProvider {
  return providers[countryCode] ?? fallbackCountryProvider
}

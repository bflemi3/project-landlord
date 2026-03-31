import type { AddressProvider } from './types'
import { brazilProvider } from './providers/brazil'
import { fallbackProvider } from './providers/fallback'

const providers: Record<string, AddressProvider> = {
  BR: brazilProvider,
}

export function getAddressProvider(countryCode: string): AddressProvider {
  return providers[countryCode] ?? fallbackProvider
}

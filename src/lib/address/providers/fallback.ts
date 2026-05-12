import type { AddressLookupResult, AddressProvider } from '../types'

export const fallbackProvider: AddressProvider = {
  states: [],

  formatPostalCode(raw: string): string {
    return raw
  },

  async lookupPostalCode(): Promise<AddressLookupResult | null> {
    return null
  },
}

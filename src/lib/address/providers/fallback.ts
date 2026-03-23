import type { AddressProvider, AddressLookupResult } from '../types'

export const fallbackProvider: AddressProvider = {
  postalCodePattern: /^.+$/,
  postalCodePlaceholder: '',
  postalCodeLabel: 'Postal code',
  states: [],

  formatPostalCode(raw: string): string {
    return raw
  },

  async lookupPostalCode(): Promise<AddressLookupResult | null> {
    return null
  },
}

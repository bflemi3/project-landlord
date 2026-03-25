import type { AddressProvider, AddressLookupResult, AddressFields, AddressValidationErrors } from '../types'

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

  validateAddress(fields: AddressFields): AddressValidationErrors | null {
    const errors: AddressValidationErrors = {}

    if (!fields.street) errors.street = 'required'
    if (!fields.city) errors.city = 'required'

    return Object.keys(errors).length > 0 ? errors : null
  },
}

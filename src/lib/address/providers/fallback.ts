import { z } from 'zod'

import type { AddressProvider, AddressLookupResult, AddressFields, AddressValidationErrors } from '../types'
import { propertyAddressShapeSchema } from '@/data/properties/schema'

export const addressSchema = propertyAddressShapeSchema.extend({
  postal_code: propertyAddressShapeSchema.shape.postal_code.optional().default(''),
  number: propertyAddressShapeSchema.shape.number.optional().default(''),
  state: propertyAddressShapeSchema.shape.state.optional().default(''),
})

export const fallbackProvider: AddressProvider = {
  addressSchema,
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
    const result = addressSchema.safeParse(fields)
    if (result.success) return null

    const errors = z.flattenError(result.error).fieldErrors as AddressValidationErrors
    return Object.keys(errors).length > 0 ? errors : null
  },
}

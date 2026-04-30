import type { z } from 'zod'
import type { PropertyInput } from '@/data/properties/schema'

export interface AddressLookupResult {
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export type AddressFields = Partial<Pick<PropertyInput,
  'postal_code' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state'
>>

export type AddressValidationErrors = {
  [K in keyof AddressFields]?: readonly string[]
}

export interface AddressProvider {
  addressSchema: z.ZodObject<z.ZodRawShape>
  lookupPostalCode(code: string): Promise<AddressLookupResult | null>
  formatPostalCode(raw: string): string
  validateAddress(fields: AddressFields): AddressValidationErrors | null
  postalCodePattern: RegExp
  postalCodePlaceholder: string
  postalCodeLabel: string
  states: { code: string; name: string }[]
}

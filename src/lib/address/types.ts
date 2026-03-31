export interface AddressLookupResult {
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export interface AddressFields {
  postal_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

export type AddressValidationError =
  | 'required'
  | 'tooLong'
  | 'invalidPostalCode'
  | 'invalidCity'
  | 'invalidState'

export type AddressValidationErrors = {
  [K in keyof AddressFields]?: AddressValidationError
}

export interface AddressProvider {
  lookupPostalCode(code: string): Promise<AddressLookupResult | null>
  formatPostalCode(raw: string): string
  validateAddress(fields: AddressFields): AddressValidationErrors | null
  postalCodePattern: RegExp
  postalCodePlaceholder: string
  postalCodeLabel: string
  states: { code: string; name: string }[]
}

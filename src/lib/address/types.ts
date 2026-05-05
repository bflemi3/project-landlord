export interface AddressLookupResult {
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export interface AddressProvider {
  lookupPostalCode(code: string): Promise<AddressLookupResult | null>
  formatPostalCode(raw: string): string
  states: { code: string; name: string }[]
}

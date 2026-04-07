/**
 * Formats a full one-line address from parts. Locale-aware:
 *
 * - BR: "Rua Augusta, 123, Apto 4B, Consolação, São Paulo, SP"
 * - Default (US/EN): "123 Main St, Apt 4B, Downtown, Austin, TX"
 */

interface AddressFields {
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  countryCode?: string
}

export function formatAddress(fields: AddressFields): string {
  const street = fields.street?.trim() || undefined
  const number = fields.number?.trim() || undefined
  const complement = fields.complement?.trim() || undefined
  const neighborhood = fields.neighborhood?.trim() || undefined
  const city = fields.city?.trim() || undefined
  const state = fields.state?.trim() || undefined
  const country = (fields.countryCode ?? 'BR').toUpperCase()

  let streetLine: string

  if (country === 'BR') {
    // Brazilian: "Rua Augusta, 123, Apto 4B"
    streetLine = [street, number, complement].filter(Boolean).join(', ')
  } else {
    // US/generic: "123 Main St, Apt 4B"
    const base = [number, street].filter(Boolean).join(' ')
    streetLine = [base, complement].filter(Boolean).join(', ')
  }

  // Location: "Consolação, São Paulo, SP"
  const cityState = [city, state].filter(Boolean).join(', ')
  const location = [neighborhood, cityState].filter(Boolean).join(', ')

  return [streetLine, location].filter(Boolean).join(', ')
}

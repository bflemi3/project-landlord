/**
 * Formats a full one-line address from parts. Locale-aware:
 *
 * - BR: "Rua Augusta, 123, Apto 4B, Consolação, São Paulo, SP"
 * - Default (US/EN): "123 Main St, Apt 4B, Downtown, Austin, TX"
 */

import type { PropertyInput } from '@/schemas/property'

type AddressFormatFields = Partial<{
  [K in keyof Pick<
    PropertyInput,
    'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'country_code'
  >]: PropertyInput[K] | null
}>

export function formatAddress(fields: AddressFormatFields): string {
  const street = fields.street?.trim() || undefined
  const number = fields.number?.trim() || undefined
  const complement = fields.complement?.trim() || undefined
  const neighborhood = fields.neighborhood?.trim() || undefined
  const city = fields.city?.trim() || undefined
  const state = fields.state?.trim() || undefined
  const country = (fields.country_code ?? 'BR').toUpperCase()

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

/**
 * Formats an address as multi-line HTML with `<br>` separators.
 * Designed for email templates where vertical layout is clearer.
 *
 * Line 1: Street + number + complement
 * Line 2: Neighborhood (if present)
 * Line 3: City, State
 */
export function formatAddressHtml(fields: AddressFormatFields): string {
  const street = fields.street?.trim() || undefined
  const number = fields.number?.trim() || undefined
  const complement = fields.complement?.trim() || undefined
  const neighborhood = fields.neighborhood?.trim() || undefined
  const city = fields.city?.trim() || undefined
  const state = fields.state?.trim() || undefined
  const country = (fields.country_code ?? 'BR').toUpperCase()

  let streetLine: string
  if (country === 'BR') {
    streetLine = [street, number].filter(Boolean).join(', ')
  } else {
    streetLine = [number, street].filter(Boolean).join(' ')
  }

  const cityState = [city, state].filter(Boolean).join(', ')

  return [streetLine, complement, neighborhood, cityState].filter(Boolean).join('<br>')
}

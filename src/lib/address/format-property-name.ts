/**
 * Generates a default property display name from address parts when no
 * explicit name is provided. Formatting is locale-aware:
 *
 * - BR: "Rua Augusta, 123, Apto 4B"  (street, number, complement)
 * - Default (US/EN style): "123 Main St, Apt 4B"  (number street, complement)
 */

interface PropertyNameFields {
  name?: string
  street?: string
  number?: string
  complement?: string
  countryCode?: string
}

export function formatPropertyName(fields: PropertyNameFields): string {
  const name = fields.name?.trim()
  if (name) return name

  const street = fields.street?.trim()
  const number = fields.number?.trim()
  const complement = fields.complement?.trim()
  const country = (fields.countryCode ?? 'BR').toUpperCase()

  let base: string

  if (country === 'BR') {
    // Brazilian convention: "Rua Augusta, 123"
    base = [street, number].filter(Boolean).join(', ')
  } else {
    // US/generic convention: "123 Main St"
    base = [number, street].filter(Boolean).join(' ')
  }

  return [base, complement].filter(Boolean).join(', ')
}

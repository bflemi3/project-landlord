/**
 * Validate a CNPJ using Brazil's check digit algorithm (Receita Federal).
 *
 * A CNPJ is 14 digits: NNNNNNNNFFFFCC where:
 * - N = 8-digit base number
 * - F = 4-digit branch/subsidiary number (0001 for headquarters)
 * - C = 2 check digits computed from the first 12
 *
 * Accepts both formatted (XX.XXX.XXX/XXXX-XX) and unformatted (14 digits) input.
 * Returns true if the check digits are mathematically valid.
 */
export function isValidCnpj(input: string): boolean {
  const cnpj = input.replace(/[.\-/]/g, '')

  if (cnpj.length !== 14) return false
  if (!/^\d{14}$/.test(cnpj)) return false

  // Reject all-same-digit CNPJs (e.g. 00000000000000, 11111111111111)
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const digits = cnpj.split('').map(Number)

  // First check digit (position 13)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) sum += digits[i] * weights1[i]
  let remainder = sum % 11
  const check1 = remainder < 2 ? 0 : 11 - remainder
  if (digits[12] !== check1) return false

  // Second check digit (position 14)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) sum += digits[i] * weights2[i]
  remainder = sum % 11
  const check2 = remainder < 2 ? 0 : 11 - remainder
  if (digits[13] !== check2) return false

  return true
}

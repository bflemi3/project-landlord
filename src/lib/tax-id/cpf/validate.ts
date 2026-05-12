/**
 * Validate a CPF using Brazil's check digit algorithm (Receita Federal).
 *
 * A CPF is 11 digits: NNNNNNNNNCC where:
 * - N = 9-digit base number
 * - C = 2 check digits computed from the first 9
 *
 * Accepts both formatted (XXX.XXX.XXX-XX) and unformatted (11 digits) input.
 * Returns true if the check digits are mathematically valid.
 */
export function isValidCpf(input: string): boolean {
  const cpf = input.replace(/[.\-]/g, '')

  if (cpf.length !== 11) return false
  if (!/^\d{11}$/.test(cpf)) return false

  // Reject all-same-digit CPFs (e.g. 000.000.000-00, 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)

  // First check digit (position 10)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let remainder = (sum * 10) % 11
  const check1 = remainder === 10 ? 0 : remainder
  if (digits[9] !== check1) return false

  // Second check digit (position 11)
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  remainder = (sum * 10) % 11
  const check2 = remainder === 10 ? 0 : remainder
  if (digits[10] !== check2) return false

  return true
}

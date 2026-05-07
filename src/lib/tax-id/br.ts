import { formatCnpj } from './cnpj/format'
import { isValidCnpj } from './cnpj/validate'
import { formatCpf } from './cpf/format'
import { isValidCpf } from './cpf/validate'

/**
 * Format a Brazilian tax-id by progressively masking as CPF or CNPJ based on
 * digit count. ≤11 digits → CPF mask; 12+ digits → CNPJ mask. Used by the
 * tax-id input when the field accepts either an individual or a corporate
 * tax-id.
 */
export function formatTaxIdBR(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length <= 11) return formatCpf(digits)
  return formatCnpj(digits)
}

/**
 * True when the input is a valid CPF or a valid CNPJ. Either length is
 * accepted; values that fall in between (12 or 13 digits) are rejected
 * because they can't satisfy either check-digit algorithm.
 */
export function isValidTaxIdBR(input: string): boolean {
  return isValidCpf(input) || isValidCnpj(input)
}

/**
 * Tells the consumer which kind of tax-id `input` represents based on digit
 * count. Used by the responsive label in `<TaxIdLabel>` to swap between
 * "CPF" / "CNPJ" / "CPF or CNPJ" as the user types.
 */
export type TaxIdKindBR = 'cpf' | 'cnpj' | 'unknown'

export function detectTaxIdKindBR(input: string): TaxIdKindBR {
  const length = input.replace(/\D/g, '').length
  if (length === 0) return 'unknown'
  if (length <= 11) return 'cpf'
  return 'cnpj'
}

/**
 * Progressively format raw input into the CNPJ mask `XX.XXX.XXX/XXXX-XX`.
 *
 * Strips non-digits, truncates to 14, and re-applies the punctuation up to
 * the current digit count. Idempotent on already-formatted input.
 */
export function formatCnpj(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 14)

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

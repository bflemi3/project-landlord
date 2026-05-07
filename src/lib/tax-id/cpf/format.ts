/**
 * Progressively format raw input into the CPF mask `XXX.XXX.XXX-XX`.
 *
 * Strips non-digits, truncates to 11, and re-applies the punctuation up to the
 * current digit count. Idempotent on already-formatted input. Pasting a
 * fully-formatted CPF returns the same string; pasting digits-only returns
 * the formatted equivalent.
 */
export function formatCpf(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

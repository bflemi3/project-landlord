import { isValidCnpj } from '@/lib/cnpj/validate'

/**
 * Extract all valid CNPJs from raw text.
 * Matches both formatted (XX.XXX.XXX/XXXX-XX) and unformatted (14-digit) patterns.
 * Validates each candidate using check digit algorithm.
 */
export function extractCnpjsFromText(text: string): string[] {
  const formatted = text.matchAll(
    /(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/g,
  )
  const unformatted = text.matchAll(/(?<!\d)(\d{14})(?!\d)/g)

  const candidates = new Set<string>()

  for (const match of formatted) {
    candidates.add(`${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`)
  }
  for (const match of unformatted) {
    candidates.add(match[1])
  }

  return Array.from(candidates).filter(isValidCnpj)
}

// Cached tax-id validation. Two-level cache: slice reference, then country
// (the schema dispatcher is country-keyed). See `expenses/validation.ts`.

import { getTaxIdInputSchema, type TaxIdInput } from './schemas'

export type TaxIdParse = ReturnType<ReturnType<typeof getTaxIdInputSchema>['safeParse']>

const cache = new WeakMap<TaxIdInput, Map<string, TaxIdParse>>()

export function validateTaxId(slice: TaxIdInput | undefined, countryCode: string): TaxIdParse {
  if (!slice) return getTaxIdInputSchema(countryCode).safeParse(slice)
  let inner = cache.get(slice)
  if (!inner) {
    inner = new Map()
    cache.set(slice, inner)
  }
  const cached = inner.get(countryCode)
  if (cached) return cached
  const result = getTaxIdInputSchema(countryCode).safeParse(slice)
  inner.set(countryCode, result)
  return result
}

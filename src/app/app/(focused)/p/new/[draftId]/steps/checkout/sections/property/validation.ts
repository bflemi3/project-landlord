// Cached property validation. Two-level cache: slice reference, then country
// (the schema dispatcher is country-keyed). See `expenses/validation.ts` for
// the broader pattern.

import { getPropertyInputSchema, type PropertyInput } from '@/schemas/property'

export type PropertyParse = ReturnType<
  ReturnType<typeof getPropertyInputSchema>['safeParse']
>

const cache = new WeakMap<PropertyInput, Map<string, PropertyParse>>()

export function validateProperty(
  slice: PropertyInput | undefined,
  countryCode: string,
): PropertyParse {
  if (!slice) return getPropertyInputSchema(countryCode).safeParse(slice)
  let inner = cache.get(slice)
  if (!inner) {
    inner = new Map()
    cache.set(slice, inner)
  }
  const cached = inner.get(countryCode)
  if (cached) return cached
  const result = getPropertyInputSchema(countryCode).safeParse(slice)
  inner.set(countryCode, result)
  return result
}

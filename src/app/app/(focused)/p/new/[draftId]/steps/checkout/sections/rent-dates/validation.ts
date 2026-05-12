// Cached rent-dates validation. Two-level cache: slice reference, then path
// (contract vs no_contract). See `expenses/validation.ts` for the pattern.

import type { CheckoutPath } from '../../../../state/registry'
import {
  rentDatesSchemaFor,
  type RentDatesInput,
} from './schemas'

export type RentDatesParse = ReturnType<
  ReturnType<typeof rentDatesSchemaFor>['safeParse']
>

// `null` is the pre-Step-1-commit path sentinel; encode it as a Map key so
// each (slice, path) tuple gets one cached parse.
type PathKey = CheckoutPath | 'null'

const cache = new WeakMap<RentDatesInput, Map<PathKey, RentDatesParse>>()

export function validateRentDates(
  slice: RentDatesInput | undefined,
  path: CheckoutPath | null,
): RentDatesParse {
  if (!slice) return rentDatesSchemaFor(path).safeParse(slice)
  let inner = cache.get(slice)
  if (!inner) {
    inner = new Map()
    cache.set(slice, inner)
  }
  const key: PathKey = path ?? 'null'
  const cached = inner.get(key)
  if (cached) return cached
  const result = rentDatesSchemaFor(path).safeParse(slice)
  inner.set(key, result)
  return result
}

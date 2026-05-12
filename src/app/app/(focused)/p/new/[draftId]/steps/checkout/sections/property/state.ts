import {
  defaultPropertyInput,
  PROPERTY_INPUT_FIELD_NAMES,
  type PropertyInput,
} from '@/schemas/property'

import type { PropertyCreationStateShape } from '../../../../state/store'
import { validateProperty } from './validation'

export type PropertyTouched = ReadonlySet<string>

/** Server-error slice for this section. */
export type PropertyServerErrors = Record<string, string[]>

export function defaultServerErrors(): PropertyServerErrors {
  return {}
}

/** Updater: replace the slice wholesale (server response is authoritative). */
export function applyServerErrors(slice: PropertyServerErrors) {
  return (): PropertyServerErrors => slice
}

/** Updater: drop one field's errors. Used by `setField` on user edit. */
export function clearFieldServerError(field: string) {
  return (prev: PropertyServerErrors): PropertyServerErrors => {
    if (prev[field] == null) return prev
    const next = { ...prev }
    delete next[field]
    return next
  }
}

export function isValid(state: PropertyCreationStateShape): boolean {
  const slice = state.sectionData.property as PropertyInput | undefined
  const country = slice?.country_code ?? 'BR'
  return validateProperty(slice, country).success
}

export function isDefault(slice: PropertyInput | undefined): boolean {
  if (!slice) return true
  const defaults = defaultPropertyInput()
  for (const key of PROPERTY_INPUT_FIELD_NAMES) {
    if (slice[key] !== defaults[key]) return false
  }
  return true
}

export function defaultTouched(): PropertyTouched {
  return new Set()
}

export function setAllTouched(prev: PropertyTouched): PropertyTouched {
  if (PROPERTY_INPUT_FIELD_NAMES.every((f) => prev.has(f))) return prev
  return new Set(PROPERTY_INPUT_FIELD_NAMES)
}

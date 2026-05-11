import type { PropertyInput } from '@/schemas/property'

import type { PropertyCreationStateShape } from '../../../../state/store'
import {
  TAX_ID_INPUT_FIELD_NAMES,
  type TaxIdInput,
} from './schemas'
import { validateTaxId } from './validation'

export type TaxIdSectionTouched = ReadonlySet<string>

/** Server-error slice for this section. */
export type TaxIdServerErrors = Record<string, string[]>

export function defaultTaxIdServerErrors(): TaxIdServerErrors {
  return {}
}

export function applyTaxIdServerErrors(slice: TaxIdServerErrors) {
  return (): TaxIdServerErrors => slice
}

export function clearFieldFromTaxIdServerErrors(field: string) {
  return (prev: TaxIdServerErrors): TaxIdServerErrors => {
    if (prev[field] == null) return prev
    const next = { ...prev }
    delete next[field]
    return next
  }
}

export function isValid(state: PropertyCreationStateShape): boolean {
  const country =
    (state.sectionData.property as PropertyInput | undefined)?.country_code ??
    'BR'
  return validateTaxId(state.sectionData['tax-id'] as TaxIdInput, country).success
}

export function isDefault(slice: TaxIdInput | undefined): boolean {
  return !slice || slice.tax_id === ''
}

export function defaultTouched(): TaxIdSectionTouched {
  return new Set()
}

export function setAllTouched(prev: TaxIdSectionTouched): TaxIdSectionTouched {
  if (TAX_ID_INPUT_FIELD_NAMES.every((f) => prev.has(f))) return prev
  return new Set(TAX_ID_INPUT_FIELD_NAMES)
}

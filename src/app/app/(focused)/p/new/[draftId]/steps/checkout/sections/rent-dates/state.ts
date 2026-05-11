import type { PropertyCreationStateShape } from '../../../../state/store'
import {
  defaultRentDatesInput,
  RENT_DATES_FIELD_NAMES,
  type RentDatesInput,
} from './schemas'
import { validateRentDates } from './validation'

export type RentDatesTouched = ReadonlySet<string>

/** Server-error slice for this section. */
export type RentDatesServerErrors = Record<string, string[]>

export function defaultRentDatesServerErrors(): RentDatesServerErrors {
  return {}
}

export function applyRentDatesServerErrors(slice: RentDatesServerErrors) {
  return (): RentDatesServerErrors => slice
}

export function clearFieldFromRentDatesServerErrors(field: string) {
  return (prev: RentDatesServerErrors): RentDatesServerErrors => {
    if (prev[field] == null) return prev
    const next = { ...prev }
    delete next[field]
    return next
  }
}

export function isValid(state: PropertyCreationStateShape): boolean {
  return validateRentDates(
    state.sectionData['rent-dates'] as RentDatesInput,
    state.path,
  ).success
}

export function isDefault(slice: RentDatesInput | undefined): boolean {
  if (!slice) return true
  const d = defaultRentDatesInput()
  return (
    slice.amount_minor === d.amount_minor &&
    slice.currency === d.currency &&
    slice.due_day === d.due_day &&
    slice.start_date === d.start_date &&
    slice.end_date === d.end_date
  )
}

export function defaultTouched(): RentDatesTouched {
  return new Set()
}

export function setAllTouched(prev: RentDatesTouched): RentDatesTouched {
  if (RENT_DATES_FIELD_NAMES.every((f) => prev.has(f))) return prev
  return new Set(RENT_DATES_FIELD_NAMES)
}

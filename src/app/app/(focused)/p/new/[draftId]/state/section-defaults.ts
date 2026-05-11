// Cross-section dispatchers for the store's `defaultState()` / `merge()` and
// for the exit-prompt's "is there anything worth warning about?" check.
// Each section owns its `defaultTouched()` and `isDefault()` in its own
// `state.ts`; this file is the only place that iterates them.
//
// Imports from `sections/<id>/state.ts` are runtime-safe — those files have
// no UI imports, so there's no cycle back to the store.

import * as bank from '../steps/checkout/sections/bank/state'
import * as expenses from '../steps/checkout/sections/expenses/state'
import * as property from '../steps/checkout/sections/property/state'
import * as rentDates from '../steps/checkout/sections/rent-dates/state'
import * as taxId from '../steps/checkout/sections/tax-id/state'
import * as tenants from '../steps/checkout/sections/tenants/state'

import type { SectionData } from './extraction-seeding'
import type { SectionId } from './registry'
import type { SectionServerErrors } from './types'

export function defaultSectionTouched(): Partial<Record<SectionId, unknown>> {
  return {
    property: property.defaultTouched(),
    'rent-dates': rentDates.defaultTouched(),
    tenants: tenants.defaultTouched(),
    expenses: expenses.defaultTouched(),
    'tax-id': taxId.defaultTouched(),
    bank: bank.defaultTouched(),
  }
}

/**
 * Per-section default server-error slices. Used by the store's
 * `defaultState()`. Flat sections return `{}`; row sections return `{}`.
 */
export function defaultSectionServerErrors(): Record<SectionId, SectionServerErrors> {
  return {
    property: property.defaultServerErrors(),
    'rent-dates': rentDates.defaultServerErrors(),
    tenants: tenants.defaultServerErrors(),
    expenses: expenses.defaultServerErrors(),
    'tax-id': taxId.defaultServerErrors(),
    bank: bank.defaultServerErrors(),
  }
}

/** True when any section's slice differs from its seeded default. Used by
 *  `hasWizardWork` to decide whether the exit prompt should fire. */
export function hasAnyUserSectionData(sectionData: SectionData): boolean {
  if (!property.isDefault(sectionData.property as never)) return true
  if (!rentDates.isDefault(sectionData['rent-dates'] as never)) return true
  if (!tenants.isDefault(sectionData.tenants as never)) return true
  if (!expenses.isDefault(sectionData.expenses as never)) return true
  if (!taxId.isDefault(sectionData['tax-id'] as never)) return true
  if (!bank.isDefault()) return true
  return false
}

/**
 * Cross-section dispatcher for a `ServerErrorsResponse`. Stays out of the
 * store action so the store never has to know per-section shapes — it just
 * forwards updaters via `setServerErrors(sectionId, updater)`. Each section
 * exports the `apply…ServerErrors(slice)` helper this dispatcher consumes.
 */

import * as bank from '../steps/checkout/sections/bank/state'
import * as expenses from '../steps/checkout/sections/expenses/state'
import * as property from '../steps/checkout/sections/property/state'
import * as rentDates from '../steps/checkout/sections/rent-dates/state'
import * as taxId from '../steps/checkout/sections/tax-id/state'
import * as tenants from '../steps/checkout/sections/tenants/state'

import { CHECKOUT_SECTIONS } from './registry'
import type {
  PropertyCreationActions,
  PropertyCreationStateShape,
} from './store'
import type {
  SectionId,
  SectionServerErrors,
  ServerErrorsResponse,
} from './types'

/** Returns the first `SectionId` in canonical order whose slice has any
 *  errors, or `null` if every slice is empty. */
export function firstFailingSectionId(
  sectionServerErrors: PropertyCreationStateShape['sectionServerErrors'],
): SectionId | null {
  for (const section of CHECKOUT_SECTIONS) {
    const slice = sectionServerErrors[section.id]
    if (slice && Object.keys(slice).length > 0) return section.id
  }
  return null
}

type SliceUpdater = (prev: SectionServerErrors) => SectionServerErrors

function applyUpdaterFor(id: SectionId, slice: SectionServerErrors): SliceUpdater {
  switch (id) {
    case 'property':
      return property.applyPropertyServerErrors(slice as never) as SliceUpdater
    case 'rent-dates':
      return rentDates.applyRentDatesServerErrors(slice as never) as SliceUpdater
    case 'tenants':
      return tenants.applyTenantsServerErrors(slice as never) as SliceUpdater
    case 'expenses':
      return expenses.applyExpensesServerErrors(slice as never) as SliceUpdater
    case 'tax-id':
      return taxId.applyTaxIdServerErrors(slice as never) as SliceUpdater
    case 'bank':
      return bank.applyBankServerErrors(slice as never) as SliceUpdater
    default:
      throw new Error(`Unknown SectionId: ${id}`)
  }
}

function defaultUpdaterFor(id: SectionId): SliceUpdater {
  switch (id) {
    case 'property':
      return () => property.defaultPropertyServerErrors()
    case 'rent-dates':
      return () => rentDates.defaultRentDatesServerErrors()
    case 'tenants':
      return () => tenants.defaultTenantsServerErrors()
    case 'expenses':
      return () => expenses.defaultExpensesServerErrors()
    case 'tax-id':
      return () => taxId.defaultTaxIdServerErrors()
    case 'bank':
      return () => bank.defaultBankServerErrors()
    default:
      throw new Error(`Unknown SectionId: ${id}`)
  }
}

/**
 * Apply a `ServerErrorsResponse` to the wizard store.
 *
 * - `ok: true`: reset every section's slice to its default, clear globals.
 * - `ok: false`: REPLACE each listed section's slice (per-section
 *   authoritative for that round), replace globals, mark every section
 *   with errors as visited so its validity badge surfaces.
 */
export function dispatchServerErrorsResponse(
  response: ServerErrorsResponse,
  actions: PropertyCreationActions,
): void {
  if (response.ok) {
    for (const section of CHECKOUT_SECTIONS) {
      actions.setServerErrors(section.id, defaultUpdaterFor(section.id))
    }
    actions.setGlobalErrors([])
    return
  }

  if (response.sectionErrors) {
    for (const key of Object.keys(response.sectionErrors) as SectionId[]) {
      const incoming = response.sectionErrors[key]
      if (incoming === undefined) continue
      actions.setServerErrors(key, applyUpdaterFor(key, incoming))
      actions.markSectionVisited(key)
    }
  }
  actions.setGlobalErrors(response.globalErrors ?? [])
}

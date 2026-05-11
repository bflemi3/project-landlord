/**
 * Cross-section dispatcher for a `ServerErrorsResponse`. Stays out of the
 * store action so the store never has to know per-section shapes — it just
 * forwards updaters via `setServerErrors(sectionId, updater)`. Each section
 * exports the `applyServerErrors(slice)` helper this dispatcher consumes.
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

interface SectionServerErrorsModule {
  defaultServerErrors(): SectionServerErrors
  applyServerErrors(slice: never): SliceUpdater
}

const SECTION_SERVER_ERROR_MODULES: Record<SectionId, SectionServerErrorsModule> = {
  property,
  'rent-dates': rentDates,
  tenants,
  expenses,
  'tax-id': taxId,
  bank,
}

/**
 * Apply a `ServerErrorsResponse` to the wizard store.
 *
 * - `ok: true`: clear `globalErrors` only. Section slices are NOT reset here
 *   — callers (continue actions) clear their own slice on success, and the
 *   submit success path wipes the persisted draft via `clearPersisted`.
 *   This keeps every other section's slice untouched on a one-section
 *   continue, avoiding six store writes (and an IDB persist) per click.
 * - `ok: false`: REPLACE each listed section's slice (per-section
 *   authoritative for that round), set `globalErrors`, mark every section
 *   with errors as visited so its validity badge surfaces.
 */
export function dispatchServerErrorsResponse(
  response: ServerErrorsResponse,
  actions: PropertyCreationActions,
): void {
  if (response.ok) {
    actions.setGlobalErrors([])
    return
  }

  if (response.sectionErrors) {
    for (const key of Object.keys(response.sectionErrors) as SectionId[]) {
      const incoming = response.sectionErrors[key]
      if (incoming === undefined) continue
      actions.setServerErrors(
        key,
        SECTION_SERVER_ERROR_MODULES[key].applyServerErrors(incoming as never),
      )
      actions.markSectionVisited(key)
    }
  }
  actions.setGlobalErrors(response.globalErrors ?? [])
}

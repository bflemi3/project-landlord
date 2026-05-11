/**
 * Pure-data helpers for working with the wizard's server-error slice.
 *
 * Kept out of the store action (`applyServerErrorsResponse`) so the action
 * stays pure — UI side effects (opening the first failing section, raising
 * a toast) live at the call site after the action has resolved.
 */

import { CHECKOUT_SECTIONS, type SectionId } from './registry'
import type { SectionServerErrors } from './server-errors-types'

/**
 * Returns the first `SectionId` (in canonical accordion order) whose
 * `sectionServerErrors` slice has any errors, or `null` if every slice is
 * empty.
 *
 * Canonical order is the order of `CHECKOUT_SECTIONS` in `state/registry.ts`:
 * `property` → `rent-dates` → `tenants` → `expenses` → `tax-id` → `bank`.
 *
 * Treats both flat sections (`Record<field, string[]>`) and row sections
 * (`Record<rowId, Record<field, string[]>>`) uniformly — a section "has
 * errors" iff at least one top-level key is present.
 */
export function firstFailingSectionId(
  sectionServerErrors: Record<SectionId, SectionServerErrors>,
): SectionId | null {
  for (const section of CHECKOUT_SECTIONS) {
    const slice = sectionServerErrors[section.id]
    if (slice && Object.keys(slice).length > 0) {
      return section.id
    }
  }
  return null
}

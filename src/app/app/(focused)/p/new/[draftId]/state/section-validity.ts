import * as bank from '../steps/checkout/sections/bank/state'
import * as expenses from '../steps/checkout/sections/expenses/state'
import * as property from '../steps/checkout/sections/property/state'
import * as rentDates from '../steps/checkout/sections/rent-dates/state'
import * as taxId from '../steps/checkout/sections/tax-id/state'
import * as tenants from '../steps/checkout/sections/tenants/state'

import type { SectionStatus } from './persistence'
import { CHECKOUT_SECTIONS, type SectionId } from './registry'
import type { PropertyCreationStateShape } from './store'

export type SectionValidity = SectionStatus | 'invalid'

interface SectionPredicate {
  isValid(state: PropertyCreationStateShape): boolean
}

const SECTION_PREDICATES: Record<SectionId, SectionPredicate> = {
  property,
  'rent-dates': rentDates,
  tenants,
  expenses,
  'tax-id': taxId,
  bank,
}

/**
 * Combines a section's persisted status with its schema-driven validity.
 * `'invalid'` outranks the persisted status when the schema fails AND the
 * user has engaged with the section — visited it, completed it, or skipped
 * it. An unvisited section with extracted-invalid contents stays quiet
 * until the user opens it; that's what stops Step 2 landing from yelling
 * about every section at once.
 *
 * Server errors are unconditional: a section with any entry in
 * `sectionServerErrors[sectionId]` is `'invalid'` regardless of engagement
 * — the dispatcher already adds errored sections to `visitedSectionIds`,
 * but the explicit check keeps the rule local to this function rather
 * than relying on a cross-file invariant.
 */
export function deriveSectionValidity(
  sectionId: SectionId,
  state: PropertyCreationStateShape,
): SectionValidity {
  if (hasAnyServerErrors(state.sectionServerErrors[sectionId])) {
    return 'invalid'
  }
  const status = state.sectionStates[sectionId]
  const engaged =
    status === 'completed' ||
    status === 'skipped' ||
    state.visitedSectionIds.has(sectionId)
  if (!engaged) return status
  return SECTION_PREDICATES[sectionId].isValid(state) ? status : 'invalid'
}

/**
 * Covers both flat (`Record<field, string[]>`) and row
 * (`Record<rowId, Record<field, string[]>>`) shapes. Any non-empty leaf
 * means the section has at least one server error.
 */
function hasAnyServerErrors(
  slice: PropertyCreationStateShape['sectionServerErrors'][SectionId] | undefined,
): boolean {
  if (!slice) return false
  const keys = Object.keys(slice)
  if (keys.length === 0) return false
  for (const key of keys) {
    const value = (slice as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      if (value.length > 0) return true
    } else if (value && typeof value === 'object') {
      if (Object.keys(value).length > 0) return true
    }
  }
  return false
}

/**
 * Walks every checkout section in registry order and returns its validity.
 * Used by the top progress bar and the mobile dot row to render every
 * section's status in one pass. Pair with `useShallow` to keep the returned
 * record stable when no per-section validity actually changes.
 */
export function deriveAllSectionValidities(
  state: PropertyCreationStateShape,
): Record<SectionId, SectionValidity> {
  const out = {} as Record<SectionId, SectionValidity>
  for (const section of CHECKOUT_SECTIONS) {
    out[section.id] = deriveSectionValidity(section.id, state)
  }
  return out
}

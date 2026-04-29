import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import {
  defaultPropertySectionValues,
  type PropertySectionValues,
} from '@/data/properties/property-section-schema'
import type { SectionId } from './registry'

/**
 * Re-export the canonical property-slice type + defaults so other state
 * modules (the store, the section component) can import them from here
 * without reaching into `@/data/properties/property-section-schema` directly.
 * Single source of truth for the shape lives in the schema file.
 */
export {
  defaultPropertySectionValues,
  type PropertySectionValues,
} from '@/data/properties/property-section-schema'

export type SectionData = Partial<Record<SectionId, unknown>>

/**
 * Default shape for `sectionData`. Keys are section ids; values are each
 * section's blank-state object. The store's `defaultState()` calls this so
 * every section's slice is non-undefined from the moment the store exists,
 * which means components can read their slice with a typed cast and never
 * need a `??` fallback.
 *
 * Future plans append entries here as new sections gain initial values.
 */
export function defaultSectionData(): SectionData {
  return {
    property: defaultPropertySectionValues(),
  }
}

/**
 * Folds extraction-derived values into the previous `sectionData`. Sections
 * without extractable fields are passed through unchanged. The store calls
 * this from `commitContractOutput` (when committing a non-null extraction on
 * the contract path) and from `hydrate`'s backfill path — section components
 * never invoke it.
 *
 * `name` is always `''` because the user's free-form display name doesn't
 * come from the contract; the dynamic placeholder fills the gap until they
 * type one.
 */
export function mergeExtractionIntoSectionData(
  prev: SectionData,
  extraction: ContractExtractionResult,
): SectionData {
  const a = extraction.address
  const property: PropertySectionValues = {
    name: '',
    postal_code: a?.postalCode ?? '',
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    neighborhood: a?.neighborhood ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
    country_code: 'BR',
    property_type: extraction.propertyType,
  }
  return { ...prev, property }
}

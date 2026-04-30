import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import {
  defaultPropertyInput,
  type PropertyInput,
} from '@/data/properties/schema'
import type { SectionId } from './registry'

export {
  defaultPropertyInput,
  type PropertyInput,
} from '@/data/properties/schema'

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
    property: defaultPropertyInput(),
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
  const property: PropertyInput = {
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

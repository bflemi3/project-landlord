import type {
  ContractExtractionResult,
  PropertyType,
} from '@/lib/contract-extraction/types'
import type { SectionId } from './registry'

/**
 * Initial value shape for the property section's slice of `sectionData`.
 *
 * Translation of `ContractExtractionResult` into this shape happens in the
 * store (in `commitContractOutput` and in `hydrate`'s backfill) — section
 * components never read `extractionResult` directly. They subscribe to
 * `sectionData.property` and render whatever the store has put there.
 *
 * This is a Task-1 local interface; Task 2 introduces the canonical
 * Zod-inferred replacement under `src/data/properties/property-section-schema.ts`.
 */
export interface PropertySectionInitialValues {
  name: string
  postal_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country_code: string
  property_type: PropertyType | null
}

export const defaultPropertySectionValues: PropertySectionInitialValues = {
  name: '',
  postal_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country_code: 'BR',
  property_type: null,
}

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
    property: defaultPropertySectionValues,
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
  const property: PropertySectionInitialValues = {
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

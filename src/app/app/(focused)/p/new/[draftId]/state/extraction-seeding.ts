import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import { coerceCurrency } from '@/data/shared/currency'
import {
  defaultPropertyInput,
  type PropertyInput,
} from '@/schemas/property'
import {
  defaultRentDatesInput,
  type RentDatesInput,
} from './rent-dates-schema'
import {
  defaultTaxIdInput,
  type TaxIdInput,
} from './tax-id-schema'
import {
  tenantRowFromContractParty,
  type TenantRow,
} from './tenant-row-schema'
import type { SectionId } from './registry'

export {
  defaultPropertyInput,
  type PropertyInput,
} from '@/schemas/property'
export {
  defaultRentDatesInput,
  type RentDatesInput,
} from './rent-dates-schema'
export {
  defaultTaxIdInput,
  type TaxIdInput,
} from './tax-id-schema'
export { type TenantRow } from './tenant-row-schema'

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
    'rent-dates': defaultRentDatesInput(),
    tenants: [] as TenantRow[],
    'tax-id': defaultTaxIdInput(),
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
  /** Property section */
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

  /** Rent and dates section */
  const rent = extraction.rent
  const dates = extraction.contractDates
  const rentDates: RentDatesInput = {
    ...defaultRentDatesInput(),
    amount_minor: rent?.amount,
    currency: coerceCurrency(rent?.currency),
    // Override the default (5) only when extraction actually produced a value;
    // otherwise the spread above keeps the default in place.
    ...(rent?.dueDay != null && { due_day: rent.dueDay }),
    // ContractDates already arrives as ISO YYYY-MM-DD or null. Coerce null
    // (and a missing block) to undefined so the slice keeps its "absent"
    // sentinel uniform — the picker renders empty when undefined.
    start_date: dates?.start ?? undefined,
    end_date: dates?.end ?? undefined,
  }

  /** Tenants section */
  // Each extracted ContractParty becomes a TenantRow with `isExtracted: true`.
  // No creator-filter pass here yet — the landlord verifies and prunes the
  // list manually in the section. A null/missing tenants block resets the
  // slice to an empty array, mirroring the property/rent-dates behavior.
  const tenants: TenantRow[] = (extraction.tenants ?? []).map((party) =>
    tenantRowFromContractParty(party, property.country_code),
  )

  /** Tax ID section */
  // Not seeded here — the section hydrates from `profile.tax_id` client-side
  // via `useProfile()` since extraction has no notion of "the creator".

  return { ...prev, property, 'rent-dates': rentDates, tenants }
}

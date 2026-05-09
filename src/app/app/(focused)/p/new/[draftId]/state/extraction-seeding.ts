import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import { coerceCurrency } from '@/data/shared/currency'
import {
  defaultPropertyInput,
  type PropertyInput,
} from '@/schemas/property'
import {
  defaultRentDatesInput,
  type RentDatesInput,
} from '../steps/checkout/sections/rent-dates/schemas'
import {
  defaultTaxIdInput,
  type TaxIdInput,
} from '../steps/checkout/sections/tax-id/schemas'
import {
  tenantRowFromContractParty,
  type TenantRow,
} from '../steps/checkout/sections/tenants/schemas'
import {
  expenseRowFromContractExpense,
  isSeedableExtraction,
  type ExpenseRow,
} from '../steps/checkout/sections/expenses/schemas'
import type { SectionId } from './registry'

export {
  defaultPropertyInput,
  type PropertyInput,
} from '@/schemas/property'
export {
  defaultRentDatesInput,
  type RentDatesInput,
} from '../steps/checkout/sections/rent-dates/schemas'
export {
  defaultTaxIdInput,
  type TaxIdInput,
} from '../steps/checkout/sections/tax-id/schemas'
export { type TenantRow } from '../steps/checkout/sections/tenants/schemas'
export { type ExpenseRow } from '../steps/checkout/sections/expenses/schemas'

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
    expenses: [] as ExpenseRow[],
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

  /** Expenses section */
  // Each non-bundled extracted expense becomes an ExpenseRow with
  // `isExtracted: true`. Bundled extractions (`bundledInto !== null`) are
  // dropped until Phase 1C task 8 lands the bundling UI + schema fields —
  // adding them as flat rows would mislead the landlord into thinking
  // they're separate billable items. A null/missing expenses block resets
  // the slice to an empty array, mirroring tenants.
  const expenses: ExpenseRow[] = (extraction.expenses ?? [])
    .filter(isSeedableExtraction)
    .map(expenseRowFromContractExpense)

  /** Tax ID section */
  // Not seeded here — the section hydrates from `profile.tax_id` client-side
  // via `useProfile()` since extraction has no notion of "the creator".

  return { ...prev, property, 'rent-dates': rentDates, tenants, expenses }
}

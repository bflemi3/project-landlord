/**
 * Pure charge instance generation.
 *
 * Given charge definitions with recurring rules and allocations, returns
 * charge instance rows for a specified billing period (year + month).
 *
 * No DB calls — pure data transformation. A server action (see Task 2) wraps
 * this with DB reads/writes.
 */

// =============================================================================
// Types
// =============================================================================

export interface RecurringRule {
  startDate: string // ISO date 'YYYY-MM-DD'
  endDate: string | null
  dayOfMonth: number
}

export interface AllocationRow {
  role: string
  allocation_type: string
  percentage: number | null
  fixed_minor: number | null
}

export interface ChargeDefinitionWithRule {
  id: string
  name: string
  chargeType: 'rent' | 'recurring' | 'variable'
  amountMinor: number | null
  currency: string
  isActive: boolean
  recurringRule: RecurringRule | null
  allocations: AllocationRow[]
}

export interface GeneratedInstance {
  chargeDefinitionId: string
  name: string
  amountMinor: number
  currency: string
  chargeSource: 'manual'
  splitType: 'percentage' | 'fixed_amount'
  tenantPercentage: number | null
  landlordPercentage: number | null
  tenantFixedMinor: number | null
  landlordFixedMinor: number | null
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Converts an ISO date string 'YYYY-MM-DD' to a comparable integer YYYYMM.
 * Only the year and month matter for period comparisons.
 */
function toYearMonth(isoDate: string): number {
  const [year, month] = isoDate.split('-').map(Number)
  return year * 100 + month
}

/**
 * Returns true when the charge's recurring rule is active for the given period.
 *
 * A null rule means the charge is always active (one-time / no rule).
 */
function isInPeriod(rule: RecurringRule | null, periodYear: number, periodMonth: number): boolean {
  if (rule === null) return true

  const periodKey = periodYear * 100 + periodMonth
  const startKey = toYearMonth(rule.startDate)

  if (periodKey < startKey) return false

  if (rule.endDate !== null) {
    const endKey = toYearMonth(rule.endDate)
    if (periodKey > endKey) return false
  }

  return true
}

/**
 * Maps allocation rows to the split fields on a GeneratedInstance.
 * Falls back to tenant 100% when allocations are empty.
 */
function buildSplitFields(
  allocations: AllocationRow[],
): Pick<
  GeneratedInstance,
  'splitType' | 'tenantPercentage' | 'landlordPercentage' | 'tenantFixedMinor' | 'landlordFixedMinor'
> {
  if (allocations.length === 0) {
    // Default: tenant pays 100%
    return {
      splitType: 'percentage',
      tenantPercentage: 100,
      landlordPercentage: 0,
      tenantFixedMinor: null,
      landlordFixedMinor: null,
    }
  }

  const tenantRow = allocations.find((a) => a.role === 'tenant')
  const landlordRow = allocations.find((a) => a.role === 'landlord')
  const allocationType = tenantRow?.allocation_type ?? landlordRow?.allocation_type ?? 'percentage'

  if (allocationType === 'fixed_amount') {
    return {
      splitType: 'fixed_amount',
      tenantPercentage: null,
      landlordPercentage: null,
      tenantFixedMinor: tenantRow?.fixed_minor ?? null,
      landlordFixedMinor: landlordRow?.fixed_minor ?? null,
    }
  }

  return {
    splitType: 'percentage',
    tenantPercentage: tenantRow?.percentage ?? null,
    landlordPercentage: landlordRow?.percentage ?? null,
    tenantFixedMinor: null,
    landlordFixedMinor: null,
  }
}

// =============================================================================
// Main export
// =============================================================================

/**
 * Generates charge instances for a given billing period.
 *
 * @param charges - Charge definitions with their recurring rules and allocations
 * @param periodYear - The billing period year (e.g. 2025)
 * @param periodMonth - The billing period month, 1–12 (e.g. 6 for June)
 * @returns Array of generated instance rows ready to be inserted into the DB
 */
export function generateChargeInstances(
  charges: ChargeDefinitionWithRule[],
  periodYear: number,
  periodMonth: number,
): GeneratedInstance[] {
  return charges
    .filter((charge) => charge.isActive)
    .filter((charge) => charge.amountMinor !== null)
    .filter((charge) => isInPeriod(charge.recurringRule, periodYear, periodMonth))
    .map((charge) => ({
      chargeDefinitionId: charge.id,
      name: charge.name,
      amountMinor: charge.amountMinor!,
      currency: charge.currency,
      chargeSource: 'manual' as const,
      ...buildSplitFields(charge.allocations),
    }))
}

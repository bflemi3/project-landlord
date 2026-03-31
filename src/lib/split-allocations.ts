/**
 * Charge split allocation utilities.
 *
 * Handles conversion between the app's ChargeSplit representation
 * and the database's responsibility_allocations rows.
 *
 * READ:  DB rows → ChargeSplit (parseSplit)
 * WRITE: Split params → DB rows (buildAllocationRows)
 */

// =============================================================================
// Types
// =============================================================================

export interface ChargeSplit {
  payer: 'tenant' | 'landlord' | 'split'
  allocationType: 'percentage' | 'fixed_amount'
  tenantPercent: number
  landlordPercent: number
  tenantFixedMinor: number | null
  landlordFixedMinor: number | null
}

/** A row from the responsibility_allocations table */
export interface AllocationRow {
  role: string
  allocation_type: string
  percentage: number | null
  fixed_minor: number | null
}

/** A row to write to the responsibility_allocations table */
export interface AllocationWrite {
  role: 'tenant' | 'landlord'
  allocation_type: 'percentage' | 'fixed_amount'
  percentage: number | null
  fixed_minor: number | null
}

/** Input for building allocation rows */
export interface SplitInput {
  payer: 'tenant' | 'landlord' | 'split'
  splitMode?: 'percent' | 'amount'
  tenantPercent: number
  landlordPercent: number
  tenantFixedMinor?: number | null
  landlordFixedMinor?: number | null
}

// =============================================================================
// Default
// =============================================================================

export const DEFAULT_SPLIT: ChargeSplit = {
  payer: 'tenant',
  allocationType: 'percentage',
  tenantPercent: 100,
  landlordPercent: 0,
  tenantFixedMinor: null,
  landlordFixedMinor: null,
}

// =============================================================================
// READ: DB rows → ChargeSplit
// =============================================================================

export function parseSplit(allocations: AllocationRow[]): ChargeSplit {
  if (allocations.length === 0) return DEFAULT_SPLIT

  const tenantAlloc = allocations.find((a) => a.role === 'tenant')
  const landlordAlloc = allocations.find((a) => a.role === 'landlord')
  const allocationType = (tenantAlloc?.allocation_type ?? landlordAlloc?.allocation_type ?? 'percentage') as ChargeSplit['allocationType']

  if (allocationType === 'fixed_amount') {
    const tenantFixed = tenantAlloc?.fixed_minor ?? 0
    const landlordFixed = landlordAlloc?.fixed_minor ?? 0
    const payer: ChargeSplit['payer'] =
      tenantFixed === 0 ? 'landlord' : landlordFixed === 0 ? 'tenant' : 'split'
    return { payer, allocationType, tenantPercent: 0, landlordPercent: 0, tenantFixedMinor: tenantFixed, landlordFixedMinor: landlordFixed }
  }

  const tenantPct = tenantAlloc?.percentage ?? (landlordAlloc ? 100 - (landlordAlloc.percentage ?? 0) : 100)
  const landlordPct = landlordAlloc?.percentage ?? (tenantAlloc ? 100 - (tenantAlloc.percentage ?? 0) : 0)
  const payer: ChargeSplit['payer'] =
    tenantPct === 0 ? 'landlord' : tenantPct < 100 ? 'split' : 'tenant'

  return { payer, allocationType, tenantPercent: tenantPct, landlordPercent: landlordPct, tenantFixedMinor: null, landlordFixedMinor: null }
}

// =============================================================================
// WRITE: Split params → DB rows
// =============================================================================

export function buildAllocationRows(input: SplitInput): AllocationWrite[] {
  if (input.payer === 'tenant' || input.payer === 'landlord') {
    return [
      { role: input.payer, allocation_type: 'percentage', percentage: 100, fixed_minor: null },
    ]
  }

  const isFixed = input.splitMode === 'amount'
  const allocationType = isFixed ? 'fixed_amount' as const : 'percentage' as const

  return [
    {
      role: 'tenant',
      allocation_type: allocationType,
      percentage: isFixed ? null : input.tenantPercent,
      fixed_minor: isFixed ? input.tenantFixedMinor ?? null : null,
    },
    {
      role: 'landlord',
      allocation_type: allocationType,
      percentage: isFixed ? null : input.landlordPercent,
      fixed_minor: isFixed ? input.landlordFixedMinor ?? null : null,
    },
  ]
}

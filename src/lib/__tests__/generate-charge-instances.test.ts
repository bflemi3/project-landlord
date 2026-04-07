import { describe, it, expect } from 'vitest'
import {
  generateChargeInstances,
  type ChargeDefinitionWithRule,
  type AllocationRow,
} from '../generate-charge-instances'

// =============================================================================
// Helpers
// =============================================================================

function makeCharge(
  overrides: Partial<ChargeDefinitionWithRule> = {},
): ChargeDefinitionWithRule {
  return {
    id: 'charge-1',
    name: 'Rent',
    chargeType: 'rent',
    amountMinor: 100000,
    currency: 'BRL',
    isActive: true,
    recurringRule: {
      startDate: '2025-01-01',
      endDate: null,
      dayOfMonth: 1,
    },
    allocations: [],
    ...overrides,
  }
}

const tenantOnly: AllocationRow[] = [
  { role: 'tenant', allocation_type: 'percentage', percentage: 100, fixed_minor: null },
]

const split70_30: AllocationRow[] = [
  { role: 'tenant', allocation_type: 'percentage', percentage: 70, fixed_minor: null },
  { role: 'landlord', allocation_type: 'percentage', percentage: 30, fixed_minor: null },
]

const fixedSplit: AllocationRow[] = [
  { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 40000 },
  { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 20000 },
]

// =============================================================================
// Tests
// =============================================================================

describe('generateChargeInstances', () => {
  // 1. Active fixed charge within period → generates instance
  it('generates an instance for an active charge within the period', () => {
    const charges = [makeCharge({ allocations: tenantOnly })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].chargeDefinitionId).toBe('charge-1')
    expect(result[0].name).toBe('Rent')
    expect(result[0].amountMinor).toBe(100000)
    expect(result[0].currency).toBe('BRL')
    expect(result[0].chargeSource).toBe('manual')
  })

  // 2. Inactive charge → skipped
  it('skips inactive charges', () => {
    const charges = [makeCharge({ isActive: false })]
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(0)
  })

  // 3. Charge with start_date in the future → skipped
  it('skips a charge whose recurring rule has not started yet', () => {
    const charges = [
      makeCharge({
        recurringRule: { startDate: '2025-07-01', endDate: null, dayOfMonth: 1 },
      }),
    ]
    // period is 2025-06
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(0)
  })

  // 4. Charge with end_date in the past → skipped
  it('skips a charge whose recurring rule has ended', () => {
    const charges = [
      makeCharge({
        recurringRule: { startDate: '2024-01-01', endDate: '2025-05-31', dayOfMonth: 1 },
      }),
    ]
    // period is 2025-06
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(0)
  })

  // 5. Charge on start month boundary → included
  it('includes a charge exactly on the start month boundary', () => {
    const charges = [
      makeCharge({
        recurringRule: { startDate: '2025-06-01', endDate: null, dayOfMonth: 1 },
      }),
    ]
    // period is 2025-06 (same as start month)
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(1)
  })

  // 6. Charge on end month boundary → included
  it('includes a charge exactly on the end month boundary', () => {
    const charges = [
      makeCharge({
        recurringRule: { startDate: '2024-01-01', endDate: '2025-06-30', dayOfMonth: 1 },
      }),
    ]
    // period is 2025-06 (same as end month)
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(1)
  })

  // 7. Variable charge with null amount → skipped (shows as completeness warning instead)
  it('skips variable charges with null amountMinor', () => {
    const charges = [
      makeCharge({
        chargeType: 'variable',
        amountMinor: null,
        allocations: tenantOnly,
      }),
    ]
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(0)
  })

  // 8. Split percentage allocations (70/30) → correct tenant/landlord percentages
  it('maps 70/30 percentage allocations correctly', () => {
    const charges = [makeCharge({ allocations: split70_30 })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].splitType).toBe('percentage')
    expect(result[0].tenantPercentage).toBe(70)
    expect(result[0].landlordPercentage).toBe(30)
    expect(result[0].tenantFixedMinor).toBeNull()
    expect(result[0].landlordFixedMinor).toBeNull()
  })

  // 9. Fixed amount allocations → correct splitType and fixed_minor values
  it('maps fixed amount allocations correctly', () => {
    const charges = [makeCharge({ allocations: fixedSplit })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].splitType).toBe('fixed_amount')
    expect(result[0].tenantFixedMinor).toBe(40000)
    expect(result[0].landlordFixedMinor).toBe(20000)
    expect(result[0].tenantPercentage).toBeNull()
    expect(result[0].landlordPercentage).toBeNull()
  })

  // 10. Multiple charges → all generate instances
  it('generates instances for all eligible charges', () => {
    const charges = [
      makeCharge({ id: 'charge-1', name: 'Rent', allocations: tenantOnly }),
      makeCharge({ id: 'charge-2', name: 'Water', allocations: split70_30 }),
      makeCharge({ id: 'charge-3', name: 'Electricity', allocations: fixedSplit }),
    ]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.chargeDefinitionId)).toEqual(['charge-1', 'charge-2', 'charge-3'])
  })

  // 11. No allocations → defaults to tenant 100%
  it('defaults to tenant 100% when no allocations are provided', () => {
    const charges = [makeCharge({ allocations: [] })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].splitType).toBe('percentage')
    expect(result[0].tenantPercentage).toBe(100)
    expect(result[0].landlordPercentage).toBe(0)
    expect(result[0].tenantFixedMinor).toBeNull()
    expect(result[0].landlordFixedMinor).toBeNull()
  })

  // 14. Landlord-only allocation → tenant should be the complement (0%), not null
  it('derives tenant percentage as complement when only landlord allocation exists', () => {
    const landlordOnly: AllocationRow[] = [
      { role: 'landlord', allocation_type: 'percentage', percentage: 100, fixed_minor: null },
    ]
    const charges = [makeCharge({ allocations: landlordOnly })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].splitType).toBe('percentage')
    expect(result[0].landlordPercentage).toBe(100)
    expect(result[0].tenantPercentage).toBe(0) // NOT null
  })

  // 15. Tenant-only allocation → landlord should be the complement (0%), not null
  it('derives landlord percentage as complement when only tenant allocation exists', () => {
    const charges = [makeCharge({ allocations: tenantOnly })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result).toHaveLength(1)
    expect(result[0].splitType).toBe('percentage')
    expect(result[0].tenantPercentage).toBe(100)
    expect(result[0].landlordPercentage).toBe(0) // NOT null
  })

  // 16. Single-party partial allocation → complement is derived
  it('derives complement for partial landlord-only allocation (landlord 60% → tenant 40%)', () => {
    const partialLandlord: AllocationRow[] = [
      { role: 'landlord', allocation_type: 'percentage', percentage: 60, fixed_minor: null },
    ]
    const charges = [makeCharge({ allocations: partialLandlord })]
    const result = generateChargeInstances(charges, 2025, 6)

    expect(result[0].landlordPercentage).toBe(60)
    expect(result[0].tenantPercentage).toBe(40)
  })

  // 12. Charge with null recurringRule → always included (one-time / no rule)
  it('includes charges with null recurringRule regardless of period', () => {
    const charges = [makeCharge({ recurringRule: null, allocations: tenantOnly })]
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(1)
  })

  // 13. Mixed active/inactive with filtering
  it('filters inactive charges while including active ones', () => {
    const charges = [
      makeCharge({ id: 'active-1', isActive: true, allocations: tenantOnly }),
      makeCharge({ id: 'inactive-1', isActive: false }),
      makeCharge({ id: 'active-2', isActive: true, allocations: tenantOnly }),
    ]
    const result = generateChargeInstances(charges, 2025, 6)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.chargeDefinitionId)).toEqual(['active-1', 'active-2'])
  })
})

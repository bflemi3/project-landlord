import { describe, it, expect } from 'vitest'
import { computeInstanceTotals, type ChargeInstanceRow } from '../recalculate-total'

function makeInstance(overrides: Partial<ChargeInstanceRow> = {}): ChargeInstanceRow {
  return {
    amount_minor: 100000,
    split_type: 'percentage',
    tenant_percentage: 100,
    landlord_percentage: 0,
    tenant_fixed_minor: null,
    landlord_fixed_minor: null,
    ...overrides,
  }
}

describe('computeInstanceTotals', () => {
  it('computes 100% tenant correctly', () => {
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 630000, tenant_percentage: 100, landlord_percentage: 0 }),
    ])
    expect(result.total).toBe(630000)
    expect(result.tenantTotal).toBe(630000)
    expect(result.landlordTotal).toBe(0)
  })

  it('computes 50/50 split correctly', () => {
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 18000, tenant_percentage: 50, landlord_percentage: 50 }),
    ])
    expect(result.total).toBe(18000)
    expect(result.tenantTotal).toBe(9000)
    expect(result.landlordTotal).toBe(9000)
  })

  it('computes 100% landlord correctly', () => {
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 60000, tenant_percentage: 0, landlord_percentage: 100 }),
    ])
    expect(result.total).toBe(60000)
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(60000)
  })

  it('derives tenant as complement when tenant_percentage is null', () => {
    // Landlord pays 100%, tenant_percentage is null → tenant should be 0%
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 60000, tenant_percentage: null, landlord_percentage: 100 }),
    ])
    expect(result.total).toBe(60000)
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(60000)
  })

  it('derives landlord as complement when landlord_percentage is null', () => {
    // Tenant pays 100%, landlord_percentage is null → landlord should be 0%
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 630000, tenant_percentage: 100, landlord_percentage: null }),
    ])
    expect(result.total).toBe(630000)
    expect(result.tenantTotal).toBe(630000)
    expect(result.landlordTotal).toBe(0)
  })

  it('tenant + landlord totals always equal total for percentage splits', () => {
    // Reproduces the production bug: mixed null percentages
    const instances = [
      makeInstance({ amount_minor: 630000, tenant_percentage: 100, landlord_percentage: null }),  // Rent
      makeInstance({ amount_minor: 60000, tenant_percentage: null, landlord_percentage: 100 }),   // Condo fee
      makeInstance({ amount_minor: 12000, tenant_percentage: null, landlord_percentage: 100 }),   // Internet
      makeInstance({ amount_minor: 18000, tenant_percentage: 50, landlord_percentage: 50 }),      // Cleaning
      makeInstance({ amount_minor: 21800, tenant_percentage: 100, landlord_percentage: 0 }),      // Electric
      makeInstance({ amount_minor: 7300, tenant_percentage: 100, landlord_percentage: 0 }),       // Water
      makeInstance({ amount_minor: 15000, tenant_percentage: 100, landlord_percentage: 0 }),      // Gas
    ]
    const result = computeInstanceTotals(instances)

    expect(result.total).toBe(764100)
    expect(result.landlordTotal).toBe(81000)  // 60000 + 12000 + 9000
    expect(result.tenantTotal).toBe(683100)   // 764100 - 81000
    expect(result.tenantTotal + result.landlordTotal).toBe(result.total)
  })

  it('computes fixed_amount splits correctly', () => {
    const result = computeInstanceTotals([
      makeInstance({
        amount_minor: 60000,
        split_type: 'fixed_amount',
        tenant_percentage: null,
        landlord_percentage: null,
        tenant_fixed_minor: 40000,
        landlord_fixed_minor: 20000,
      }),
    ])
    expect(result.total).toBe(60000)
    expect(result.tenantTotal).toBe(40000)
    expect(result.landlordTotal).toBe(20000)
  })

  it('defaults both to null → tenant 100% landlord 0%', () => {
    const result = computeInstanceTotals([
      makeInstance({ amount_minor: 50000, tenant_percentage: null, landlord_percentage: null }),
    ])
    expect(result.total).toBe(50000)
    expect(result.tenantTotal).toBe(50000)
    expect(result.landlordTotal).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { parseSplit, buildAllocationRows, DEFAULT_SPLIT, type AllocationRow, type SplitInput } from '../split-allocations'

// =============================================================================
// parseSplit — DB rows → ChargeSplit
// =============================================================================

describe('parseSplit', () => {
  it('returns DEFAULT_SPLIT for empty allocations', () => {
    expect(parseSplit([])).toEqual(DEFAULT_SPLIT)
  })

  // -- Percentage splits --

  it('parses tenant 100% (single row)', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'percentage', percentage: 100, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('tenant')
    expect(result.allocationType).toBe('percentage')
    expect(result.tenantPercent).toBe(100)
    expect(result.landlordPercent).toBe(0)
  })

  it('parses landlord 100% (single row)', () => {
    const rows: AllocationRow[] = [
      { role: 'landlord', allocation_type: 'percentage', percentage: 100, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('landlord')
    expect(result.tenantPercent).toBe(0)
    expect(result.landlordPercent).toBe(100)
  })

  it('parses percentage split 67/33', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'percentage', percentage: 67, fixed_minor: null },
      { role: 'landlord', allocation_type: 'percentage', percentage: 33, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('split')
    expect(result.allocationType).toBe('percentage')
    expect(result.tenantPercent).toBe(67)
    expect(result.landlordPercent).toBe(33)
    expect(result.tenantFixedMinor).toBeNull()
    expect(result.landlordFixedMinor).toBeNull()
  })

  it('parses percentage split 50/50', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'percentage', percentage: 50, fixed_minor: null },
      { role: 'landlord', allocation_type: 'percentage', percentage: 50, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('split')
    expect(result.tenantPercent).toBe(50)
    expect(result.landlordPercent).toBe(50)
  })

  it('derives landlord percent when only tenant row exists', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'percentage', percentage: 70, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('split')
    expect(result.tenantPercent).toBe(70)
    expect(result.landlordPercent).toBe(30)
  })

  it('derives tenant percent when only landlord row exists', () => {
    const rows: AllocationRow[] = [
      { role: 'landlord', allocation_type: 'percentage', percentage: 40, fixed_minor: null },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('split')
    expect(result.tenantPercent).toBe(60)
    expect(result.landlordPercent).toBe(40)
  })

  // -- Fixed amount splits --

  it('parses fixed amount split 40000/20000', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 40000 },
      { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 20000 },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('split')
    expect(result.allocationType).toBe('fixed_amount')
    expect(result.tenantFixedMinor).toBe(40000)
    expect(result.landlordFixedMinor).toBe(20000)
    expect(result.tenantPercent).toBe(0)
    expect(result.landlordPercent).toBe(0)
  })

  it('parses fixed amount where tenant pays 0 → landlord payer', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 0 },
      { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 60000 },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('landlord')
  })

  it('parses fixed amount where landlord pays 0 → tenant payer', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 60000 },
      { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 0 },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('tenant')
  })

  it('handles missing fixed_minor as 0', () => {
    const rows: AllocationRow[] = [
      { role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: null },
      { role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 50000 },
    ]
    const result = parseSplit(rows)
    expect(result.payer).toBe('landlord')
    expect(result.tenantFixedMinor).toBe(0)
    expect(result.landlordFixedMinor).toBe(50000)
  })
})

// =============================================================================
// buildAllocationRows — Split params → DB rows
// =============================================================================

describe('buildAllocationRows', () => {
  it('builds single tenant allocation for payer=tenant', () => {
    const input: SplitInput = { payer: 'tenant', tenantPercent: 100, landlordPercent: 0 }
    const rows = buildAllocationRows(input)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ role: 'tenant', allocation_type: 'percentage', percentage: 100, fixed_minor: null })
  })

  it('builds single landlord allocation for payer=landlord', () => {
    const input: SplitInput = { payer: 'landlord', tenantPercent: 0, landlordPercent: 100 }
    const rows = buildAllocationRows(input)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ role: 'landlord', allocation_type: 'percentage', percentage: 100, fixed_minor: null })
  })

  it('builds percentage split rows', () => {
    const input: SplitInput = { payer: 'split', splitMode: 'percent', tenantPercent: 67, landlordPercent: 33 }
    const rows = buildAllocationRows(input)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ role: 'tenant', allocation_type: 'percentage', percentage: 67, fixed_minor: null })
    expect(rows[1]).toEqual({ role: 'landlord', allocation_type: 'percentage', percentage: 33, fixed_minor: null })
  })

  it('builds fixed amount split rows', () => {
    const input: SplitInput = {
      payer: 'split',
      splitMode: 'amount',
      tenantPercent: 0,
      landlordPercent: 0,
      tenantFixedMinor: 40000,
      landlordFixedMinor: 20000,
    }
    const rows = buildAllocationRows(input)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ role: 'tenant', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 40000 })
    expect(rows[1]).toEqual({ role: 'landlord', allocation_type: 'fixed_amount', percentage: null, fixed_minor: 20000 })
  })

  it('handles missing fixed amounts as null', () => {
    const input: SplitInput = {
      payer: 'split',
      splitMode: 'amount',
      tenantPercent: 0,
      landlordPercent: 0,
    }
    const rows = buildAllocationRows(input)
    expect(rows[0].fixed_minor).toBeNull()
    expect(rows[1].fixed_minor).toBeNull()
  })

  // -- Round-trip tests: build → parse should produce consistent results --

  it('round-trips tenant 100%', () => {
    const input: SplitInput = { payer: 'tenant', tenantPercent: 100, landlordPercent: 0 }
    const rows = buildAllocationRows(input)
    const split = parseSplit(rows)
    expect(split.payer).toBe('tenant')
    expect(split.tenantPercent).toBe(100)
  })

  it('round-trips landlord 100%', () => {
    const input: SplitInput = { payer: 'landlord', tenantPercent: 0, landlordPercent: 100 }
    const rows = buildAllocationRows(input)
    const split = parseSplit(rows)
    expect(split.payer).toBe('landlord')
  })

  it('round-trips percentage split 70/30', () => {
    const input: SplitInput = { payer: 'split', splitMode: 'percent', tenantPercent: 70, landlordPercent: 30 }
    const rows = buildAllocationRows(input)
    const split = parseSplit(rows)
    expect(split.payer).toBe('split')
    expect(split.allocationType).toBe('percentage')
    expect(split.tenantPercent).toBe(70)
    expect(split.landlordPercent).toBe(30)
  })

  it('round-trips fixed amount split R$400/R$200', () => {
    const input: SplitInput = {
      payer: 'split',
      splitMode: 'amount',
      tenantPercent: 0,
      landlordPercent: 0,
      tenantFixedMinor: 40000,
      landlordFixedMinor: 20000,
    }
    const rows = buildAllocationRows(input)
    const split = parseSplit(rows)
    expect(split.payer).toBe('split')
    expect(split.allocationType).toBe('fixed_amount')
    expect(split.tenantFixedMinor).toBe(40000)
    expect(split.landlordFixedMinor).toBe(20000)
  })
})

import { describe, it, expect } from 'vitest'
import {
  computeFinancialSummary,
  estimateFromDefinitions,
  type StatementSummary,
  type ChargeSummary,
} from '../financial-summary'

const charges: ChargeSummary[] = [
  {
    amountMinor: 320000, // Rent R$3,200
    split: { allocationType: 'percentage', tenantPercent: 100, landlordPercent: 0, tenantFixedMinor: null, landlordFixedMinor: null },
  },
  {
    amountMinor: 60000, // Condo R$600, fixed split
    split: { allocationType: 'fixed_amount', tenantPercent: 0, landlordPercent: 0, tenantFixedMinor: 40000, landlordFixedMinor: 20000 },
  },
  {
    amountMinor: null, // Variable charge — skipped
    split: { allocationType: 'percentage', tenantPercent: 100, landlordPercent: 0, tenantFixedMinor: null, landlordFixedMinor: null },
  },
]

describe('estimateFromDefinitions', () => {
  it('sums tenant/landlord portions from charge splits', () => {
    const result = estimateFromDefinitions(charges)
    expect(result.total).toBe(380000) // 320000 + 60000
    expect(result.tenantTotal).toBe(360000) // 320000 + 40000
    expect(result.landlordTotal).toBe(20000) // 0 + 20000
  })

  it('skips charges with null amountMinor', () => {
    const result = estimateFromDefinitions([
      { amountMinor: null, split: { allocationType: 'percentage', tenantPercent: 100, landlordPercent: 0, tenantFixedMinor: null, landlordFixedMinor: null } },
    ])
    expect(result.total).toBe(0)
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(0)
  })

  it('handles 50/50 percentage split', () => {
    const result = estimateFromDefinitions([
      { amountMinor: 10000, split: { allocationType: 'percentage', tenantPercent: 50, landlordPercent: 50, tenantFixedMinor: null, landlordFixedMinor: null } },
    ])
    expect(result.tenantTotal).toBe(5000)
    expect(result.landlordTotal).toBe(5000)
  })

  it('handles 100% landlord pays', () => {
    const result = estimateFromDefinitions([
      { amountMinor: 12000, split: { allocationType: 'percentage', tenantPercent: 0, landlordPercent: 100, tenantFixedMinor: null, landlordFixedMinor: null } },
    ])
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(12000)
    expect(result.total).toBe(12000)
  })

  it('returns zeros for empty charges', () => {
    const result = estimateFromDefinitions([])
    expect(result.total).toBe(0)
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(0)
  })

  it('returns zeros when all charges are variable (null amounts)', () => {
    const result = estimateFromDefinitions([
      { amountMinor: null, split: { allocationType: 'percentage', tenantPercent: 100, landlordPercent: 0, tenantFixedMinor: null, landlordFixedMinor: null } },
      { amountMinor: null, split: { allocationType: 'percentage', tenantPercent: 70, landlordPercent: 30, tenantFixedMinor: null, landlordFixedMinor: null } },
    ])
    expect(result.total).toBe(0)
    expect(result.tenantTotal).toBe(0)
  })

  it('rounds correctly for odd percentage splits', () => {
    // 33% of 10000 = 3333.33 → rounds to 3333
    const result = estimateFromDefinitions([
      { amountMinor: 10000, split: { allocationType: 'percentage', tenantPercent: 33, landlordPercent: 67, tenantFixedMinor: null, landlordFixedMinor: null } },
    ])
    expect(result.tenantTotal).toBe(3300)
    expect(result.landlordTotal).toBe(6700)
  })
})

describe('computeFinancialSummary', () => {
  it('uses current statement when available (source: statement)', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 4, totalAmountMinor: 465000, tenantTotalMinor: 408500 },
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    expect(result.source).toBe('statement')
    expect(result.tenantTotal).toBe(408500)
    expect(result.landlordTotal).toBe(56500)
    expect(result.total).toBe(465000)
  })

  it('uses rolling average of last 3 statements when no current (source: average)', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 3, totalAmountMinor: 400000, tenantTotalMinor: 350000 },
      { periodYear: 2026, periodMonth: 2, totalAmountMinor: 420000, tenantTotalMinor: 370000 },
      { periodYear: 2026, periodMonth: 1, totalAmountMinor: 380000, tenantTotalMinor: 330000 },
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    expect(result.source).toBe('average')
    expect(result.tenantTotal).toBe(350000) // (350000 + 370000 + 330000) / 3
    expect(result.total).toBe(400000) // (400000 + 420000 + 380000) / 3
    expect(result.landlordTotal).toBe(50000)
  })

  it('averages only available statements if fewer than 3', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 3, totalAmountMinor: 400000, tenantTotalMinor: 350000 },
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    expect(result.source).toBe('average')
    expect(result.tenantTotal).toBe(350000)
    expect(result.total).toBe(400000)
  })

  it('falls back to charge definitions when no statements exist (source: estimate)', () => {
    const result = computeFinancialSummary([], charges, 2026, 4)
    expect(result.source).toBe('estimate')
    expect(result.tenantTotal).toBe(360000)
    expect(result.landlordTotal).toBe(20000)
    expect(result.total).toBe(380000)
  })

  it('excludes current period from rolling average', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 4, totalAmountMinor: 500000, tenantTotalMinor: 450000 }, // current — used as statement
      { periodYear: 2026, periodMonth: 3, totalAmountMinor: 400000, tenantTotalMinor: 350000 }, // past
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    // Should use current statement, not average
    expect(result.source).toBe('statement')
    expect(result.tenantTotal).toBe(450000)
  })

  it('uses only most recent 3 past statements when more exist', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 3, totalAmountMinor: 400000, tenantTotalMinor: 350000 },
      { periodYear: 2026, periodMonth: 2, totalAmountMinor: 420000, tenantTotalMinor: 370000 },
      { periodYear: 2026, periodMonth: 1, totalAmountMinor: 380000, tenantTotalMinor: 330000 },
      { periodYear: 2025, periodMonth: 12, totalAmountMinor: 500000, tenantTotalMinor: 480000 }, // should be excluded
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    expect(result.source).toBe('average')
    // Only first 3: (350000 + 370000 + 330000) / 3 = 350000
    expect(result.tenantTotal).toBe(350000)
    expect(result.total).toBe(400000) // (400000 + 420000 + 380000) / 3
  })

  it('averages 2 past statements correctly', () => {
    const statements: StatementSummary[] = [
      { periodYear: 2026, periodMonth: 3, totalAmountMinor: 400000, tenantTotalMinor: 350000 },
      { periodYear: 2026, periodMonth: 2, totalAmountMinor: 420000, tenantTotalMinor: 370000 },
    ]

    const result = computeFinancialSummary(statements, charges, 2026, 4)
    expect(result.source).toBe('average')
    expect(result.tenantTotal).toBe(360000) // (350000 + 370000) / 2
    expect(result.total).toBe(410000) // (400000 + 420000) / 2
  })

  it('returns zeros when no statements and no charges', () => {
    const result = computeFinancialSummary([], [], 2026, 4)
    expect(result.source).toBe('estimate')
    expect(result.tenantTotal).toBe(0)
    expect(result.landlordTotal).toBe(0)
    expect(result.total).toBe(0)
  })
})

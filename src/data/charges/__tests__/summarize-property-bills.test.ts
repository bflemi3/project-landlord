import { describe, expect, it } from 'vitest'

import {
  addMonths,
  isInMonth,
  monthStartISO,
  summarizePropertyBills,
  type Bill,
  type SummarizeInput,
} from '../shared'

const bill = (over: Partial<Bill>): Bill => ({
  id: over.id ?? `bill-${Math.random().toString(36).slice(2)}`,
  charge_definition_id: 'd',
  name: 'n',
  amount_minor: 0,
  currency: 'BRL',
  issued_on: '2026-06-05',
  due_date: null,
  landlord_percentage: 0,
  tenant_percentage: 10000,
  payments: [],
  splits: [],
  ...over,
})

const JUNE = { year: 2026, month: 6 }
const TODAY = '2026-06-10'

const summarize = (over: Partial<SummarizeInput>) =>
  summarizePropertyBills({
    carryInBills: [],
    recentBills: [],
    monthPayments: [],
    activeDefinitions: [],
    month: JUNE,
    today: TODAY,
    viewer: null,
    ...over,
  })

describe('month helpers', () => {
  it('formats month starts and crosses year boundaries', () => {
    expect(monthStartISO(JUNE)).toBe('2026-06-01')
    expect(addMonths(JUNE, -3)).toEqual({ year: 2026, month: 3 })
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths({ year: 2025, month: 12 }, 1)).toEqual({ year: 2026, month: 1 })
  })

  it('matches dates to their calendar month', () => {
    expect(isInMonth('2026-06-30', JUNE)).toBe(true)
    expect(isInMonth('2026-07-01', JUNE)).toBe(false)
  })
})

describe('due — concrete unpaid bills, current month + carry-ins', () => {
  it('sums outstanding of month bills and carry-ins, ignoring history bills', () => {
    const result = summarize({
      carryInBills: [bill({ issued_on: '2026-05-02', amount_minor: 18000 })],
      recentBills: [
        bill({ issued_on: '2026-06-05', amount_minor: 32000 }),
        // history (May, paid) — feeds estimates, never Due
        bill({ issued_on: '2026-05-10', amount_minor: 9000 }),
      ],
    })
    expect(result.property.dueMinor).toBe(50000)
  })

  it('reduces due by partial payments and floors overpaid bills at zero', () => {
    const result = summarize({
      recentBills: [
        bill({
          amount_minor: 10000,
          payments: [{ amount_minor: 4000, paid_on: '2026-06-06', paid_by: 'a' }],
        }),
        bill({
          amount_minor: 5000,
          payments: [{ amount_minor: 6000, paid_on: '2026-06-06', paid_by: 'a' }],
        }),
      ],
    })
    expect(result.property.dueMinor).toBe(6000)
  })
})

describe('overdue — the past-due subset of due', () => {
  it('counts outstanding past due_date and lists the source bills oldest first', () => {
    const result = summarize({
      carryInBills: [
        bill({
          id: 'old',
          name: 'Vivo',
          issued_on: '2026-05-02',
          due_date: '2026-05-15',
          amount_minor: 18000,
        }),
      ],
      recentBills: [
        bill({
          id: 'new',
          name: 'ENEL',
          issued_on: '2026-06-01',
          due_date: '2026-06-08',
          amount_minor: 32000,
        }),
        bill({ issued_on: '2026-06-05', due_date: '2026-06-20', amount_minor: 9500 }),
      ],
    })
    expect(result.property.overdueMinor).toBe(50000)
    expect(result.overdueBills.map((b) => b.id)).toEqual(['old', 'new'])
  })

  it('never marks NULL due_date overdue, and a due_date of today is not overdue', () => {
    const result = summarize({
      carryInBills: [bill({ issued_on: '2026-05-02', due_date: null, amount_minor: 18000 })],
      recentBills: [bill({ due_date: TODAY, amount_minor: 5000 })],
    })
    expect(result.property.dueMinor).toBe(23000)
    expect(result.property.overdueMinor).toBe(0)
    expect(result.overdueBills).toEqual([])
  })

  it('drops a bill from overdue once fully paid', () => {
    const result = summarize({
      recentBills: [
        bill({
          amount_minor: 10000,
          due_date: '2026-06-08',
          payments: [{ amount_minor: 10000, paid_on: '2026-06-09', paid_by: 'a' }],
        }),
      ],
    })
    expect(result.property.overdueMinor).toBe(0)
  })
})

describe('paid — payments dated this month', () => {
  it('sums month payments including ones settling old bills', () => {
    const result = summarize({
      monthPayments: [
        { amount_minor: 48000, paid_on: '2026-06-04', paid_by: 'll' },
        // settles a May bill, paid in June → counts
        { amount_minor: 18000, paid_on: '2026-06-12', paid_by: 'tt' },
      ],
    })
    expect(result.property.paidMinor).toBe(66000)
  })
})

describe('viewer totals', () => {
  it("computes the landlord's due/overdue from their percentage and own payments", () => {
    const result = summarize({
      recentBills: [
        // 50/50 split, tenant already paid their half → remaining outstanding is all LL's
        bill({
          amount_minor: 32000,
          landlord_percentage: 5000,
          tenant_percentage: 5000,
          due_date: '2026-06-08',
          payments: [{ amount_minor: 16000, paid_on: '2026-06-07', paid_by: 'tt' }],
        }),
        // 100% tenant bill — not the landlord's
        bill({ amount_minor: 9500, landlord_percentage: 0, tenant_percentage: 10000 }),
      ],
      viewer: { userId: 'll', role: 'landlord' },
    })
    expect(result.viewer).toEqual({
      dueMinor: 16000,
      overdueMinor: 16000,
      paidMinor: 0,
      hasResponsibility: true,
    })
  })

  it("caps the viewer's due at the bill outstanding when the other side settled it", () => {
    const result = summarize({
      recentBills: [
        bill({
          amount_minor: 32000,
          landlord_percentage: 5000,
          tenant_percentage: 5000,
          payments: [{ amount_minor: 32000, paid_on: '2026-06-07', paid_by: 'tt' }],
        }),
      ],
      viewer: { userId: 'll', role: 'landlord' },
    })
    expect(result.viewer?.dueMinor).toBe(0)
  })

  it('scales a tenant by their split row and filters paid to their own payments', () => {
    const result = summarize({
      recentBills: [
        bill({
          amount_minor: 30000,
          landlord_percentage: 0,
          tenant_percentage: 10000,
          splits: [
            { userId: 't1', percentage: 50 },
            { userId: 't2', percentage: 50 },
          ],
        }),
      ],
      monthPayments: [
        { amount_minor: 4000, paid_on: '2026-06-08', paid_by: 't1' },
        { amount_minor: 2000, paid_on: '2026-06-08', paid_by: 't2' },
      ],
      viewer: { userId: 't1', role: 'tenant' },
    })
    expect(result.viewer?.dueMinor).toBe(15000)
    expect(result.viewer?.paidMinor).toBe(4000)
  })

  it('reports hasResponsibility false when every bill is the other side’s', () => {
    const result = summarize({
      recentBills: [bill({ amount_minor: 9500, landlord_percentage: 0, tenant_percentage: 10000 })],
      viewer: { userId: 'll', role: 'landlord' },
    })
    expect(result.viewer?.hasResponsibility).toBe(false)
    expect(result.viewer?.dueMinor).toBe(0)
  })

  it('scopes the overdue banner amounts to the viewer', () => {
    const result = summarize({
      carryInBills: [
        bill({
          id: 'vivo',
          amount_minor: 18000,
          landlord_percentage: 5000,
          tenant_percentage: 5000,
          issued_on: '2026-05-02',
          due_date: '2026-05-15',
        }),
      ],
      viewer: { userId: 'll', role: 'landlord' },
    })
    expect(result.overdueBills[0]).toMatchObject({
      id: 'vivo',
      outstandingMinor: 18000,
      viewerOutstandingMinor: 9000,
    })
  })
})

describe('awaiting — active definitions not yet seen this month', () => {
  const defs = [
    { id: 'gas', name: 'Gás', expense_type: 'gas' },
    { id: 'enel', name: 'Energia', expense_type: 'electricity' },
  ] as SummarizeInput['activeDefinitions']

  it('excludes definitions with an instance this month; carry-ins do not count as seen', () => {
    const result = summarize({
      activeDefinitions: defs,
      carryInBills: [
        bill({ charge_definition_id: 'gas', issued_on: '2026-05-03', amount_minor: 11000 }),
      ],
      recentBills: [
        bill({ charge_definition_id: 'enel', issued_on: '2026-06-03', amount_minor: 32000 }),
      ],
    })
    expect(result.awaiting.count).toBe(1)
    expect(result.awaiting.charges[0].definitionId).toBe('gas')
  })

  it('estimates from the average of prior monthly totals, summing within a month', () => {
    const result = summarize({
      activeDefinitions: [defs[0]],
      recentBills: [
        bill({ charge_definition_id: 'gas', issued_on: '2026-03-05', amount_minor: 10000 }),
        // two April instances sum to one month total
        bill({ charge_definition_id: 'gas', issued_on: '2026-04-05', amount_minor: 7000 }),
        bill({ charge_definition_id: 'gas', issued_on: '2026-04-20', amount_minor: 5000 }),
      ],
    })
    // (10000 + 12000) / 2 months
    expect(result.awaiting.charges[0].estimateMinor).toBe(11000)
    expect(result.awaiting.estimateMinor).toBe(11000)
    expect(result.awaiting.hasUnknown).toBe(false)
  })

  it('marks definitions with no history as unknown but keeps known estimates summed', () => {
    const result = summarize({
      activeDefinitions: defs,
      recentBills: [
        bill({ charge_definition_id: 'enel', issued_on: '2026-05-03', amount_minor: 30000 }),
      ],
    })
    expect(result.awaiting.count).toBe(2)
    expect(result.awaiting.hasUnknown).toBe(true)
    expect(result.awaiting.estimateMinor).toBe(30000)
  })
})

describe('currency', () => {
  it('takes the first concrete bill currency and falls back to BRL', () => {
    expect(summarize({}).currency).toBe('BRL')
    expect(
      summarize({ recentBills: [bill({ currency: 'USD', amount_minor: 100 })] }).currency,
    ).toBe('USD')
  })
})

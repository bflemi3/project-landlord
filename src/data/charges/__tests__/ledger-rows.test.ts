import { describe, expect, it } from 'vitest'

import { buildCurrentMonthLedger, ledgerBillStatus, type Bill } from '../shared'

const bill = (over: Partial<Bill>): Bill => ({
  id: over.id ?? `bill-${Math.random().toString(36).slice(2)}`,
  charge_definition_id: 'd',
  name: 'n',
  amount_minor: 10000,
  currency: 'BRL',
  issued_on: '2026-06-05',
  due_date: null,
  landlord_percentage: 0,
  tenant_percentage: 10000,
  payments: [],
  splits: [],
  ...over,
})

const TODAY = '2026-06-10'

describe('ledgerBillStatus', () => {
  it('is paid when nothing is outstanding', () => {
    const b = bill({
      amount_minor: 10000,
      due_date: '2026-06-01',
      payments: [{ amount_minor: 10000, paid_on: '2026-06-02', paid_by: 'u' }],
    })
    expect(ledgerBillStatus(b, TODAY)).toBe('paid')
  })

  it('is overdue when outstanding past the due date', () => {
    expect(ledgerBillStatus(bill({ due_date: '2026-06-09' }), TODAY)).toBe('overdue')
  })

  it('is due when outstanding with a future, today, or NULL due date', () => {
    expect(ledgerBillStatus(bill({ due_date: '2026-06-20' }), TODAY)).toBe('due')
    expect(ledgerBillStatus(bill({ due_date: TODAY }), TODAY)).toBe('due')
    expect(ledgerBillStatus(bill({ due_date: null }), TODAY)).toBe('due')
  })

  it('treats a partial payment as still due, not paid', () => {
    const b = bill({
      amount_minor: 10000,
      due_date: '2026-06-20',
      payments: [{ amount_minor: 4000, paid_on: '2026-06-06', paid_by: 'u' }],
    })
    expect(ledgerBillStatus(b, TODAY)).toBe('due')
  })
})

describe('buildCurrentMonthLedger', () => {
  it('groups rows Overdue → Due → Paid and passes awaiting through', () => {
    const overdueCarryIn = bill({ id: 'a', issued_on: '2026-05-02', due_date: '2026-05-15' })
    const dueBill = bill({ id: 'b', due_date: '2026-06-20' })
    const paidBill = bill({
      id: 'c',
      payments: [{ amount_minor: 10000, paid_on: '2026-06-03', paid_by: 'u' }],
    })
    const awaiting = [{ definitionId: 'gas', name: 'Gás', estimateMinor: 11000 }]

    const ledger = buildCurrentMonthLedger({
      carryInBills: [overdueCarryIn],
      monthBills: [dueBill, paidBill],
      awaitingCharges: awaiting,
      today: TODAY,
    })
    expect(ledger.overdue.map((b) => b.id)).toEqual(['a'])
    expect(ledger.due.map((b) => b.id)).toEqual(['b'])
    expect(ledger.paid.map((b) => b.id)).toEqual(['c'])
    expect(ledger.awaiting).toEqual(awaiting)
  })

  it('sorts overdue and due by due date ascending with NULL due dates last', () => {
    const ledger = buildCurrentMonthLedger({
      carryInBills: [bill({ id: 'older', issued_on: '2026-04-02', due_date: '2026-04-15' })],
      monthBills: [
        bill({ id: 'no-date', due_date: null }),
        bill({ id: 'soon', due_date: '2026-06-12' }),
        bill({ id: 'later', due_date: '2026-06-25' }),
        bill({ id: 'newer-overdue', due_date: '2026-06-08' }),
      ],
      awaitingCharges: [],
      today: TODAY,
    })
    expect(ledger.overdue.map((b) => b.id)).toEqual(['older', 'newer-overdue'])
    expect(ledger.due.map((b) => b.id)).toEqual(['soon', 'later', 'no-date'])
  })

  it('sorts paid by issue date, newest first', () => {
    const paid = (id: string, issued_on: string) =>
      bill({
        id,
        issued_on,
        payments: [{ amount_minor: 10000, paid_on: issued_on, paid_by: 'u' }],
      })
    const ledger = buildCurrentMonthLedger({
      carryInBills: [],
      monthBills: [paid('p1', '2026-06-02'), paid('p2', '2026-06-08')],
      awaitingCharges: [],
      today: TODAY,
    })
    expect(ledger.paid.map((b) => b.id)).toEqual(['p2', 'p1'])
  })

  it('dedupes bills appearing in both inputs', () => {
    const dup = bill({ id: 'dup', due_date: '2026-06-20' })
    const ledger = buildCurrentMonthLedger({
      carryInBills: [dup],
      monthBills: [dup],
      awaitingCharges: [],
      today: TODAY,
    })
    expect(ledger.due).toHaveLength(1)
  })
})

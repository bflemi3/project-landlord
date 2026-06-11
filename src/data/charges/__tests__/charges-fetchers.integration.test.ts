import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanupTestUser, createTestProperty, createTestUser } from '@/test/supabase'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

import {
  fetchCarryInBills,
  fetchBillsIssuedBetween,
  fetchPaymentsBetween,
  fetchLedgerMonth,
  fetchEarliestBillMonth,
} from '../shared'

// Fixture: a definition with a paid May bill, an unpaid (carry-in) May bill,
// a partially paid June bill, and a June payment settling the May carry-in.
let client: TypedSupabaseClient
let userId: string
let propertyId: string
let defId: string
let aprilBillId: string
let mayPaidId: string
let mayCarryInId: string
let juneBillId: string

beforeAll(async () => {
  const user = await createTestUser()
  client = user.client
  userId = user.userId
  const property = await createTestProperty(client)
  propertyId = property.propertyId

  const { data: def, error: defError } = await client
    .from('charge_definitions')
    .insert({ unit_id: property.unitId, name: 'Energia', expense_type: 'electricity' })
    .select('id')
    .single()
  if (defError) throw defError
  defId = def.id

  const { data: instances, error: instError } = await client
    .from('charge_instances')
    .insert([
      // April: fully unpaid
      {
        charge_definition_id: defId,
        amount_minor: 30000,
        issued_on: '2026-04-05',
        due_date: '2026-04-15',
      },
      // May: settled
      {
        charge_definition_id: defId,
        amount_minor: 31000,
        issued_on: '2026-05-05',
        due_date: '2026-05-15',
      },
      // May: open carry-in
      {
        charge_definition_id: defId,
        amount_minor: 18000,
        issued_on: '2026-05-20',
        due_date: '2026-05-28',
      },
      // June: partially paid
      {
        charge_definition_id: defId,
        amount_minor: 32000,
        issued_on: '2026-06-05',
        due_date: '2026-06-15',
      },
    ])
    .select('id, issued_on')
  if (instError) throw instError
  const byIssuedOn = new Map(instances.map((i) => [i.issued_on, i.id]))
  aprilBillId = byIssuedOn.get('2026-04-05')!
  mayPaidId = byIssuedOn.get('2026-05-05')!
  mayCarryInId = byIssuedOn.get('2026-05-20')!
  juneBillId = byIssuedOn.get('2026-06-05')!

  const { error: payError } = await client.from('charge_payments').insert([
    // settles the paid May bill, in May
    { charge_instance_id: mayPaidId, paid_by: userId, amount_minor: 31000, paid_on: '2026-05-16' },
    // partial on the June bill, in June
    { charge_instance_id: juneBillId, paid_by: userId, amount_minor: 10000, paid_on: '2026-06-06' },
    // June payment settling part of the May carry-in (still leaves it outstanding)
    {
      charge_instance_id: mayCarryInId,
      paid_by: userId,
      amount_minor: 5000,
      paid_on: '2026-06-08',
    },
  ])
  if (payError) throw payError
})

afterAll(async () => {
  if (userId) await cleanupTestUser(userId)
})

describe('charge_instances_with_payment_state view', () => {
  it('computes paid_minor and outstanding_minor per instance', async () => {
    const { data, error } = await client
      .from('charge_instances_with_payment_state')
      .select('id, paid_minor, outstanding_minor')
      .in('id', [mayPaidId, mayCarryInId, juneBillId])
    expect(error).toBeNull()
    const byId = new Map(data!.map((r) => [r.id, r]))
    expect(byId.get(mayPaidId)).toMatchObject({ paid_minor: 31000, outstanding_minor: 0 })
    expect(byId.get(mayCarryInId)).toMatchObject({ paid_minor: 5000, outstanding_minor: 13000 })
    expect(byId.get(juneBillId)).toMatchObject({ paid_minor: 10000, outstanding_minor: 22000 })
  })

  it('enforces base-table RLS for non-members (security_invoker)', async () => {
    const stranger = await createTestUser()
    try {
      const { data, error } = await stranger.client
        .from('charge_instances_with_payment_state')
        .select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
    } finally {
      await cleanupTestUser(stranger.userId)
    }
  })
})

describe('fetchCarryInBills', () => {
  it('returns only prior-issued bills with an outstanding balance, oldest first, with payments embedded', async () => {
    const bills = await fetchCarryInBills(client, propertyId, '2026-06-01')
    // April (fully unpaid) + open May bill; the settled May bill is excluded
    expect(bills.map((b) => b.id)).toEqual([aprilBillId, mayCarryInId])
    const mayCarryIn = bills.find((b) => b.id === mayCarryInId)!
    expect(mayCarryIn.payments).toHaveLength(1)
    expect(mayCarryIn.payments[0].amount_minor).toBe(5000)
  })

  it('includes outstanding bills older than the estimate window', async () => {
    // the April bill is fully unpaid and outside any 3-month window concern
    const bills = await fetchCarryInBills(client, propertyId, '2026-08-01')
    expect(bills.map((b) => b.issued_on)).toContain('2026-04-05')
  })
})

describe('fetchBillsIssuedBetween / fetchLedgerMonth', () => {
  it('returns bills in [from, to) only', async () => {
    const bills = await fetchBillsIssuedBetween(client, propertyId, '2026-05-01', '2026-06-01')
    expect(bills.map((b) => b.id).sort()).toEqual([mayPaidId, mayCarryInId].sort())
  })

  it('fetchLedgerMonth returns one calendar month', async () => {
    const bills = await fetchLedgerMonth(client, propertyId, { year: 2026, month: 6 })
    expect(bills.map((b) => b.id)).toEqual([juneBillId])
  })
})

describe('fetchEarliestBillMonth', () => {
  it('returns the month of the oldest bill, and null for a property with none', async () => {
    expect(await fetchEarliestBillMonth(client, propertyId)).toEqual({ year: 2026, month: 4 })

    const empty = await createTestProperty(client, 'Empty Property')
    expect(await fetchEarliestBillMonth(client, empty.propertyId)).toBeNull()
  })
})

describe('fetchPaymentsBetween', () => {
  it('returns payments dated in the window including ones settling old bills', async () => {
    const payments = await fetchPaymentsBetween(client, propertyId, '2026-06-01', '2026-07-01')
    expect(payments.map((p) => p.amount_minor).sort((a, b) => a - b)).toEqual([5000, 10000])
  })
})

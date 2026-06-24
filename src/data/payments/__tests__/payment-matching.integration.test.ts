import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Database } from '@/lib/types/database'
import {
  cleanupTestUser,
  createTestProperty,
  createTestUser,
  getAdminClient,
} from '@/test/supabase'

const SUPABASE_URL = 'http://127.0.0.1:54321'

type RentRow = Database['public']['Tables']['rent']['Row']
type LedgerRow = Database['public']['Tables']['monthly_ledger']['Row']

type ApplyResult = {
  success: boolean
  matched?: boolean
  ledger_id?: string
  match_id?: string
  reason?: string
}

type UnmatchResult = {
  success: boolean
  reason?: string
}

async function insertRent(
  client: SupabaseClient<Database>,
  userId: string,
  unitId: string,
  overrides: Partial<RentRow> = {},
): Promise<RentRow> {
  const { data, error } = await client
    .from('rent')
    .insert({
      unit_id: unitId,
      amount_minor: 250_000, // R$ 2,500.00
      currency: 'BRL',
      due_day_of_month: 5,
      start_date: '2026-06-01',
      end_date: '2026-11-30',
      created_by: userId,
      ...overrides,
    })
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to insert rent: ${error?.message}`)
  }
  return data
}

async function readLedger(
  client: SupabaseClient<Database>,
  rentId: string,
): Promise<LedgerRow[]> {
  const { data, error } = await client
    .from('monthly_ledger')
    .select('*')
    .eq('rent_id', rentId)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true })
  if (error) throw new Error(`Failed to read ledger: ${error.message}`)
  return (data ?? []) as LedgerRow[]
}

describe('payment matching: ledger generation', () => {
  const admin = getAdminClient()

  // ---------------------------------------------------------------------------
  // L1 — fixed-range rent: one ledger row per month in the contract window
  // ---------------------------------------------------------------------------
  it('L1: generates one ledger row per month for a fixed-range rent', async () => {
    const user = await createTestUser()
    try {
      const { unitId } = await createTestProperty(user.client, 'L1 Property')
      const rent = await insertRent(user.client, user.userId, unitId, {
        start_date: '2026-06-01',
        end_date: '2026-11-30',
        due_day_of_month: 5,
        amount_minor: 250_000,
      })

      const rows = await readLedger(admin, rent.id)
      expect(rows).toHaveLength(6)

      // June through November, due on the 5th, correct kind / bill_holder / status.
      expect(rows.map((r) => [r.period_year, r.period_month])).toEqual([
        [2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10], [2026, 11],
      ])
      for (const row of rows) {
        expect(row.kind).toBe('rent')
        expect(row.bill_holder).toBe('tenant')
        expect(row.status).toBe('open')
        expect(row.amount_minor).toBe(250_000)
        expect(row.currency).toBe('BRL')
        expect(row.due_date.endsWith('-05')).toBe(true)
      }
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // L2 — open-ended rent: exactly 24 months
  // ---------------------------------------------------------------------------
  it('L2: open-ended rent (end_date null) generates exactly 24 months', async () => {
    const user = await createTestUser()
    try {
      const { unitId } = await createTestProperty(user.client, 'L2 Property')
      const rent = await insertRent(user.client, user.userId, unitId, {
        start_date: '2026-06-01',
        end_date: null,
        due_day_of_month: 10,
      })

      const rows = await readLedger(admin, rent.id)
      expect(rows).toHaveLength(24)
      // First month is June 2026; last month is May 2028.
      expect([rows[0].period_year, rows[0].period_month]).toEqual([2026, 6])
      expect([rows[23].period_year, rows[23].period_month]).toEqual([2028, 5])
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // L3 — due-day clamp: February 2027 with due_day=31 → due_date Feb 28
  // ---------------------------------------------------------------------------
  it('L3: due_day_of_month=31 clamps Feb to the last day of the month', async () => {
    const user = await createTestUser()
    try {
      const { unitId } = await createTestProperty(user.client, 'L3 Property')
      const rent = await insertRent(user.client, user.userId, unitId, {
        start_date: '2027-01-01',
        end_date: '2027-04-30',
        due_day_of_month: 31,
      })

      const rows = await readLedger(admin, rent.id)
      const byMonth = new Map(rows.map((r) => [r.period_month, r.due_date]))
      expect(byMonth.get(1)).toBe('2027-01-31')
      expect(byMonth.get(2)).toBe('2027-02-28') // 2027 is not a leap year
      expect(byMonth.get(3)).toBe('2027-03-31')
      expect(byMonth.get(4)).toBe('2027-04-30')
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // L4 — idempotency: calling the generator again is a no-op
  // ---------------------------------------------------------------------------
  it('L4: calling generate_rent_ledger_entries twice produces no duplicates', async () => {
    const user = await createTestUser()
    try {
      const { unitId } = await createTestProperty(user.client, 'L4 Property')
      const rent = await insertRent(user.client, user.userId, unitId, {
        start_date: '2026-06-01',
        end_date: '2026-08-31',
      })

      // First call (via the INSERT trigger) already populated.
      const first = await readLedger(admin, rent.id)
      expect(first).toHaveLength(3)

      // Re-running the generator directly via admin must be a no-op.
      const { data: result, error } = await admin.rpc(
        'generate_rent_ledger_entries',
        { p_rent_id: rent.id },
      )
      expect(error).toBeNull()
      expect(result).toMatchObject({ success: true, generated: 0 })

      const after = await readLedger(admin, rent.id)
      expect(after).toHaveLength(3)
      expect(after.map((r) => r.id).sort()).toEqual(
        first.map((r) => r.id).sort(),
      )
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // L5 — RLS: a stranger user cannot read another user's ledger rows
  // ---------------------------------------------------------------------------
  it('L5: a stranger user cannot SELECT ledger rows for someone else\'s rent', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()
    try {
      const { unitId } = await createTestProperty(userA.client, 'L5 Property')
      const rent = await insertRent(userA.client, userA.userId, unitId)

      // Owner can read.
      const aSees = await readLedger(userA.client, rent.id)
      expect(aSees.length).toBeGreaterThan(0)

      // Stranger cannot.
      const bSees = await readLedger(userB.client, rent.id)
      expect(bSees).toHaveLength(0)
    } finally {
      await cleanupTestUser(userA.userId)
      await cleanupTestUser(userB.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // L6 — two rent rows on the same unit don't collide on the unique index
  // ---------------------------------------------------------------------------
  it('L6: two rent rows in the same period coexist (unique key is rent_id, not unit_id)', async () => {
    const user = await createTestUser()
    try {
      const { unitId } = await createTestProperty(user.client, 'L6 Property')
      const rentA = await insertRent(user.client, user.userId, unitId, {
        start_date: '2026-06-01',
        end_date: '2026-08-31',
        amount_minor: 250_000,
      })
      const rentB = await insertRent(user.client, user.userId, unitId, {
        start_date: '2026-06-01',
        end_date: '2026-08-31',
        amount_minor: 300_000,
      })

      const rowsA = await readLedger(admin, rentA.id)
      const rowsB = await readLedger(admin, rentB.id)
      expect(rowsA).toHaveLength(3)
      expect(rowsB).toHaveLength(3)
      expect(rowsA[0].amount_minor).toBe(250_000)
      expect(rowsB[0].amount_minor).toBe(300_000)
    } finally {
      await cleanupTestUser(user.userId)
    }
  })
})

// =============================================================================
// Matcher RPC + reversal — exercises apply_pluggy_transaction & unmatch_payment
// against real DB state: amount-exact, ±10d window, ambiguity, currency mismatch,
// soft-delete, settle re-match, and actor-FK erasure.
// =============================================================================
describe('payment matching: apply_pluggy_transaction RPC', () => {
  const admin = getAdminClient()

  type Setup = {
    user: Awaited<ReturnType<typeof createTestUser>>
    unitId: string
    rentId: string
    bankAccountId: string
  }

  async function setup(opts: {
    rentAmount?: number
    startDate?: string
    endDate?: string
  } = {}): Promise<Setup> {
    const user = await createTestUser()
    const { unitId } = await createTestProperty(user.client, 'Match Property')
    const rentRow = await insertRent(user.client, user.userId, unitId, {
      amount_minor: opts.rentAmount ?? 250_000,
      start_date: opts.startDate ?? '2026-06-01',
      end_date: opts.endDate ?? '2026-11-30',
      due_day_of_month: 5,
    })

    // Register a bank item + account for the landlord via the existing RPC.
    const { data: regData, error: regError } = await user.client.rpc(
      'register_bank_item',
      {
        p_pluggy_item_id: `pluggy-item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        p_institution_id: '201',
        p_institution_name: 'Pluggy Bank BR (sandbox)',
        p_accounts: [
          {
            pluggy_account_id: `pluggy-acct-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            account_type: 'BANK',
            account_subtype: 'CHECKING_ACCOUNT',
            name: 'Conta corrente',
            masked_number: '****1234',
            currency_code: 'BRL',
          },
        ],
      },
    )
    if (regError) throw new Error(`register_bank_item failed: ${regError.message}`)
    const bankItemId = (regData as { bank_item_id: string }).bank_item_id

    const { data: accts, error: acctErr } = await admin
      .from('bank_accounts')
      .select('id')
      .eq('bank_item_id', bankItemId)
    if (acctErr || !accts?.[0]) {
      throw new Error(`failed to look up bank_account: ${acctErr?.message}`)
    }

    return {
      user,
      unitId,
      rentId: rentRow.id,
      bankAccountId: accts[0].id,
    }
  }

  function tx(opts: {
    id?: string
    date: string
    amount_minor: number
    currency?: string
    counterparty_cpf?: string
    counterparty_name?: string
  }) {
    return {
      id: opts.id ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: opts.date,
      amount_minor: opts.amount_minor,
      currency: opts.currency ?? 'BRL',
      description: 'PIX recebido',
      counterparty_cpf: opts.counterparty_cpf ?? null,
      counterparty_name: opts.counterparty_name ?? null,
    }
  }

  async function callApply(
    bankAccountId: string,
    transaction: ReturnType<typeof tx>,
  ): Promise<ApplyResult> {
    const { data, error } = await admin.rpc('apply_pluggy_transaction', {
      p_bank_account_id: bankAccountId,
      p_transaction: transaction as never,
    })
    if (error) throw new Error(`apply_pluggy_transaction failed: ${error.message}`)
    return data as unknown as ApplyResult
  }

  // ---------------------------------------------------------------------------
  // M7 — exact match credit flips the ledger entry to paid
  // ---------------------------------------------------------------------------
  it('M7: exact-amount credit within ±10d window matches and marks ledger paid', async () => {
    const s = await setup()
    try {
      // Rent due 2026-07-05; credit posted 2026-07-02 (-3d).
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(true)
      expect(result.ledger_id).toBeTruthy()
      expect(result.match_id).toBeTruthy()

      const { data: ledger } = await admin
        .from('monthly_ledger')
        .select('status, paid_at')
        .eq('id', result.ledger_id!)
        .single()
      expect(ledger?.status).toBe('paid')
      expect(ledger?.paid_at).not.toBeNull()

      const { data: match } = await admin
        .from('payment_matches')
        .select('source_side, reversed_at')
        .eq('id', result.match_id!)
        .single()
      expect(match?.source_side).toBe('landlord')
      expect(match?.reversed_at).toBeNull()
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M8 — ambiguity: two open candidates with same amount + window → no match
  // ---------------------------------------------------------------------------
  it('M8: ambiguous candidates (>1 in window) → no match, ledger stays open', async () => {
    const s = await setup({ rentAmount: 250_000 })
    try {
      // Use a date that's within ±10 days of TWO consecutive months' due dates.
      // Due dates are 2026-07-05 and 2026-08-05 (31d apart). A single posted
      // date can't be within 10 days of both. Instead: produce two open
      // candidates for the SAME month by creating a second rent on the same
      // unit with the same amount and start/end → two open ledger rows for
      // 2026-07 with the same amount.
      await insertRent(s.user.client, s.user.userId, s.unitId, {
        amount_minor: 250_000,
        start_date: '2026-06-01',
        end_date: '2026-11-30',
        due_day_of_month: 5,
      })

      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-05T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)

      // Both candidates still open.
      const { data: open } = await admin
        .from('monthly_ledger')
        .select('id')
        .eq('unit_id', s.unitId)
        .eq('period_year', 2026)
        .eq('period_month', 7)
        .eq('status', 'open')
      expect(open?.length).toBeGreaterThanOrEqual(2)

      // But the bank_transactions row was persisted.
      const { data: bts } = await admin
        .from('bank_transactions')
        .select('id')
        .eq('bank_account_id', s.bankAccountId)
      expect(bts?.length).toBe(1)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M9 — unmatch restores 'open' and retains the match row with reversed_at
  // ---------------------------------------------------------------------------
  it('M9: unmatch_payment reverses the match and reopens the ledger entry', async () => {
    const s = await setup()
    try {
      const matched = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(matched.matched).toBe(true)

      const { data: unmatchResult, error } = await s.user.client.rpc(
        'unmatch_payment',
        { p_payment_match_id: matched.match_id!, p_reason: 'wrong tenant' },
      )
      expect(error).toBeNull()
      expect((unmatchResult as unknown as UnmatchResult).success).toBe(true)

      const { data: ledger } = await admin
        .from('monthly_ledger')
        .select('status, paid_at')
        .eq('id', matched.ledger_id!)
        .single()
      expect(ledger?.status).toBe('open')
      expect(ledger?.paid_at).toBeNull()

      const { data: match } = await admin
        .from('payment_matches')
        .select('reversed_at, reversed_by, reversal_reason')
        .eq('id', matched.match_id!)
        .single()
      expect(match?.reversed_at).not.toBeNull()
      expect(match?.reversed_by).toBe(s.user.userId)
      expect(match?.reversal_reason).toBe('wrong tenant')
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M10 — replaying the same Pluggy transaction is idempotent
  // ---------------------------------------------------------------------------
  it('M10: applying the same Pluggy transaction twice is a no-op (no second match)', async () => {
    const s = await setup()
    try {
      const t = tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 })
      const first = await callApply(s.bankAccountId, t)
      const second = await callApply(s.bankAccountId, t)

      expect(first.matched).toBe(true)
      expect(second.success).toBe(true)
      expect(second.matched).toBe(false)
      expect(second.reason).toBe('duplicate')

      const { data: bts } = await admin
        .from('bank_transactions')
        .select('id')
        .eq('bank_account_id', s.bankAccountId)
      expect(bts).toHaveLength(1)

      const { data: matches } = await admin
        .from('payment_matches')
        .select('id, reversed_at')
        .eq('monthly_ledger_id', first.ledger_id!)
      expect(matches).toHaveLength(1)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // Cross-user safety — a credit on Alice's account cannot match Bob's rent
  // ---------------------------------------------------------------------------
  it('cross-user: credit on userA\'s account cannot match userB\'s rent', async () => {
    const a = await setup({ rentAmount: 199_999 })
    const b = await setup({ rentAmount: 250_000 })
    try {
      // Credit on Alice's bank account with the same amount as Bob's rent.
      const result = await callApply(
        a.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      // Should not match — even though Bob has an open ledger row for 250k,
      // it is scoped to Bob's properties, not Alice's bank account user.
      expect(result.matched).toBe(false)

      // Bob's ledger is untouched.
      const { data: bLedger } = await admin
        .from('monthly_ledger')
        .select('status')
        .eq('rent_id', b.rentId)
      expect((bLedger ?? []).every((r) => r.status === 'open')).toBe(true)
    } finally {
      await cleanupTestUser(a.user.userId)
      await cleanupTestUser(b.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // unauthenticated client cannot unmatch
  // ---------------------------------------------------------------------------
  it('anon cannot call unmatch_payment (grant boundary)', async () => {
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { error } = await anon.rpc('unmatch_payment', {
      p_payment_match_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'x',
    })
    expect(error?.code).toBe('42501')
  })

  // ---------------------------------------------------------------------------
  // An authenticated non-landlord cannot unmatch (is_unit_landlord authz)
  // ---------------------------------------------------------------------------
  it('an authenticated non-landlord cannot unmatch (not_authorized)', async () => {
    const s = await setup()
    const other = await createTestUser()
    try {
      const matched = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(matched.matched).toBe(true)

      // A different authenticated user (not the unit's landlord) is rejected by
      // the in-function is_unit_landlord check, not just the grant boundary.
      const { data, error } = await other.client.rpc('unmatch_payment', {
        p_payment_match_id: matched.match_id!,
        p_reason: 'not my match',
      })
      expect(error).toBeNull()
      const res = data as unknown as UnmatchResult
      expect(res.success).toBe(false)
      expect(res.reason).toBe('not_authorized')

      // The match is untouched — still active.
      const { data: pm } = await admin
        .from('payment_matches')
        .select('reversed_at')
        .eq('id', matched.match_id!)
        .single()
      expect(pm?.reversed_at).toBeNull()
    } finally {
      await cleanupTestUser(s.user.userId)
      try {
        await cleanupTestUser(other.userId)
      } catch {
        /* no-op */
      }
    }
  })

  // ---------------------------------------------------------------------------
  // M11 — soft-deleted rent: matcher skips its open ledger obligations (#7)
  // ---------------------------------------------------------------------------
  it('M11: a soft-deleted rent is not matched (phantom-obligation guard)', async () => {
    const s = await setup()
    try {
      // Soft-delete the tenancy after its ledger was generated.
      const { error: delErr } = await admin
        .from('rent')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', s.rentId)
      if (delErr) throw new Error(`soft-delete rent failed: ${delErr.message}`)

      // A credit that would otherwise match the July obligation exactly.
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)

      // Obligations remain open — nothing flipped to paid on a dead tenancy.
      const ledger = await readLedger(admin, s.rentId)
      expect(ledger.length).toBeGreaterThan(0)
      expect(ledger.every((r) => r.status === 'open')).toBe(true)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M12 — PENDING→settled: a changed redelivery that now matches re-matches (#6)
  // ---------------------------------------------------------------------------
  it('M12: re-applying a transaction with a changed, now-matching amount matches', async () => {
    const s = await setup()
    try {
      const id = `tx-resettle-${Date.now()}`
      // First sighting: amount matches no open obligation → no match, row stored.
      const first = await callApply(
        s.bankAccountId,
        tx({ id, date: '2026-07-02T10:00:00Z', amount_minor: 999_999 }),
      )
      expect(first.success).toBe(true)
      expect(first.matched).toBe(false)

      // Same tx id, settled to the real (matching) amount → upsert + re-match.
      const second = await callApply(
        s.bankAccountId,
        tx({ id, date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(second.success).toBe(true)
      expect(second.matched).toBe(true)
      expect(second.ledger_id).toBeTruthy()

      // Updated in place — still exactly one bank_transaction at the new amount.
      const { data: bts } = await admin
        .from('bank_transactions')
        .select('id, amount_minor')
        .eq('bank_account_id', s.bankAccountId)
      expect(bts).toHaveLength(1)
      expect(bts?.[0]?.amount_minor).toBe(250_000)

      const { data: ledger } = await admin
        .from('monthly_ledger')
        .select('status')
        .eq('id', second.ledger_id!)
        .single()
      expect(ledger?.status).toBe('paid')
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M13 — a changed redelivery of an already-matched tx is left undisturbed (#6)
  // ---------------------------------------------------------------------------
  it('M13: changed redelivery of an already-matched transaction returns already_matched', async () => {
    const s = await setup()
    try {
      const id = `tx-settled-${Date.now()}`
      const first = await callApply(
        s.bankAccountId,
        tx({ id, date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(first.matched).toBe(true)

      // Same id redelivered with a changed amount: the confirmed match is kept.
      const second = await callApply(
        s.bankAccountId,
        tx({ id, date: '2026-07-02T10:00:00Z', amount_minor: 240_000 }),
      )
      expect(second.success).toBe(true)
      expect(second.reason).toBe('already_matched')

      // Ledger still paid; still exactly one active (non-reversed) match.
      const { data: ledger } = await admin
        .from('monthly_ledger')
        .select('status')
        .eq('id', first.ledger_id!)
        .single()
      expect(ledger?.status).toBe('paid')
      const { data: matches } = await admin
        .from('payment_matches')
        .select('id')
        .eq('monthly_ledger_id', first.ledger_id!)
        .is('reversed_at', null)
      expect(matches).toHaveLength(1)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M14 — deleting a match actor SET NULLs matched_by, retains the match (#8)
  // ---------------------------------------------------------------------------
  it('M14: deleting a payment_matches actor nullifies matched_by, retains the row', async () => {
    const s = await setup()
    const actor = await createTestUser()
    try {
      const first = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(first.matched).toBe(true)

      // Attribute the match to a separate actor profile, then delete that user.
      const { error: updErr } = await admin
        .from('payment_matches')
        .update({ matched_by: actor.userId })
        .eq('id', first.match_id!)
      if (updErr) throw new Error(`set matched_by failed: ${updErr.message}`)

      const { error: delErr } = await admin.auth.admin.deleteUser(actor.userId)
      if (delErr) throw new Error(`delete actor failed: ${delErr.message}`)

      // The match row survives with matched_by nulled — the financial record
      // (5-year retention) is retained while the actor reference is erased.
      const { data: match } = await admin
        .from('payment_matches')
        .select('id, matched_by')
        .eq('id', first.match_id!)
        .single()
      expect(match).toBeTruthy()
      expect(match?.matched_by).toBeNull()
    } finally {
      await cleanupTestUser(s.user.userId)
      try {
        await cleanupTestUser(actor.userId)
      } catch {
        /* actor deleted in the test body */
      }
    }
  })

  // ---------------------------------------------------------------------------
  // M15 — currency mismatch: a non-BRL credit does not match a BRL obligation
  // ---------------------------------------------------------------------------
  it('M15: a credit in a different currency does not match', async () => {
    const s = await setup()
    try {
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000, currency: 'USD' }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M16 — outside the ±10-day window: no match
  // ---------------------------------------------------------------------------
  it('M16: a credit outside the ±10-day window does not match', async () => {
    const s = await setup()
    try {
      // July rent is due 2026-07-05; the nearest obligations are 15+ days away.
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-20T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M17 — amount off by one minor unit: no match (exact amount required)
  // ---------------------------------------------------------------------------
  it('M17: a credit off by one cent does not match', async () => {
    const s = await setup()
    try {
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 249_999 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M18 — a debit (negative amount) is recorded but never matches
  //
  // Note: matched:false here is inherent, not a test of the `v_amount <= 0`
  // guard — ledger amounts are CHECK(>= 0), so a negative amount can never equal
  // one regardless of the guard. The distinctive coverage is that the debit is
  // still persisted (for the books) rather than dropped.
  // ---------------------------------------------------------------------------
  it('M18: a debit is recorded but does not match', async () => {
    const s = await setup()
    try {
      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: -250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(false)
      // The debit is still recorded (the insert precedes the credit guard).
      const { data: bt } = await admin
        .from('bank_transactions')
        .select('amount_minor')
        .eq('bank_account_id', s.bankAccountId)
      expect((bt ?? []).some((r) => r.amount_minor === -250_000)).toBe(true)
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M19 — a late payment matches an obligation flipped to 'overdue'
  // ---------------------------------------------------------------------------
  it('M19: a credit matches an obligation flipped to overdue', async () => {
    const s = await setup()
    try {
      // Simulate a future overdue-marking job flipping the July obligation.
      const { error: updErr } = await admin
        .from('monthly_ledger')
        .update({ status: 'overdue' })
        .eq('rent_id', s.rentId)
        .eq('period_month', 7)
      if (updErr) throw new Error(`flip overdue failed: ${updErr.message}`)

      const result = await callApply(
        s.bankAccountId,
        tx({ date: '2026-07-02T10:00:00Z', amount_minor: 250_000 }),
      )
      expect(result.success).toBe(true)
      expect(result.matched).toBe(true)

      const { data: ledger } = await admin
        .from('monthly_ledger')
        .select('status')
        .eq('id', result.ledger_id!)
        .single()
      expect(ledger?.status).toBe('paid')
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })

  // ---------------------------------------------------------------------------
  // M20 — a credit stored before any candidate existed re-matches once one
  // appears (e.g. bank connected + rent received before the contract was set up)
  // ---------------------------------------------------------------------------
  it('M20: a stored-unmatched credit re-matches once a candidate appears', async () => {
    const s = await setup({ rentAmount: 199_999 })
    const t = tx({
      id: `tx-late-${Date.now()}`,
      date: '2026-07-02T10:00:00Z',
      amount_minor: 250_000,
    })
    try {
      // No 250k obligation exists yet → the credit is stored but unmatched.
      const first = await callApply(s.bankAccountId, t)
      expect(first.success).toBe(true)
      expect(first.matched).toBe(false)

      // A 250k obligation now appears (a second rent on the same unit).
      await insertRent(s.user.client, s.user.userId, s.unitId, {
        amount_minor: 250_000,
        start_date: '2026-06-01',
        end_date: '2026-11-30',
        due_day_of_month: 5,
      })

      // Re-delivering the SAME (unchanged) credit now matches — the duplicate
      // short-circuit must not block re-matching of a still-unmatched credit.
      const second = await callApply(s.bankAccountId, t)
      expect(second.success).toBe(true)
      expect(second.matched).toBe(true)
      expect(second.ledger_id).toBeTruthy()
    } finally {
      await cleanupTestUser(s.user.userId)
    }
  })
})

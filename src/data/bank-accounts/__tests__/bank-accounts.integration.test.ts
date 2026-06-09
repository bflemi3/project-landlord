import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
} from '@/test/supabase'

const SUPABASE_URL = 'http://127.0.0.1:54321'

type RegisterResult = {
  success: boolean
  bank_item_id?: string
  reason?: string
}

type DisconnectResult = {
  success: boolean
  pluggy_item_id?: string
  reason?: string
}

/**
 * Integration tests for the bank_accounts data model + RPCs.
 *
 * These tests hit a real local Supabase. The RPCs are SECURITY DEFINER and
 * use auth.uid(); we never pass the admin client into the RPC — that would
 * mask RLS / grant bugs that the production call shape would surface.
 */
describe('bank_accounts data model + RPCs', () => {
  const admin = getAdminClient()

  function fakeItemPayload(suffix: string) {
    return {
      p_pluggy_item_id: `pluggy-item-${suffix}`,
      p_institution_id: '201',
      p_institution_name: 'Pluggy Bank BR (sandbox)',
      p_accounts: [
        {
          pluggy_account_id: `pluggy-acct-checking-${suffix}`,
          account_type: 'BANK',
          account_subtype: 'CHECKING_ACCOUNT',
          name: 'Conta corrente',
          masked_number: '****1234',
          currency_code: 'BRL',
        },
        {
          pluggy_account_id: `pluggy-acct-savings-${suffix}`,
          account_type: 'BANK',
          account_subtype: 'SAVINGS_ACCOUNT',
          name: 'Poupança',
          masked_number: '****5678',
          currency_code: 'BRL',
        },
      ],
    }
  }

  // -------------------------------------------------------------------------
  // B1 — happy path: register + read
  // -------------------------------------------------------------------------
  it('B1: register_bank_item creates one item + N accounts visible only to owner', async () => {
    const user = await createTestUser()
    const suffix = `b1-${Date.now()}`
    try {
      const { data, error } = await user.client.rpc(
        'register_bank_item',
        fakeItemPayload(suffix),
      )
      expect(error).toBeNull()
      const result = data as unknown as RegisterResult
      expect(result.success).toBe(true)
      expect(result.bank_item_id).toBeTruthy()

      const { data: items } = await user.client
        .from('bank_items')
        .select('id, institution_name, status, user_id')
      expect(items).toHaveLength(1)
      expect(items![0].institution_name).toBe('Pluggy Bank BR (sandbox)')
      expect(items![0].status).toBe('connected')
      expect(items![0].user_id).toBe(user.userId)

      const { data: accts } = await user.client
        .from('bank_accounts')
        .select('id, masked_number, account_type')
      expect(accts).toHaveLength(2)
      expect(accts!.map((a) => a.masked_number).sort()).toEqual([
        '****1234',
        '****5678',
      ])
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B2 — RLS: user B cannot read user A's items or accounts
  // -------------------------------------------------------------------------
  it('B2: a different user cannot SELECT another user\'s bank rows', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()
    const suffix = `b2-${Date.now()}`
    try {
      await userA.client.rpc('register_bank_item', fakeItemPayload(suffix))

      const { data: bSeesItems } = await userB.client.from('bank_items').select('id')
      const { data: bSeesAccts } = await userB.client.from('bank_accounts').select('id')

      expect(bSeesItems).toEqual([])
      expect(bSeesAccts).toEqual([])

      // Admin still sees both for assertion purposes
      const { data: adminItems } = await admin
        .from('bank_items')
        .select('id, user_id')
        .eq('user_id', userA.userId)
      expect(adminItems).toHaveLength(1)
    } finally {
      await cleanupTestUser(userA.userId)
      await cleanupTestUser(userB.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B3 — anon cannot execute the RPCs at all (grant boundary)
  // -------------------------------------------------------------------------
  it('B3: anonymous clients cannot execute the RPCs', async () => {
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)

    const r1 = await anon.rpc('register_bank_item', {
      p_pluggy_item_id: 'x',
      p_institution_id: '1',
      p_institution_name: 'x',
      p_accounts: [],
    })
    expect(r1.error?.code).toBe('42501')

    const r2 = await anon.rpc('disconnect_bank_item', {
      p_bank_item_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(r2.error?.code).toBe('42501')
  })

  // -------------------------------------------------------------------------
  // B4 — idempotent replay: registering the same pluggy_item_id is a no-op upsert
  // -------------------------------------------------------------------------
  it('B4: registering the same pluggy_item_id twice returns the same bank_item_id with no duplicate accounts', async () => {
    const user = await createTestUser()
    const suffix = `b4-${Date.now()}`
    try {
      const payload = fakeItemPayload(suffix)
      const first = (await user.client.rpc('register_bank_item', payload))
        .data as unknown as RegisterResult
      const second = (await user.client.rpc('register_bank_item', payload))
        .data as unknown as RegisterResult

      expect(first.success).toBe(true)
      expect(second.success).toBe(true)
      expect(second.bank_item_id).toBe(first.bank_item_id)

      const { data: items } = await user.client.from('bank_items').select('id')
      expect(items).toHaveLength(1)

      const { data: accts } = await user.client.from('bank_accounts').select('id')
      expect(accts).toHaveLength(2)
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B5 — reconnect: an item in reconnect_required flips back to connected
  // -------------------------------------------------------------------------
  it('B5: re-registering an item flips reconnect_required → connected', async () => {
    const user = await createTestUser()
    const suffix = `b5-${Date.now()}`
    try {
      const payload = fakeItemPayload(suffix)
      const first = (await user.client.rpc('register_bank_item', payload))
        .data as unknown as RegisterResult
      expect(first.success).toBe(true)

      // Simulate a webhook flipping the item to reconnect_required
      await admin
        .from('bank_items')
        .update({ status: 'reconnect_required' })
        .eq('id', first.bank_item_id!)

      const second = (await user.client.rpc('register_bank_item', payload))
        .data as unknown as RegisterResult
      expect(second.success).toBe(true)
      expect(second.bank_item_id).toBe(first.bank_item_id)

      const { data: item } = await user.client
        .from('bank_items')
        .select('status')
        .eq('id', first.bank_item_id!)
        .single()
      expect(item?.status).toBe('connected')
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B6 — disconnect happy path
  // -------------------------------------------------------------------------
  it('B6: owner can disconnect; row soft-deletes; pluggy_item_id is returned', async () => {
    const user = await createTestUser()
    const suffix = `b6-${Date.now()}`
    try {
      const reg = (await user.client.rpc('register_bank_item', fakeItemPayload(suffix)))
        .data as unknown as RegisterResult
      const bankItemId = reg.bank_item_id!

      const disc = (
        await user.client.rpc('disconnect_bank_item', { p_bank_item_id: bankItemId })
      ).data as unknown as DisconnectResult
      expect(disc.success).toBe(true)
      expect(disc.pluggy_item_id).toBe(`pluggy-item-${suffix}`)

      // The owner-only SELECT policy still lets them read (no deleted_at filter
      // in the policy); the active-uniqueness index is now released.
      const { data: row } = await admin
        .from('bank_items')
        .select('status, disconnected_at')
        .eq('id', bankItemId)
        .single()
      expect(row?.status).toBe('disconnected')
      expect(row?.disconnected_at).not.toBeNull()
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B7 — disconnect another user's item → not_found
  // -------------------------------------------------------------------------
  it('B7: a different user cannot disconnect someone else\'s item', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()
    const suffix = `b7-${Date.now()}`
    try {
      const reg = (await userA.client.rpc('register_bank_item', fakeItemPayload(suffix)))
        .data as unknown as RegisterResult
      const bankItemId = reg.bank_item_id!

      const disc = (
        await userB.client.rpc('disconnect_bank_item', { p_bank_item_id: bankItemId })
      ).data as unknown as DisconnectResult
      expect(disc.success).toBe(false)
      expect(disc.reason).toBe('not_found')

      // A's item is untouched
      const { data: row } = await admin
        .from('bank_items')
        .select('status, disconnected_at')
        .eq('id', bankItemId)
        .single()
      expect(row?.status).toBe('connected')
      expect(row?.disconnected_at).toBeNull()
    } finally {
      await cleanupTestUser(userA.userId)
      await cleanupTestUser(userB.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B8 — audit trail recorded on connect + disconnect
  // -------------------------------------------------------------------------
  it('B8: audit_events records insert + update from the audit trigger', async () => {
    const user = await createTestUser()
    const suffix = `b8-${Date.now()}`
    try {
      const reg = (await user.client.rpc('register_bank_item', fakeItemPayload(suffix)))
        .data as unknown as RegisterResult
      const bankItemId = reg.bank_item_id!

      await user.client.rpc('disconnect_bank_item', { p_bank_item_id: bankItemId })

      const { data: events } = await admin
        .from('audit_events')
        .select('action, entity_type, entity_id, actor_id')
        .eq('entity_type', 'bank_items')
        .eq('entity_id', bankItemId)
        .order('created_at', { ascending: true })

      expect(events).toBeTruthy()
      expect(events!.length).toBeGreaterThanOrEqual(2)
      const actions = events!.map((e) => e.action)
      expect(actions).toContain('create')
      expect(actions).toContain('update')
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // -------------------------------------------------------------------------
  // B9 — input validation: empty / null inputs return structured error
  // -------------------------------------------------------------------------
  it('B9: invalid_input is returned for blank pluggy_item_id', async () => {
    const user = await createTestUser()
    try {
      const r = (
        await user.client.rpc('register_bank_item', {
          p_pluggy_item_id: '',
          p_institution_id: '1',
          p_institution_name: 'x',
          p_accounts: [],
        })
      ).data as unknown as RegisterResult
      expect(r.success).toBe(false)
      expect(r.reason).toBe('invalid_input')
    } finally {
      await cleanupTestUser(user.userId)
    }
  })
})

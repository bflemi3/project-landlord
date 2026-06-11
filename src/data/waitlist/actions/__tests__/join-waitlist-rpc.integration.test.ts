import { describe, it, expect, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getAdminClient } from '@/test/supabase'

const SUPABASE_URL = 'http://127.0.0.1:54321'

/**
 * Tests for the join_waitlist SECURITY DEFINER RPC.
 *
 * Mirrors the production call shape: the public landing form has no auth
 * session, so an anon client calls rpc('join_waitlist'). The RPC runs with
 * definer privileges and writes the row; RLS keeps the table itself private.
 * Assertions read back with the admin client. Do NOT call the RPC with the
 * admin client — that would hide the anon grant / RLS behavior.
 */
describe('join_waitlist RPC', () => {
  const admin = getAdminClient()
  const anon = createClient<Database>(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
  const emails: string[] = []

  function track(raw: string) {
    emails.push(raw.toLowerCase().trim())
    return raw
  }

  afterEach(async () => {
    if (emails.length) await admin.from('waitlist').delete().in('email', emails)
    emails.length = 0
  })

  async function readByEmail(raw: string) {
    const { data } = await admin
      .from('waitlist')
      .select('email, role, locale')
      .eq('email', raw.toLowerCase().trim())
      .maybeSingle()
    return data
  }

  it('inserts a normalized landlord row (email lowercased + trimmed) and returns true', async () => {
    const raw = track(`  WAIT-${Date.now()}@Test.Local  `)
    const { data, error } = await anon.rpc('join_waitlist', {
      p_email: raw,
      p_role: 'landlord',
      p_locale: 'pt-BR',
    })
    expect(error).toBeNull()
    expect(data).toBe(true) // newly inserted
    expect(await readByEmail(raw)).toEqual({
      email: raw.toLowerCase().trim(),
      role: 'landlord',
      locale: 'pt-BR',
    })
  })

  it('records the tenant role', async () => {
    const raw = track(`tenant-${Date.now()}@test.local`)
    await anon.rpc('join_waitlist', { p_email: raw, p_role: 'tenant', p_locale: 'en' })
    expect((await readByEmail(raw))?.role).toBe('tenant')
  })

  it('is idempotent — returns true once, false on duplicate, keeps the first role and one row', async () => {
    const raw = track(`dup-${Date.now()}@test.local`)
    const first = await anon.rpc('join_waitlist', {
      p_email: raw,
      p_role: 'landlord',
      p_locale: 'en',
    })
    const second = await anon.rpc('join_waitlist', {
      p_email: raw,
      p_role: 'tenant',
      p_locale: 'en',
    })
    expect(first.data).toBe(true) // newly inserted
    expect(second.data).toBe(false) // already on the list — caller skips the welcome email
    const { data } = await admin
      .from('waitlist')
      .select('role')
      .eq('email', raw.toLowerCase().trim())
    expect(data).toHaveLength(1)
    expect(data?.[0].role).toBe('landlord')
  })

  it('coerces an unknown role to landlord', async () => {
    const raw = track(`badrole-${Date.now()}@test.local`)
    await anon.rpc('join_waitlist', { p_email: raw, p_role: 'imobiliaria', p_locale: 'en' })
    expect((await readByEmail(raw))?.role).toBe('landlord')
  })

  it('keeps the table private — anon cannot read it directly', async () => {
    const raw = track(`rls-${Date.now()}@test.local`)
    await anon.rpc('join_waitlist', { p_email: raw, p_role: 'landlord', p_locale: 'en' })
    expect(await readByEmail(raw)).not.toBeNull() // admin sees it
    const { data: anonRows } = await anon
      .from('waitlist')
      .select('email')
      .eq('email', raw.toLowerCase().trim())
    expect(anonRows ?? []).toHaveLength(0) // anon sees nothing (RLS, no policies)
  })
})

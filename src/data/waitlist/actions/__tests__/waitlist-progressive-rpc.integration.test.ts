import { describe, it, expect, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getAdminClient } from '@/test/supabase'

const SUPABASE_URL = 'http://127.0.0.1:54321'

/**
 * Tests for the two-phase progressive-waitlist SECURITY DEFINER RPCs
 * (waitlist_capture at the gate, waitlist_complete at the enrich step).
 *
 * Mirrors production: the public landing form has no auth session, so an anon
 * client calls the RPCs. They run with definer privileges and write the row;
 * RLS keeps the table itself private. Assertions read back with the admin
 * client. Do NOT call the RPCs with the admin client — that would hide the
 * anon grant / RLS behavior.
 */
describe('waitlist_capture + waitlist_complete RPCs', () => {
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

  async function read(raw: string) {
    const { data } = await admin
      .from('waitlist')
      .select(
        'email, role, locale, property_count, workflow, feedback, utm_source, utm_medium, referrer, landing_path, completed_at',
      )
      .eq('email', raw.toLowerCase().trim())
      .maybeSingle()
    return data
  }

  const sorted = (a: string[] | null | undefined) => [...(a ?? [])].sort()

  describe('waitlist_capture (gate)', () => {
    it('inserts a normalized row with attribution and returns true', async () => {
      const raw = track(`  CAP-${Date.now()}@Test.Local  `)
      const { data, error } = await anon.rpc('waitlist_capture', {
        p_email: raw,
        p_locale: 'pt-BR',
        p_role: 'tenant',
        p_utm_source: 'facebook',
        p_utm_medium: 'cpc',
        p_referrer: 'https://t.co/x',
        p_landing_path: '/',
      })
      expect(error).toBeNull()
      expect(data).toBe(true) // newly inserted
      expect(await read(raw)).toMatchObject({
        email: raw.toLowerCase().trim(),
        role: 'tenant',
        locale: 'pt-BR',
        utm_source: 'facebook',
        utm_medium: 'cpc',
        referrer: 'https://t.co/x',
        landing_path: '/',
        completed_at: null, // captured, not yet enriched
      })
    })

    it('is idempotent — second capture returns false and keeps the first attribution', async () => {
      const raw = track(`capdup-${Date.now()}@test.local`)
      const first = await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'landlord', p_utm_source: 'reddit' })
      const second = await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'tenant', p_utm_source: 'twitter' })
      expect(first.data).toBe(true)
      expect(second.data).toBe(false) // already on the list — caller skips welcome
      const { data } = await admin.from('waitlist').select('role, utm_source').eq('email', raw.toLowerCase().trim())
      expect(data).toHaveLength(1)
      expect(data?.[0]).toMatchObject({ role: 'landlord', utm_source: 'reddit' }) // first write wins
    })

    it('coerces an unknown capture role to landlord', async () => {
      const raw = track(`caprole-${Date.now()}@test.local`)
      await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'hacker' })
      expect((await read(raw))?.role).toBe('landlord')
    })
  })

  describe('waitlist_complete (enrich)', () => {
    it('enriches a captured row, stamps completion, returns true the first time', async () => {
      const raw = track(`comp-${Date.now()}@test.local`)
      await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'landlord' })
      const { data, error } = await anon.rpc('waitlist_complete', {
        p_email: raw,
        p_role: 'both',
        p_property_count: '2-5',
        p_workflow: ['whatsapp', 'spreadsheet'],
        p_feedback: '  hard part  ',
        p_locale: 'pt-BR',
      })
      expect(error).toBeNull()
      expect(data).toBe(true) // first completion
      const row = await read(raw)
      expect(row).toMatchObject({
        role: 'both',
        property_count: '2-5',
        feedback: 'hard part', // trimmed
        locale: 'pt-BR',
      })
      expect(sorted(row?.workflow)).toEqual(['spreadsheet', 'whatsapp'])
      expect(row?.completed_at).not.toBeNull()
    })

    it('returns false on a second completion but still updates the profile', async () => {
      const raw = track(`compdup-${Date.now()}@test.local`)
      await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'landlord' })
      const first = await anon.rpc('waitlist_complete', { p_email: raw, p_role: 'landlord', p_property_count: '1', p_workflow: ['email'] })
      const second = await anon.rpc('waitlist_complete', { p_email: raw, p_role: 'tenant', p_property_count: '10+', p_workflow: ['accountant'] })
      expect(first.data).toBe(true)
      expect(second.data).toBe(false) // already completed
      expect(await read(raw)).toMatchObject({ role: 'tenant', property_count: '10+' })
      expect(sorted((await read(raw))?.workflow)).toEqual(['accountant'])
    })

    it('inserts a completed row when no prior capture exists (solo complete)', async () => {
      const raw = track(`solo-${Date.now()}@test.local`)
      const { data } = await anon.rpc('waitlist_complete', { p_email: raw, p_role: 'tenant', p_property_count: '1', p_workflow: ['whatsapp'], p_locale: 'en' })
      expect(data).toBe(true)
      const row = await read(raw)
      expect(row).toMatchObject({ role: 'tenant', property_count: '1' })
      expect(sorted(row?.workflow)).toEqual(['whatsapp'])
      expect(row?.completed_at).not.toBeNull()
    })

    it('filters invalid tokens: bad role → landlord, bad count → null, unknown workflow elements dropped', async () => {
      const raw = track(`bad-${Date.now()}@test.local`)
      await anon.rpc('waitlist_complete', {
        p_email: raw,
        p_role: 'hacker',
        p_property_count: '999',
        p_workflow: ['whatsapp', 'myspace', 'email'],
        p_locale: 'en',
      })
      const row = await read(raw)
      expect(row?.role).toBe('landlord')
      expect(row?.property_count).toBeNull()
      expect(sorted(row?.workflow)).toEqual(['email', 'whatsapp']) // 'myspace' dropped
    })

    it('stores all-invalid workflow as null', async () => {
      const raw = track(`emptywf-${Date.now()}@test.local`)
      await anon.rpc('waitlist_complete', { p_email: raw, p_role: 'landlord', p_workflow: ['nope', 'bogus'], p_locale: 'en' })
      expect((await read(raw))?.workflow).toBeNull()
    })

    it('trims feedback and stores blank feedback as null', async () => {
      const raw = track(`fb-${Date.now()}@test.local`)
      await anon.rpc('waitlist_complete', { p_email: raw, p_role: 'landlord', p_workflow: ['email'], p_feedback: '   ' })
      expect((await read(raw))?.feedback).toBeNull()
    })
  })

  it('keeps the table private — anon cannot read it directly', async () => {
    const raw = track(`rls-${Date.now()}@test.local`)
    await anon.rpc('waitlist_capture', { p_email: raw, p_locale: 'en', p_role: 'landlord' })
    expect(await read(raw)).not.toBeNull() // admin sees it
    const { data: anonRows } = await anon.from('waitlist').select('email').eq('email', raw.toLowerCase().trim())
    expect(anonRows ?? []).toHaveLength(0) // anon sees nothing (RLS, no policies)
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, cleanupTestUser, getAdminClient, createTestProperty } from '@/test/supabase'
import { createClient } from '@supabase/supabase-js'
import { inviteTenantCore } from '@/app/actions/properties/invite-tenant'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('invitation creation and validation', () => {
  const admin = getAdminClient()
  let systemUserId: string

  beforeAll(async () => {
    const user = await createTestUser()
    systemUserId = user.userId
  })

  afterAll(async () => {
    await cleanupTestUser(systemUserId)
  })

  it('stores source field when creating an invitation', async () => {
    const code = `SRC-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'source-test@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      source: 'waitlist',
    })

    const { data: invite } = await admin
      .from('invitations')
      .select('source, status, role')
      .eq('code', code)
      .single()

    expect(invite?.source).toBe('waitlist')
    expect(invite?.status).toBe('pending')
    expect(invite?.role).toBe('landlord')
  })

  it('defaults source to null when not provided', async () => {
    const code = `NOSRC-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'nosource@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
    })

    const { data: invite } = await admin
      .from('invitations')
      .select('source')
      .eq('code', code)
      .single()

    expect(invite?.source).toBeNull()
  })
})

describe('validate_invite_code RPC', () => {
  const admin = getAdminClient()
  let systemUserId: string

  beforeAll(async () => {
    const user = await createTestUser()
    systemUserId = user.userId
  })

  afterAll(async () => {
    await cleanupTestUser(systemUserId)
  })

  it('returns true for a valid pending invite code', async () => {
    const code = `VALID-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'valid@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
    })

    // Use anon client (RPC is granted to anon)
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data } = await anon.rpc('validate_invite_code', { invite_code: code })

    expect(data).toBe(true)
  })

  it('returns false for a non-existent code', async () => {
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data } = await anon.rpc('validate_invite_code', { invite_code: 'DOES-NOT-EXIST' })

    expect(data).toBe(false)
  })

  it('returns false for an already-accepted code', async () => {
    const code = `ACCEPTED-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'accepted@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'accepted',
      accepted_by: systemUserId,
    })

    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data } = await anon.rpc('validate_invite_code', { invite_code: code })

    expect(data).toBe(false)
  })

  it('returns false for an expired code', async () => {
    const code = `EXPIRED-VAL-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'expired-val@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    })

    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data } = await anon.rpc('validate_invite_code', { invite_code: code })

    expect(data).toBe(false)
  })

  it('is case-insensitive', async () => {
    const code = `CASE-${Date.now()}`
    await admin.from('invitations').insert({
      code,
      invited_email: 'case@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
    })

    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data } = await anon.rpc('validate_invite_code', { invite_code: code.toLowerCase() })

    expect(data).toBe(true)
  })
})

describe('tenant invite creation', () => {
  const admin = getAdminClient()
  let landlordUserId: string
  let landlordClient: Awaited<ReturnType<typeof createTestUser>>['client']
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    landlordUserId = user.userId
    landlordClient = user.client
    const prop = await createTestProperty(user.client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(landlordUserId)
  })

  it('generates a MABENN code and sets expires_at for tenant invites', async () => {
    const email = `tenant-code-${Date.now()}@test.local`

    const result = await inviteTenantCore(landlordClient, {
      propertyId,
      unitId,
      email,
      tenantName: 'Test Tenant',
      landlordName: 'Test Landlord',
    })

    expect(result.success).toBe(true)

    const { data: invite } = await admin
      .from('invitations')
      .select('code, expires_at, status, role')
      .eq('invited_email', email)
      .single()

    expect(invite?.code).toMatch(/^MABENN-[A-Z2-9]{4}$/)
    expect(invite?.expires_at).not.toBeNull()
    expect(invite?.status).toBe('pending')
    expect(invite?.role).toBe('tenant')

    // Verify expires_at is ~30 days from now
    const expiresAt = new Date(invite!.expires_at!)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const diff = Math.abs(expiresAt.getTime() - thirtyDaysFromNow.getTime())
    expect(diff).toBeLessThan(60_000) // within 1 minute
  })
})

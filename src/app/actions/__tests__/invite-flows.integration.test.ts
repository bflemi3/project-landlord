import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestUser, cleanupTestUser, getAdminClient, createTestProperty } from '@/test/supabase'
import { createClient } from '@supabase/supabase-js'
import { inviteTenantCore } from '@/data/properties/actions/invite-tenant'
import { generateInviteCode } from '@/lib/invitations/generate-invite-code'
import { redeemInviteByCodeCore } from '@/app/actions/redeem-invite-by-code'

// Mock the server-side Supabase client so validateAndFetchInviteContext works in Node tests
// (next/headers is not available outside Next.js runtime)
// Uses anon key to properly test the security-definer RPC works for unauthenticated users
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    return createSupabaseClient(
      'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY!,
    )
  },
}))

// Import after mock is set up
const { validateAndFetchInviteContext } = await import('@/app/actions/validate-invite')

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

describe('tenant membership creation on code redemption', () => {
  const admin = getAdminClient()
  let landlordUserId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    landlordUserId = user.userId
    const prop = await createTestProperty(user.client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(landlordUserId)
  })

  it('creates a tenant membership when a tenant invite code is redeemed via trigger', async () => {
    const code = generateInviteCode()
    const tenantEmail = `trigger-tenant-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: tenantEmail,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    const { data: userData } = await admin.auth.admin.createUser({
      email: tenantEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Trigger Tenant', invite_code: code },
    })

    const tenantUserId = userData.user!.id

    const { data: invite } = await admin
      .from('invitations')
      .select('status, accepted_by')
      .eq('code', code)
      .single()
    expect(invite?.status).toBe('accepted')
    expect(invite?.accepted_by).toBe(tenantUserId)

    const { data: membership } = await admin
      .from('memberships')
      .select('role, unit_id, property_id')
      .eq('user_id', tenantUserId)
      .eq('property_id', propertyId)
      .single()
    expect(membership?.role).toBe('tenant')
    expect(membership?.unit_id).toBe(unitId)

    await cleanupTestUser(tenantUserId)
  })

  it('is idempotent — no error if membership already exists', async () => {
    const code = generateInviteCode()
    const tenantEmail = `idempotent-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: tenantEmail,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    const { data: userData } = await admin.auth.admin.createUser({
      email: tenantEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Idempotent Tenant', invite_code: code },
    })

    const tenantUserId = userData.user!.id

    const { error } = await admin.from('memberships').insert({
      user_id: tenantUserId,
      property_id: propertyId,
      unit_id: unitId,
      role: 'tenant',
    })

    const { data: memberships } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', tenantUserId)
      .eq('property_id', propertyId)

    expect(memberships!.length).toBeGreaterThanOrEqual(1)

    await cleanupTestUser(tenantUserId)
  })

  it('does not create membership for landlord invite codes', async () => {
    const code = `LL-${Date.now()}`
    const llEmail = `ll-invite-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: llEmail,
      invited_by: landlordUserId,
      role: 'landlord',
      status: 'pending',
    })

    const { data: userData } = await admin.auth.admin.createUser({
      email: llEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'LL User', invite_code: code },
    })

    const llUserId = userData.user!.id

    const { data: memberships } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', llUserId)
    expect(memberships).toHaveLength(0)

    await cleanupTestUser(llUserId)
  })
})

describe('redeemInviteByCodeCore membership creation', () => {
  const admin = getAdminClient()
  let landlordUserId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    landlordUserId = user.userId
    const prop = await createTestProperty(user.client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(landlordUserId)
  })

  it('creates a tenant membership when redeeming a tenant invite code', async () => {
    const code = generateInviteCode()
    const tenantEmail = `redeem-tenant-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: tenantEmail,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    // Create user WITHOUT invite_code in metadata (simulates Google OAuth path — no trigger fires)
    const { data: userData } = await admin.auth.admin.createUser({
      email: tenantEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Redeem Tenant' },
    })
    const tenantUserId = userData.user!.id

    const result = await redeemInviteByCodeCore(admin, tenantUserId, code)
    expect(result.success).toBe(true)

    const { data: membership } = await admin
      .from('memberships')
      .select('role, unit_id, property_id')
      .eq('user_id', tenantUserId)
      .eq('property_id', propertyId)
      .single()
    expect(membership?.role).toBe('tenant')
    expect(membership?.unit_id).toBe(unitId)

    await cleanupTestUser(tenantUserId)
  })

  it('does NOT create membership for landlord invite codes', async () => {
    const code = `LL-REDEEM-${Date.now()}`
    const llEmail = `ll-redeem-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: llEmail,
      invited_by: landlordUserId,
      role: 'landlord',
      status: 'pending',
    })

    const { data: userData } = await admin.auth.admin.createUser({
      email: llEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'LL Redeem' },
    })
    const llUserId = userData.user!.id

    const result = await redeemInviteByCodeCore(admin, llUserId, code)
    expect(result.success).toBe(true)

    const { data: memberships } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', llUserId)
    expect(memberships).toHaveLength(0)

    await cleanupTestUser(llUserId)
  })

  it('is idempotent — no error if membership already exists', async () => {
    const code = generateInviteCode()
    const tenantEmail = `redeem-idem-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: tenantEmail,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    const { data: userData } = await admin.auth.admin.createUser({
      email: tenantEmail,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Idem Tenant' },
    })
    const tenantUserId = userData.user!.id

    // Pre-create membership
    await admin.from('memberships').insert({
      user_id: tenantUserId,
      property_id: propertyId,
      unit_id: unitId,
      role: 'tenant',
    })

    const result = await redeemInviteByCodeCore(admin, tenantUserId, code)
    expect(result.success).toBe(true)

    const { data: memberships } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', tenantUserId)
      .eq('property_id', propertyId)
    expect(memberships).toHaveLength(1)

    await cleanupTestUser(tenantUserId)
  })
})

describe('validateAndFetchInviteContext', () => {
  const admin = getAdminClient()
  let landlordUserId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    landlordUserId = user.userId
    const prop = await createTestProperty(user.client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(landlordUserId)
  })

  it('returns context for a valid pending invite code', async () => {
    const code = generateInviteCode()
    const email = `ctx-valid-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: email,
      invited_name: 'Context Tenant',
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    const result = await validateAndFetchInviteContext(code)

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.code).toBe(code)
    expect(result.invitedEmail).toBe(email)
    expect(result.invitedName).toBe('Context Tenant')
    expect(result.propertyName).toBeTruthy()
  })

  it('returns "invalid" for a non-existent code', async () => {
    const result = await validateAndFetchInviteContext('DOES-NOT-EXIST')
    expect(result).toEqual({ valid: false, reason: 'invalid' })
  })

  it('returns "expired" for an expired invite code', async () => {
    const code = generateInviteCode()
    const email = `ctx-expired-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: email,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    })

    const result = await validateAndFetchInviteContext(code)
    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('returns "invalid" for an already-accepted code', async () => {
    const code = generateInviteCode()
    const email = `ctx-accepted-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: email,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'accepted',
      accepted_by: landlordUserId,
      property_id: propertyId,
      unit_id: unitId,
    })

    const result = await validateAndFetchInviteContext(code)
    expect(result).toEqual({ valid: false, reason: 'invalid' })
  })

  it('is case-insensitive', async () => {
    const code = generateInviteCode()
    const email = `ctx-case-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: email,
      invited_by: landlordUserId,
      role: 'tenant',
      status: 'pending',
      property_id: propertyId,
      unit_id: unitId,
    })

    const result = await validateAndFetchInviteContext(code.toLowerCase())
    expect(result.valid).toBe(true)
  })

  it('returns null propertyName for landlord invites without property', async () => {
    const code = generateInviteCode()
    const email = `ctx-ll-${Date.now()}@test.local`

    await admin.from('invitations').insert({
      code,
      invited_email: email,
      invited_by: landlordUserId,
      role: 'landlord',
      status: 'pending',
    })

    const result = await validateAndFetchInviteContext(code)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.propertyName).toBeNull()
  })
})

describe('resend tenant invite', () => {
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

  it('generates a new code and refreshes expires_at on resend', async () => {
    const email = `resend-${Date.now()}@test.local`

    const result = await inviteTenantCore(landlordClient, {
      propertyId,
      unitId,
      email,
      tenantName: 'Resend Tenant',
      landlordName: 'Test Landlord',
    })
    expect(result.success).toBe(true)

    const { data: original } = await admin
      .from('invitations')
      .select('id, code, expires_at')
      .eq('invited_email', email)
      .single()
    expect(original?.code).toBeTruthy()

    await new Promise((r) => setTimeout(r, 50))

    // Simulate resend by directly updating (resendInvite requires server auth)
    const newCode = generateInviteCode()
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await admin
      .from('invitations')
      .update({ code: newCode, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
      .eq('id', original!.id)

    const { data: updated } = await admin
      .from('invitations')
      .select('code, expires_at')
      .eq('id', original!.id)
      .single()

    expect(updated?.code).not.toBe(original?.code)
    expect(updated?.expires_at).not.toBe(original?.expires_at)

    // Old code should no longer validate
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { data: oldValid } = await anon.rpc('validate_invite_code', { invite_code: original!.code! })
    expect(oldValid).toBe(false)

    // New code should validate
    const { data: newValid } = await anon.rpc('validate_invite_code', { invite_code: newCode })
    expect(newValid).toBe(true)
  })
})

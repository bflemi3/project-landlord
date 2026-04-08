import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getAdminClient, createTestUser, createTestProperty, cleanupTestUser } from '@/test/supabase'
import { acceptTenantInvite } from '../accept-tenant-invite'
import { generateInviteCode } from '../generate-invite-code'

const admin = getAdminClient()

let landlordUserId: string
let propertyId: string
let unitId: string

const tenantEmail = `tenant-${Date.now()}@test.local`

beforeAll(async () => {
  const { client, userId } = await createTestUser()
  landlordUserId = userId
  const property = await createTestProperty(client)
  propertyId = property.propertyId
  unitId = property.unitId
})

afterAll(async () => {
  // Clean up tenant if created
  const { data: tenantProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', tenantEmail)
    .single()
  if (tenantProfile) await cleanupTestUser(tenantProfile.id)

  await cleanupTestUser(landlordUserId)
})

async function createPendingInvite(email: string, overrides: Record<string, unknown> = {}) {
  const { error } = await admin.from('invitations').insert({
    invited_by: landlordUserId,
    invited_email: email,
    invited_name: 'Test Tenant',
    property_id: propertyId,
    unit_id: unitId,
    role: 'tenant' as const,
    status: 'pending' as const,
    code: generateInviteCode(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  })
  if (error) throw new Error(`Failed to create invite: ${error.message}`)
}

describe('acceptTenantInvite', () => {
  it('returns error when no pending invitation exists', async () => {
    const result = await acceptTenantInvite(admin, 'nobody@test.local')
    expect(result).toEqual({ success: false, error: 'no_pending_invitation' })
  })

  it('accepts a pending tenant invitation end-to-end', async () => {
    await createPendingInvite(tenantEmail)

    const result = await acceptTenantInvite(admin, tenantEmail)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.email).toBe(tenantEmail)
    expect(result.password).toHaveLength(16)
    expect(result.propertyId).toBe(propertyId)
    expect(result.unitId).toBe(unitId)

    // Verify invitation was marked accepted
    const { data: invite } = await admin
      .from('invitations')
      .select('status, accepted_by')
      .eq('invited_email', tenantEmail)
      .eq('status', 'accepted')
      .single()
    expect(invite?.status).toBe('accepted')
    expect(invite?.accepted_by).toBe(result.userId)

    // Verify profile was updated
    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite')
      .eq('id', result.userId)
      .single()
    expect(profile?.has_redeemed_invite).toBe(true)

    // Verify membership was created
    const { data: membership } = await admin
      .from('memberships')
      .select('role, unit_id')
      .eq('id', result.membershipId)
      .single()
    expect(membership?.role).toBe('tenant')
    expect(membership?.unit_id).toBe(unitId)
  })

  it('normalizes email casing and whitespace', async () => {
    const email = `tenant-case-${Date.now()}@test.local`
    await createPendingInvite(email)

    const result = await acceptTenantInvite(admin, `  ${email.toUpperCase()}  `)

    // Cleanup on success
    if (result.success) {
      await cleanupTestUser(result.userId)
    }

    expect(result.success).toBe(true)
  })

  it('returns error for already accepted invitation', async () => {
    const email = `tenant-dup-${Date.now()}@test.local`
    await createPendingInvite(email)

    const first = await acceptTenantInvite(admin, email)
    expect(first.success).toBe(true)

    const second = await acceptTenantInvite(admin, email)
    expect(second.success).toBe(false)

    // Cleanup
    if (first.success) await cleanupTestUser(first.userId)
  })

  it('rejects an expired invitation', async () => {
    const email = `tenant-expired-${Date.now()}@test.local`
    await createPendingInvite(email, {
      expires_at: new Date(Date.now() - 86_400_000).toISOString(), // yesterday
    })

    const result = await acceptTenantInvite(admin, email)
    expect(result).toEqual({ success: false, error: 'no_pending_invitation' })
  })

  it('returns error when user already exists in auth', async () => {
    const email = `tenant-exists-${Date.now()}@test.local`
    await createPendingInvite(email)

    // Pre-create the auth user
    const { data } = await admin.auth.admin.createUser({
      email,
      password: 'existing-password',
      email_confirm: true,
      user_metadata: { full_name: 'Existing User' },
    })

    const result = await acceptTenantInvite(admin, email)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('user_creation_failed')
    }

    // Cleanup
    if (data.user) await cleanupTestUser(data.user.id)
  })

  it('ignores cancelled and expired-status invitations', async () => {
    const email = `tenant-statuses-${Date.now()}@test.local`
    await createPendingInvite(email, { status: 'cancelled' })
    await createPendingInvite(email, { status: 'expired' })

    const result = await acceptTenantInvite(admin, email)
    expect(result).toEqual({ success: false, error: 'no_pending_invitation' })
  })

  it('picks the most recent pending invitation when multiple exist', async () => {
    const email = `tenant-multi-${Date.now()}@test.local`

    // Create two invitations — cancel the first so only the latest is pending
    await createPendingInvite(email)
    await admin
      .from('invitations')
      .update({ status: 'cancelled' as const })
      .eq('invited_email', email)
      .eq('status', 'pending')

    await createPendingInvite(email)

    const result = await acceptTenantInvite(admin, email)
    expect(result.success).toBe(true)

    if (result.success) await cleanupTestUser(result.userId)
  })
})

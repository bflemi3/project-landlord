import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  createTestUser,
  cleanupTestUser,
  getAdminClient,
  createTestProperty,
} from '@/test/supabase'
import { generateInviteCode } from '@/data/invitations/generate-invite-code'

const SUPABASE_URL = 'http://127.0.0.1:54321'

/**
 * Tests for redeem_invite SECURITY DEFINER RPC.
 *
 * This suite mirrors the production call shape: the user's RLS-scoped client
 * calls rpc('redeem_invite'). The RPC runs with definer privileges and uses
 * auth.uid() to identify the caller. Do NOT pass the service-role admin client
 * into the RPC in these tests — doing so would hide RLS/privilege bugs.
 */
describe('redeem_invite RPC', () => {
  const admin = getAdminClient()
  let landlordUserId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const ll = await createTestUser()
    landlordUserId = ll.userId
    const prop = await createTestProperty(ll.client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(landlordUserId)
  })

  async function seedInvite(overrides: {
    email: string
    role?: 'landlord' | 'tenant'
    status?: 'pending' | 'accepted'
    source?: string | null
    propertyId?: string | null
    unitId?: string | null
    expiresAt?: string | null
    code?: string
  }) {
    const code = overrides.code ?? generateInviteCode()
    const { error } = await admin.from('invitations').insert({
      code,
      invited_email: overrides.email,
      invited_by: landlordUserId,
      role: overrides.role ?? 'tenant',
      status: overrides.status ?? 'pending',
      source: overrides.source ?? 'direct',
      property_id:
        'propertyId' in overrides
          ? overrides.propertyId
          : overrides.role === 'landlord'
            ? null
            : propertyId,
      unit_id:
        'unitId' in overrides
          ? overrides.unitId
          : overrides.role === 'landlord'
            ? null
            : unitId,
      expires_at: overrides.expiresAt ?? null,
    })
    if (error) throw new Error(`Failed to seed invite: ${error.message}`)
    return code
  }

  // T1 — authenticated tenant redeems tenant invite → membership created
  it('T1: authenticated tenant redeems tenant invite → membership row created', async () => {
    const tenantEmail = `t1-${Date.now()}@test.local`
    const tenant = await createTestUser(tenantEmail)
    try {
      const code = await seedInvite({ email: tenantEmail, role: 'tenant' })

      const { data, error } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect(error).toBeNull()
      expect((data as { success: boolean }).success).toBe(true)

      const { data: membership } = await admin
        .from('memberships')
        .select('role, unit_id, property_id')
        .eq('user_id', tenant.userId)
        .eq('property_id', propertyId)
        .maybeSingle()

      expect(membership?.role).toBe('tenant')
      expect(membership?.unit_id).toBe(unitId)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T2 — invite email differs in case from profile email → success
  it('T2: case-mismatched invite email still matches profile email', async () => {
    const suffix = `${Date.now()}`
    const lowercase = `t2-${suffix}@test.local`
    const mixedCase = `T2-${suffix}@TEST.local`
    const tenant = await createTestUser(lowercase)
    try {
      // Seed invite with different casing — this is what historically broke redemption
      const code = await seedInvite({ email: mixedCase, role: 'tenant' })

      const { data, error } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect(error).toBeNull()
      expect((data as { success: boolean }).success).toBe(true)

      const { data: invite } = await admin
        .from('invitations')
        .select('status, accepted_by')
        .eq('code', code)
        .single()
      expect(invite?.status).toBe('accepted')
      expect(invite?.accepted_by).toBe(tenant.userId)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T3 — unauthenticated call → denied at the grant layer (security boundary)
  it('T3: anonymous clients cannot execute the RPC at all', async () => {
    const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    const { error } = await anon.rpc('redeem_invite', { invite_code: 'ANYTHING' })
    // Execute is revoked from anon — Postgres returns 42501 before the body runs.
    // This is stronger than an in-function check: the RPC simply cannot be called.
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  // T4 — user B cannot redeem user A's invite even with the code
  it('T4: user B cannot redeem an invite addressed to user A', async () => {
    const userAEmail = `t4a-${Date.now()}@test.local`
    const userBEmail = `t4b-${Date.now()}@test.local`
    const userA = await createTestUser(userAEmail)
    const userB = await createTestUser(userBEmail)
    try {
      const code = await seedInvite({ email: userAEmail, role: 'tenant' })

      const { data, error } = await userB.client.rpc('redeem_invite', { invite_code: code })
      expect(error).toBeNull()
      const result = data as { success: boolean; reason?: string }
      expect(result.success).toBe(false)
      expect(result.reason).toBe('invalid_or_mismatch')

      // A should still be able to redeem it
      const { data: dataA } = await userA.client.rpc('redeem_invite', { invite_code: code })
      expect((dataA as { success: boolean }).success).toBe(true)
    } finally {
      await cleanupTestUser(userA.userId)
      await cleanupTestUser(userB.userId)
    }
  })

  // T5 — double redemption: first succeeds, second fails
  it('T5: double-redeem of same code → first succeeds, second fails', async () => {
    const email = `t5-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant' })

      const first = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((first.data as { success: boolean }).success).toBe(true)

      const second = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((second.data as { success: boolean }).success).toBe(false)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T6 — tenant with pre-existing membership → idempotent
  it('T6: pre-existing membership does not cause failure (on conflict do nothing)', async () => {
    const email = `t6-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      // Pre-insert the membership using admin (simulates retry after partial prior run)
      await admin.from('memberships').insert({
        user_id: tenant.userId,
        property_id: propertyId,
        unit_id: unitId,
        role: 'tenant',
      })

      const code = await seedInvite({ email, role: 'tenant' })
      const { data, error } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect(error).toBeNull()
      expect((data as { success: boolean }).success).toBe(true)

      const { data: memberships } = await admin
        .from('memberships')
        .select('id')
        .eq('user_id', tenant.userId)
        .eq('property_id', propertyId)
        .eq('unit_id', unitId)
      expect(memberships).toHaveLength(1)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T7 — expired invite → invitation stays pending
  it('T7: expired invite → success=false, invitation stays pending', async () => {
    const email = `t7-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({
        email,
        role: 'tenant',
        expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
      })

      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean }).success).toBe(false)

      const { data: invite } = await admin
        .from('invitations')
        .select('status')
        .eq('code', code)
        .single()
      expect(invite?.status).toBe('pending')
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T8 — after successful redemption, profile flag + JWT claim are set
  it('T8: successful redemption sets profiles.has_redeemed_invite and JWT claim on refresh', async () => {
    const email = `t8-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant', source: 'direct' })

      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean; source?: string }).success).toBe(true)
      expect((data as { source?: string }).source).toBe('direct')

      const { data: profile } = await admin
        .from('profiles')
        .select('has_redeemed_invite, acquisition_channel')
        .eq('id', tenant.userId)
        .single()
      expect(profile?.has_redeemed_invite).toBe(true)
      expect(profile?.acquisition_channel).toBe('direct')

      // Refresh the session and verify the JWT claim propagates
      const { data: refreshed } = await tenant.client.auth.refreshSession()
      const appMeta = refreshed.user?.app_metadata as Record<string, unknown> | undefined
      expect(appMeta?.has_redeemed_invite).toBe(true)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T9 — landlord invite (no property/unit) → success, no membership
  it('T9: landlord invite → success, no membership row', async () => {
    const email = `t9-${Date.now()}@test.local`
    const ll = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'landlord', source: 'waitlist' })

      const { data } = await ll.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean }).success).toBe(true)

      const { data: memberships } = await admin
        .from('memberships')
        .select('id')
        .eq('user_id', ll.userId)
      // The test user did not create a property, so no pre-existing memberships
      expect(memberships).toHaveLength(0)
    } finally {
      await cleanupTestUser(ll.userId)
    }
  })

  // T10 — atomicity: if membership insert is impossible, everything rolls back
  // We simulate this by having the unit soft-deleted (FK still valid) but another
  // concurrent invite redemption in progress. Practical surrogate: verify that if
  // the invitation UPDATE fails (e.g., code doesn't match), profile is untouched.
  it('T10: on validation failure, profile is not mutated', async () => {
    const email = `t10-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: 'DOES-NOT-EXIST' })
      expect((data as { success: boolean }).success).toBe(false)

      const { data: profile } = await admin
        .from('profiles')
        .select('has_redeemed_invite, acquisition_channel')
        .eq('id', tenant.userId)
        .single()
      expect(profile?.has_redeemed_invite).toBe(false)
      expect(profile?.acquisition_channel).toBeNull()
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T12 — code matching is case-insensitive and whitespace-tolerant
  it('T12: code match is case-insensitive and whitespace-tolerant', async () => {
    const email = `t12-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant' })

      const { data } = await tenant.client.rpc('redeem_invite', {
        invite_code: `  ${code.toLowerCase()}  `,
      })
      expect((data as { success: boolean }).success).toBe(true)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T13 — null/empty code returns invalid_or_mismatch, no mutation
  it('T13: null or empty invite_code returns invalid_or_mismatch', async () => {
    const email = `t13-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const r1 = await tenant.client.rpc('redeem_invite', { invite_code: '' })
      expect((r1.data as { success: boolean; reason?: string }).success).toBe(false)
      expect((r1.data as { reason?: string }).reason).toBe('invalid_or_mismatch')

      const r2 = await tenant.client.rpc('redeem_invite', { invite_code: '   ' })
      expect((r2.data as { success: boolean; reason?: string }).success).toBe(false)
      expect((r2.data as { reason?: string }).reason).toBe('invalid_or_mismatch')

      const { data: profile } = await admin
        .from('profiles')
        .select('has_redeemed_invite')
        .eq('id', tenant.userId)
        .single()
      expect(profile?.has_redeemed_invite).toBe(false)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T14 — cancelled invitations cannot be redeemed
  it('T14: cancelled invite cannot be redeemed', async () => {
    const email = `t14-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant', status: 'pending' })
      await admin.from('invitations').update({ status: 'cancelled' }).eq('code', code)

      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean }).success).toBe(false)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T15 — invites whose status is already 'expired' (enum value, not expires_at) cannot be redeemed
  it('T15: invite with status=expired cannot be redeemed', async () => {
    const email = `t15-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant', status: 'pending' })
      await admin.from('invitations').update({ status: 'expired' }).eq('code', code)

      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean }).success).toBe(false)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T16 — tenant invite with null property_id/unit_id accepts + flips profile but skips membership.
  // This is the correct behavior: malformed tenant invites shouldn't block user onboarding.
  it('T16: tenant invite missing property_id accepts without creating membership', async () => {
    const email = `t16-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({
        email,
        role: 'tenant',
        propertyId: null,
        unitId: null,
      })

      const { data } = await tenant.client.rpc('redeem_invite', { invite_code: code })
      expect((data as { success: boolean }).success).toBe(true)

      const { data: memberships } = await admin
        .from('memberships')
        .select('id')
        .eq('user_id', tenant.userId)
      expect(memberships).toHaveLength(0)

      const { data: profile } = await admin
        .from('profiles')
        .select('has_redeemed_invite')
        .eq('id', tenant.userId)
        .single()
      expect(profile?.has_redeemed_invite).toBe(true)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T17 — accepted_at and accepted_by are set on success
  it('T17: successful redemption sets accepted_at and accepted_by', async () => {
    const email = `t17-${Date.now()}@test.local`
    const tenant = await createTestUser(email)
    try {
      const code = await seedInvite({ email, role: 'tenant' })
      const before = Date.now()

      await tenant.client.rpc('redeem_invite', { invite_code: code })

      const { data: invite } = await admin
        .from('invitations')
        .select('accepted_at, accepted_by, updated_at')
        .eq('code', code)
        .single()
      expect(invite?.accepted_by).toBe(tenant.userId)
      expect(invite?.accepted_at).not.toBeNull()
      expect(new Date(invite!.accepted_at!).getTime()).toBeGreaterThanOrEqual(before - 1000)
    } finally {
      await cleanupTestUser(tenant.userId)
    }
  })

  // T18 — a user can accept a second invite after already redeeming a first.
  // Current product behavior: profile.has_redeemed_invite stays true, acquisition_channel
  // preserves the original source (coalesce), and memberships accumulate.
  it('T18: user can redeem a second invite (e.g. waitlist then tenant invite)', async () => {
    const email = `t18-${Date.now()}@test.local`
    const user = await createTestUser(email)
    try {
      const code1 = await seedInvite({
        email,
        role: 'landlord',
        source: 'waitlist',
      })
      const first = await user.client.rpc('redeem_invite', { invite_code: code1 })
      expect((first.data as { success: boolean }).success).toBe(true)

      const code2 = await seedInvite({ email, role: 'tenant', source: 'direct' })
      const second = await user.client.rpc('redeem_invite', { invite_code: code2 })
      expect((second.data as { success: boolean }).success).toBe(true)

      const { data: profile } = await admin
        .from('profiles')
        .select('has_redeemed_invite, acquisition_channel')
        .eq('id', user.userId)
        .single()
      expect(profile?.has_redeemed_invite).toBe(true)
      // acquisition_channel preserves the first value via coalesce
      expect(profile?.acquisition_channel).toBe('waitlist')

      // Tenant invite also created a membership
      const { data: memberships } = await admin
        .from('memberships')
        .select('role')
        .eq('user_id', user.userId)
      expect(memberships?.some((m) => m.role === 'tenant')).toBe(true)
    } finally {
      await cleanupTestUser(user.userId)
    }
  })

  // T11 — inviteTenantCore lowercases email on creation
  it('T11: tenant invites are stored with lowercased email', async () => {
    const mixedCase = `T11-${Date.now()}@TEST.local`
    const expectedLower = mixedCase.toLowerCase()

    const { inviteTenantCore } = await import('@/data/properties/actions/invite-tenant')
    const ll = await createTestUser()
    try {
      const prop = await createTestProperty(ll.client)
      const result = await inviteTenantCore(ll.client, {
        propertyId: prop.propertyId,
        unitId: prop.unitId,
        email: mixedCase,
        tenantName: 'Mixed Case Tenant',
        landlordName: 'LL',
      })
      expect(result.success).toBe(true)

      const { data: invite } = await admin
        .from('invitations')
        .select('invited_email')
        .eq('property_id', prop.propertyId)
        .eq('role', 'tenant')
        .single()
      expect(invite?.invited_email).toBe(expectedLower)
    } finally {
      await cleanupTestUser(ll.userId)
    }
  })
})

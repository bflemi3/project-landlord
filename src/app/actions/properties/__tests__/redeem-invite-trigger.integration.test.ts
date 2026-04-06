import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, cleanupTestUser, getAdminClient } from '@/test/supabase'
import { redeemInviteByCodeCore } from '@/app/actions/redeem-invite-by-code'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('redeem_invite_code trigger', () => {
  const admin = getAdminClient()
  // We need a "system" user to own the invitations (FK constraint)
  let systemUserId: string

  beforeAll(async () => {
    const user = await createTestUser()
    systemUserId = user.userId
  })

  afterAll(async () => {
    await cleanupTestUser(systemUserId)
  })

  it('sets has_redeemed_invite and acquisition_channel on profile when invite code is valid', async () => {
    const inviteCode = `TEST-${Date.now()}`
    await admin.from('invitations').insert({
      code: inviteCode,
      invited_email: 'trigger-test@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      source: 'waitlist',
    })

    // Create user with invite_code in metadata — triggers redeem_invite_code
    const email = `trigger-test-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Trigger Test', invite_code: inviteCode },
    })
    const userId = userData.user!.id

    // Check profile
    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(true)
    expect(profile?.acquisition_channel).toBe('waitlist')

    // Check invitation was accepted
    const { data: invite } = await admin
      .from('invitations')
      .select('status, accepted_by')
      .eq('code', inviteCode)
      .single()

    expect(invite?.status).toBe('accepted')
    expect(invite?.accepted_by).toBe(userId)

    // Cleanup
    await admin.from('properties').delete().eq('created_by', userId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('leaves has_redeemed_invite false when no invite code in metadata', async () => {
    const email = `no-invite-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'No Invite User' },
    })
    const userId = userData.user!.id

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(false)
    expect(profile?.acquisition_channel).toBeNull()

    // Cleanup
    await admin.auth.admin.deleteUser(userId)
  })

  it('handles invitation with null source gracefully', async () => {
    const inviteCode = `NOSRC-${Date.now()}`
    await admin.from('invitations').insert({
      code: inviteCode,
      invited_email: 'nosrc@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      source: null,
    })

    const email = `nosrc-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'No Source User', invite_code: inviteCode },
    })
    const userId = userData.user!.id

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(true)
    expect(profile?.acquisition_channel).toBeNull()

    // Cleanup
    await admin.from('properties').delete().eq('created_by', userId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('does not redeem when invite code in metadata does not match any invitation', async () => {
    const email = `bad-code-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Bad Code User', invite_code: 'FAKE-CODE-12345' },
    })
    const userId = userData.user!.id

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(false)
    expect(profile?.acquisition_channel).toBeNull()

    await admin.auth.admin.deleteUser(userId)
  })

  it('does not redeem an expired invitation', async () => {
    const inviteCode = `EXPIRED-${Date.now()}`
    await admin.from('invitations').insert({
      code: inviteCode,
      invited_email: 'expired@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      source: 'waitlist',
      expires_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
    })

    const email = `expired-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Expired Invite User', invite_code: inviteCode },
    })
    const userId = userData.user!.id

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(false)
    expect(profile?.acquisition_channel).toBeNull()

    await admin.auth.admin.deleteUser(userId)
  })
})

describe('redeemInviteByCodeCore (callback-style redemption)', () => {
  const admin = getAdminClient()
  let systemUserId: string
  let systemClient: SupabaseClient<any>

  beforeAll(async () => {
    const user = await createTestUser()
    systemUserId = user.userId
    systemClient = user.client
  })

  afterAll(async () => {
    await cleanupTestUser(systemUserId)
  })

  it('sets has_redeemed_invite and acquisition_channel on profile (simulates Google OAuth)', async () => {
    // Create a user WITHOUT invite_code in metadata (like Google OAuth creates)
    const email = `oauth-test-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'OAuth User' },
    })
    const userId = userData.user!.id

    // Verify profile starts without invite
    const { data: beforeProfile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(beforeProfile?.has_redeemed_invite).toBe(false)
    expect(beforeProfile?.acquisition_channel).toBeNull()

    // Create invitation
    const inviteCode = `OAUTH-${Date.now()}`
    await admin.from('invitations').insert({
      code: inviteCode,
      invited_email: email,
      invited_by: systemUserId,
      role: 'landlord',
      status: 'pending',
      source: 'direct',
    })

    // Sign in as the new user to get an authenticated client
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient('http://127.0.0.1:54321', process.env.SUPABASE_ANON_KEY!)
    await client.auth.signInWithPassword({ email, password: 'test-password-123!' })

    // Redeem via core function (what the callback route should do)
    const result = await redeemInviteByCodeCore(client as any, userId, inviteCode)

    expect(result.success).toBe(true)
    expect(result.source).toBe('direct')

    // Verify profile was updated
    const { data: afterProfile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(afterProfile?.has_redeemed_invite).toBe(true)
    expect(afterProfile?.acquisition_channel).toBe('direct')

    // Cleanup
    await admin.from('properties').delete().eq('created_by', userId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('returns failure for invalid invite code and does not update profile', async () => {
    const email = `invalid-code-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Invalid Code User' },
    })
    const userId = userData.user!.id

    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient('http://127.0.0.1:54321', process.env.SUPABASE_ANON_KEY!)
    await client.auth.signInWithPassword({ email, password: 'test-password-123!' })

    const result = await redeemInviteByCodeCore(client as any, userId, 'DOES-NOT-EXIST')
    expect(result.success).toBe(false)

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(false)
    expect(profile?.acquisition_channel).toBeNull()

    await admin.auth.admin.deleteUser(userId)
  })

  it('returns failure for already-accepted invite code', async () => {
    const inviteCode = `USED-${Date.now()}`
    await admin.from('invitations').insert({
      code: inviteCode,
      invited_email: 'used@test.local',
      invited_by: systemUserId,
      role: 'landlord',
      status: 'accepted',
      accepted_by: systemUserId,
      source: 'direct',
    })

    const email = `reuse-${Date.now()}@test.local`
    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Reuse Code User' },
    })
    const userId = userData.user!.id

    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient('http://127.0.0.1:54321', process.env.SUPABASE_ANON_KEY!)
    await client.auth.signInWithPassword({ email, password: 'test-password-123!' })

    const result = await redeemInviteByCodeCore(client as any, userId, inviteCode)
    expect(result.success).toBe(false)

    const { data: profile } = await admin
      .from('profiles')
      .select('has_redeemed_invite, acquisition_channel')
      .eq('id', userId)
      .single()

    expect(profile?.has_redeemed_invite).toBe(false)
    expect(profile?.acquisition_channel).toBeNull()

    await admin.auth.admin.deleteUser(userId)
  })
})

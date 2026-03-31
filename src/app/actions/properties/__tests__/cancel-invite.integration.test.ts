import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { inviteTenantCore } from '../invite-tenant'
import { cancelInviteCore } from '../cancel-invite'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('cancelInviteCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let propertyId: string
  let unitId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
    unitId = prop.unitId
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('cancels a pending invitation (status becomes cancelled)', async () => {
    const email = `cancel-${Date.now()}@test.local`

    // Create an invitation
    await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: null,
      landlordName: '',
    })

    // Find the invitation
    const admin = getAdminClient()
    const { data: invite } = await admin
      .from('invitations')
      .select('id')
      .eq('invited_email', email)
      .eq('status', 'pending')
      .single()

    expect(invite).not.toBeNull()

    // Cancel it
    const result = await cancelInviteCore(client, invite!.id)
    expect(result.success).toBe(true)

    // Verify status
    const { data: cancelled } = await admin
      .from('invitations')
      .select('status')
      .eq('id', invite!.id)
      .single()

    expect(cancelled?.status).toBe('cancelled')
  })

  it('allows re-inviting after cancellation (no duplicate conflict)', async () => {
    const email = `reinvite-${Date.now()}@test.local`

    // Create and cancel
    await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: null,
      landlordName: '',
    })

    const admin = getAdminClient()
    const { data: invite } = await admin
      .from('invitations')
      .select('id')
      .eq('invited_email', email)
      .eq('status', 'pending')
      .single()

    await cancelInviteCore(client, invite!.id)

    // Re-invite the same email — should succeed since old one is cancelled
    const result = await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: null,
      landlordName: '',
    })

    expect(result.success).toBe(true)

    // Verify there are now two rows: one cancelled, one pending
    const { data: allInvites } = await admin
      .from('invitations')
      .select('status')
      .eq('invited_email', email)
      .eq('property_id', propertyId)
      .eq('unit_id', unitId)

    expect(allInvites).toHaveLength(2)
    expect(allInvites!.filter((i) => i.status === 'cancelled')).toHaveLength(1)
    expect(allInvites!.filter((i) => i.status === 'pending')).toHaveLength(1)
  })
})

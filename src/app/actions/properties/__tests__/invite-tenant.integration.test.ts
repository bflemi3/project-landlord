import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { inviteTenantCore } from '../invite-tenant'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('inviteTenantCore', () => {
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

  it('creates a pending invitation with correct fields', async () => {
    const email = `tenant-${Date.now()}@test.local`
    const result = await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: 'Jane Doe',
      landlordName: 'Test Landlord',
    })

    expect(result.success).toBe(true)

    // Verify via admin client
    const admin = getAdminClient()
    const { data } = await admin
      .from('invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('unit_id', unitId)
      .eq('invited_email', email)
      .single()

    expect(data).not.toBeNull()
    expect(data?.status).toBe('pending')
    expect(data?.invited_name).toBe('Jane Doe')
    expect(data?.role).toBe('tenant')
    expect(data?.invited_by).toBe(userId)
  })

  it('rejects duplicate pending invitation for same email', async () => {
    const email = `dup-${Date.now()}@test.local`

    // First invitation
    const first = await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: null,
      landlordName: '',
    })
    expect(first.success).toBe(true)

    // Duplicate
    const second = await inviteTenantCore(client, {
      propertyId,
      unitId,
      email,
      tenantName: null,
      landlordName: '',
    })
    expect(second.success).toBe(false)
    expect(second.errors?.email).toBe('alreadyInvited')
  })

  it('rejects when not authenticated', async () => {
    // Create an unauthenticated client
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY!,
    )

    const result = await inviteTenantCore(anonClient as any, {
      propertyId,
      unitId,
      email: 'nobody@test.local',
      tenantName: null,
      landlordName: '',
    })

    expect(result.success).toBe(false)
    expect(result.errors?.general).toBe('notAuthenticated')
  })
})

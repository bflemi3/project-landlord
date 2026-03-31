import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProperty,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'
import { removeTenantCore } from '../remove-tenant'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('removeTenantCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let propertyId: string
  let unitId: string
  let membershipId: string

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    const prop = await createTestProperty(client)
    propertyId = prop.propertyId
    unitId = prop.unitId

    // Seed a tenant membership via admin client
    const admin = getAdminClient()

    // Create a second user to act as tenant
    const tenantEmail = `tenant-${Date.now()}@test.local`
    const { data: tenantUser } = await admin.auth.admin.createUser({
      email: tenantEmail,
      password: 'tenant-pass-123!',
      email_confirm: true,
      user_metadata: { full_name: 'Test Tenant' },
    })

    const { data: membership, error } = await admin
      .from('memberships')
      .insert({
        property_id: propertyId,
        unit_id: unitId,
        user_id: tenantUser.user!.id,
        role: 'tenant',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to seed tenant membership: ${error.message}`)
    membershipId = membership!.id
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  it('soft-deletes membership (sets deleted_at, row still exists)', async () => {
    const result = await removeTenantCore(client, membershipId)
    expect(result.success).toBe(true)

    // Verify via admin — row still exists but has deleted_at
    const admin = getAdminClient()
    const { data } = await admin
      .from('memberships')
      .select('*')
      .eq('id', membershipId)
      .single()

    expect(data).not.toBeNull()
    expect(data?.deleted_at).not.toBeNull()
  })
})

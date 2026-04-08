import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { deleteBillDocumentCore } from './delete-bill-document'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('deleteBillDocument (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  let tenantId: string

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: authUser } = await admin.auth.admin.createUser({
      email: `landlord-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    userId = authUser.user!.id

    const { data: tenantUser } = await admin.auth.admin.createUser({
      email: `tenant-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    tenantId = tenantUser.user!.id

    const { data: prop } = await admin.from('properties').insert({
      name: 'Test Property',
      created_by: userId,
    }).select('id').single()
    propertyId = prop!.id

    await admin.from('memberships').insert([
      { property_id: propertyId, user_id: userId, role: 'landlord' },
      { property_id: propertyId, user_id: tenantId, role: 'tenant' },
    ])

    const { data: unit } = await admin.from('units').insert({
      property_id: propertyId,
      name: 'Unit 1',
    }).select('id').single()
    unitId = unit!.id
  })

  afterAll(async () => {
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
    await admin.auth.admin.deleteUser(tenantId)
  })

  it('deletes storage file and DB row', async () => {
    const path = `test-integration/${crypto.randomUUID()}.pdf`
    const testFile = new Blob(['test content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(path, testFile)

    const { data: doc } = await admin.from('source_documents').insert({
      unit_id: unitId,
      file_path: path,
      file_name: 'to-delete.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 12,
      period_year: 2026,
      period_month: 4,
      uploaded_by: userId,
      ingestion_status: 'uploaded',
    }).select('id').single()

    const result = await deleteBillDocumentCore(admin as never, doc!.id)
    expect(result.success).toBe(true)

    const { data: check } = await admin.from('source_documents').select('id').eq('id', doc!.id).single()
    expect(check).toBeNull()
  })

  it('returns failure for non-existent document', async () => {
    const result = await deleteBillDocumentCore(admin as never, crypto.randomUUID())
    expect(result.success).toBe(false)
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSourceDocumentUrlCore } from './get-source-document-url'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('getSourceDocumentUrl (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  let documentId: string
  const storagePath = `test-integration/${crypto.randomUUID()}.pdf`

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: authUser } = await admin.auth.admin.createUser({
      email: `test-${crypto.randomUUID()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    userId = authUser.user!.id

    const { data: prop } = await admin.from('properties').insert({
      name: 'Test Property',
      created_by: userId,
    }).select('id').single()
    propertyId = prop!.id

    await admin.from('memberships').insert({
      property_id: propertyId,
      user_id: userId,
      role: 'landlord',
    })

    const { data: unit } = await admin.from('units').insert({
      property_id: propertyId,
      name: 'Unit 1',
    }).select('id').single()
    unitId = unit!.id

    const testFile = new Blob(['test pdf content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(storagePath, testFile)

    const { data: doc } = await admin.from('source_documents').insert({
      unit_id: unitId,
      file_path: storagePath,
      file_name: 'test.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 16,
      period_year: 2026,
      period_month: 4,
      uploaded_by: userId,
      ingestion_status: 'uploaded',
    }).select('id').single()
    documentId = doc!.id
  })

  afterAll(async () => {
    await admin.storage.from('source-documents').remove([storagePath])
    await admin.from('source_documents').delete().eq('id', documentId)
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('returns a signed URL for a valid document', async () => {
    const result = await getSourceDocumentUrlCore(admin as never, documentId)
    expect(result.url).toBeTruthy()
    expect(result.url).toContain('/storage/v1/')
  })

  it('returns null for non-existent document', async () => {
    const result = await getSourceDocumentUrlCore(admin as never, crypto.randomUUID())
    expect(result.url).toBeNull()
  })
})

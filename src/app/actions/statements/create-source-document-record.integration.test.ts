import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createSourceDocumentRecordCore, type CreateSourceDocumentInput } from './create-source-document-record'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('createSourceDocumentRecord (integration)', () => {
  let admin: ReturnType<typeof createClient>
  let landlordClient: ReturnType<typeof createClient>
  let propertyId: string
  let unitId: string
  let userId: string
  const createdDocIds: string[] = []

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const email = `landlord-${crypto.randomUUID()}@example.com`
    const { data: authUser } = await admin.auth.admin.createUser({
      email,
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

    landlordClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    await landlordClient.auth.signInWithPassword({ email, password: 'test-password-123' })
  })

  afterAll(async () => {
    for (const id of createdDocIds) {
      await admin.from('source_documents').delete().eq('id', id)
    }
    await admin.from('units').delete().eq('id', unitId)
    await admin.from('memberships').delete().eq('property_id', propertyId)
    await admin.from('properties').delete().eq('id', propertyId)
    await admin.auth.admin.deleteUser(userId)
  })

  it('creates a DB row and returns the document ID', async () => {
    const input: CreateSourceDocumentInput = {
      unitId,
      filePath: `test-integration/${crypto.randomUUID()}.pdf`,
      fileName: 'created-doc.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 999,
      periodYear: 2026,
      periodMonth: 4,
    }

    const result = await createSourceDocumentRecordCore(landlordClient as never, input)
    expect(result.documentId).toBeTruthy()
    createdDocIds.push(result.documentId!)

    const { data: doc } = await admin.from('source_documents')
      .select('file_name, uploaded_by')
      .eq('id', result.documentId!)
      .single()
    expect(doc!.file_name).toBe('created-doc.pdf')
    expect(doc!.uploaded_by).toBe(userId)
  })
})

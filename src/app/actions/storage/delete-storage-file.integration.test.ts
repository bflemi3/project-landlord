import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { deleteStorageFileCore } from './delete-storage-file'

const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('deleteStorageFile (integration)', () => {
  let admin: ReturnType<typeof createClient>

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  })

  it('removes a file from the specified bucket', async () => {
    const path = `test-integration/${crypto.randomUUID()}.pdf`
    const testFile = new Blob(['test content'], { type: 'application/pdf' })
    await admin.storage.from('source-documents').upload(path, testFile)

    const result = await deleteStorageFileCore(admin as never, 'source-documents', path)
    expect(result.success).toBe(true)

    const { data } = await admin.storage.from('source-documents').download(path)
    expect(data).toBeNull()
  })

  it('returns success even for non-existent file (Supabase remove is idempotent)', async () => {
    const result = await deleteStorageFileCore(
      admin as never,
      'source-documents',
      `test-integration/does-not-exist-${crypto.randomUUID()}.pdf`,
    )
    expect(result.success).toBe(true)
  })
})

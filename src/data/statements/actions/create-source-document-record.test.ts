import { describe, it, expect, vi } from 'vitest'
import { createSourceDocumentRecordCore, type CreateSourceDocumentInput } from './create-source-document-record'

function createMockSupabase(userId: string | null, docId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: docId ? { id: docId } : null,
            error: docId ? null : { message: 'Insert failed' },
          }),
        }),
      }),
    }),
  } as never
}

const baseInput: CreateSourceDocumentInput = {
  unitId: 'unit-1',
  filePath: 'unit-1/2026-04/abc.pdf',
  fileName: 'bill.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 12345,
  periodYear: 2026,
  periodMonth: 4,
}

describe('createSourceDocumentRecordCore', () => {
  it('creates a DB row and returns the document ID', async () => {
    const supabase = createMockSupabase('user-1', 'doc-456')
    const result = await createSourceDocumentRecordCore(supabase, baseInput)
    expect(result).toEqual({ documentId: 'doc-456' })
    expect(supabase.from).toHaveBeenCalledWith('source_documents')
  })

  it('returns null documentId when not authenticated', async () => {
    const supabase = createMockSupabase(null, null)
    const result = await createSourceDocumentRecordCore(supabase, baseInput)
    expect(result).toEqual({ documentId: null })
  })

  it('returns null documentId when insert fails', async () => {
    const supabase = createMockSupabase('user-1', null)
    const result = await createSourceDocumentRecordCore(supabase, baseInput)
    expect(result).toEqual({ documentId: null })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { deleteBillDocumentCore } from './delete-bill-document'

function createMockSupabase(docData: { file_path: string } | null) {
  const deleteFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: docData,
            error: docData ? null : { message: 'Not found' },
          }),
        }),
      }),
      delete: deleteFn,
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  } as never
}

describe('deleteBillDocumentCore', () => {
  it('deletes storage file and DB row for valid document', async () => {
    const supabase = createMockSupabase({ file_path: 'unit-1/2026-04/abc.pdf' })
    const result = await deleteBillDocumentCore(supabase, 'doc-123')
    expect(result).toEqual({ success: true })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
    expect(supabase.storage.from('source-documents').remove).toHaveBeenCalledWith(['unit-1/2026-04/abc.pdf'])
  })

  it('returns failure for non-existent document', async () => {
    const supabase = createMockSupabase(null)
    const result = await deleteBillDocumentCore(supabase, 'missing-doc')
    expect(result).toEqual({ success: false })
  })
})

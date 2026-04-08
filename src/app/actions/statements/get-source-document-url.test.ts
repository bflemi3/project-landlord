import { describe, it, expect, vi } from 'vitest'
import { getSourceDocumentUrlCore } from './get-source-document-url'

function createMockSupabase(docData: { file_path: string } | null, signedUrl: string | null) {
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
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: signedUrl ? { signedUrl } : null,
          error: signedUrl ? null : { message: 'Failed' },
        }),
      }),
    },
  } as never
}

describe('getSourceDocumentUrlCore', () => {
  it('returns a signed URL for a valid document', async () => {
    const supabase = createMockSupabase(
      { file_path: 'unit-1/2026-04/abc.pdf' },
      'https://example.com/signed-url',
    )
    const result = await getSourceDocumentUrlCore(supabase, 'doc-123')
    expect(result).toEqual({ url: 'https://example.com/signed-url' })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
  })

  it('returns null url for non-existent document', async () => {
    const supabase = createMockSupabase(null, null)
    const result = await getSourceDocumentUrlCore(supabase, 'missing-doc')
    expect(result).toEqual({ url: null })
  })

  it('returns null url when signed URL creation fails', async () => {
    const supabase = createMockSupabase(
      { file_path: 'unit-1/2026-04/abc.pdf' },
      null,
    )
    const result = await getSourceDocumentUrlCore(supabase, 'doc-123')
    expect(result).toEqual({ url: null })
  })
})

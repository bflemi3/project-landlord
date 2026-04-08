import { describe, it, expect, vi } from 'vitest'
import { deleteStorageFileCore } from './delete-storage-file'

function createMockSupabase(removeError: boolean = false) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          error: removeError ? { message: 'Failed' } : null,
        }),
      }),
    },
  } as never
}

describe('deleteStorageFileCore', () => {
  it('deletes a file from the specified bucket', async () => {
    const supabase = createMockSupabase()
    const result = await deleteStorageFileCore(supabase, 'source-documents', 'unit-1/2026-04/abc.pdf')
    expect(result).toEqual({ success: true })
    expect(supabase.storage.from).toHaveBeenCalledWith('source-documents')
    expect(supabase.storage.from('source-documents').remove).toHaveBeenCalledWith(['unit-1/2026-04/abc.pdf'])
  })

  it('returns failure when storage removal fails', async () => {
    const supabase = createMockSupabase(true)
    const result = await deleteStorageFileCore(supabase, 'source-documents', 'unit-1/2026-04/abc.pdf')
    expect(result).toEqual({ success: false })
  })
})

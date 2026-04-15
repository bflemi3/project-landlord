import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
const mockStorageUpload = vi.fn()
const mockStorageRemove = vi.fn()

vi.mock('@/lib/supabase/assert-engineer', () => ({
  assertEngineer: () => Promise.resolve('user-123'),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      rpc: (...args: unknown[]) => mockRpc(...args),
    }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        remove: (...args: unknown[]) => mockStorageRemove(...args),
      }),
    },
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createProvider } from '../create-provider'

function formDataWith(fields: Record<string, string | File>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v)
  }
  return fd
}

describe('createProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: 'new-provider-id', error: null })
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  it('returns error when name is missing', async () => {
    const result = await createProvider({ success: false }, formDataWith({}))
    expect(result.success).toBe(false)
    expect(result.errors?.name).toBeDefined()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('creates provider via RPC with required fields', async () => {
    const result = await createProvider(
      { success: false },
      formDataWith({ name: 'ENLIV', tax_id: '49449868000162' }),
    )

    expect(result.success).toBe(true)
    expect(result.providerId).toBe('new-provider-id')
    expect(mockRpc).toHaveBeenCalledWith('create_provider_with_bill', expect.objectContaining({
      p_name: 'ENLIV',
      p_tax_id: '49449868000162',
      p_country_code: 'BR',
      p_bill_storage_path: null,
      p_bill_file_name: null,
    }))
  })

  it('uploads bill then creates provider with bill in single transaction', async () => {
    const file = new File(['pdf-bytes'], 'march-2026.pdf', { type: 'application/pdf' })

    const result = await createProvider(
      { success: false },
      formDataWith({ name: 'ENLIV', bill_file: file }),
    )

    expect(result.success).toBe(true)
    expect(mockStorageUpload).toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledWith('create_provider_with_bill', expect.objectContaining({
      p_name: 'ENLIV',
      p_bill_file_name: 'march-2026.pdf',
    }))
    // Storage path should be passed to RPC
    const rpcArgs = mockRpc.mock.calls[0][1]
    expect(rpcArgs.p_bill_storage_path).toContain('/march-2026.pdf')
  })

  it('skips bill when upload fails, storage path is null so RPC does not insert test bill', async () => {
    mockStorageUpload.mockResolvedValue({ error: { message: 'upload failed' } })
    const file = new File(['pdf-bytes'], 'bad.pdf', { type: 'application/pdf' })

    const result = await createProvider(
      { success: false },
      formDataWith({ name: 'ENLIV', bill_file: file }),
    )

    expect(result.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('create_provider_with_bill', expect.objectContaining({
      p_bill_storage_path: null,
    }))
  })

  it('cleans up uploaded file when DB transaction fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RLS violation', code: '42501' } })
    const file = new File(['pdf-bytes'], 'bill.pdf', { type: 'application/pdf' })

    const result = await createProvider(
      { success: false },
      formDataWith({ name: 'ENLIV', bill_file: file }),
    )

    expect(result.success).toBe(false)
    expect(mockStorageRemove).toHaveBeenCalled()
  })

  it('does not upload or insert bill when no file provided', async () => {
    await createProvider({ success: false }, formDataWith({ name: 'ENLIV' }))
    expect(mockStorageUpload).not.toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledWith('create_provider_with_bill', expect.objectContaining({
      p_bill_storage_path: null,
      p_bill_file_name: null,
    }))
  })
})

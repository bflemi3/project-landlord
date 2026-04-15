import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExtractText = vi.fn()
const mockExtractCnpjs = vi.fn()

vi.mock('@/lib/supabase/assert-engineer', () => ({
  assertEngineer: () => Promise.resolve('user-123'),
}))

vi.mock('@/lib/billing-intelligence/extraction/pdf', () => ({
  extractTextFromPdf: (...args: unknown[]) => mockExtractText(...args),
}))

vi.mock('@/lib/billing-intelligence/identification/cnpj-extract', () => ({
  extractCnpjsFromText: (...args: unknown[]) => mockExtractCnpjs(...args),
}))

import { extractCnpjsFromBill } from '../extract-cnpjs-from-bill'

function createFormDataWithFile(file: File): FormData {
  const formData = new FormData()
  formData.set('file', file)
  return formData
}

describe('extractCnpjsFromBill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when no file provided', async () => {
    const result = await extractCnpjsFromBill(new FormData())
    expect(result.success).toBe(false)
    expect(result.message).toContain('No file')
  })

  it('returns error for non-PDF files', async () => {
    const file = new File(['text'], 'test.txt', { type: 'text/plain' })
    const result = await extractCnpjsFromBill(createFormDataWithFile(file))
    expect(result.success).toBe(false)
    expect(result.message).toContain('PDF')
  })

  it('returns found CNPJs from PDF', async () => {
    mockExtractText.mockResolvedValue('CNPJ: 49.449.868/0001-62 some text 00.000.000/0001-91')
    mockExtractCnpjs.mockReturnValue(['49449868000162', '00000000000191'])

    const file = new File(['pdf-bytes'], 'bill.pdf', { type: 'application/pdf' })
    const result = await extractCnpjsFromBill(createFormDataWithFile(file))

    expect(result.success).toBe(true)
    expect(result.cnpjs).toEqual(['49449868000162', '00000000000191'])
  })

  it('returns empty array with message when no CNPJs found', async () => {
    mockExtractText.mockResolvedValue('no tax ids here')
    mockExtractCnpjs.mockReturnValue([])

    const file = new File(['pdf-bytes'], 'bill.pdf', { type: 'application/pdf' })
    const result = await extractCnpjsFromBill(createFormDataWithFile(file))

    expect(result.success).toBe(true)
    expect(result.cnpjs).toEqual([])
    expect(result.message).toContain('No CNPJs found')
  })

  it('handles PDF read failure gracefully', async () => {
    mockExtractText.mockRejectedValue(new Error('corrupt PDF'))

    const file = new File(['bad-bytes'], 'corrupt.pdf', { type: 'application/pdf' })
    const result = await extractCnpjsFromBill(createFormDataWithFile(file))

    expect(result.success).toBe(false)
    expect(result.message).toContain('PDF extraction failed')
  })
})

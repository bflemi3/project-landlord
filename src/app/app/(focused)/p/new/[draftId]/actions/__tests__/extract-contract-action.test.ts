import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContractExtractionResponse } from '@/lib/contract-extraction/types'

const mockExtractContract = vi.fn()

vi.mock('@/lib/contract-extraction/extract-contract', () => ({
  extractContract: (...args: unknown[]) => mockExtractContract(...args),
}))

import { extractContractAction } from '../extract-contract-action'

beforeEach(() => {
  mockExtractContract.mockReset()
})

function makeFormData(file: File | Blob | null, fileType = 'pdf'): FormData {
  const fd = new FormData()
  if (file) fd.set('file', file)
  fd.set('fileType', fileType)
  return fd
}

function makeFile(
  content: string,
  name = 'contract.pdf',
  type = 'application/pdf',
): File {
  return new File([content], name, { type })
}

describe('extractContractAction', () => {
  it('happy path: valid file calls engine and returns response verbatim', async () => {
    const engineResponse: ContractExtractionResponse = {
      success: true,
      data: {
        isRentalContract: true,
        propertyType: 'apartment',
        address: null,
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: 'some text',
        modelId: 'claude-sonnet-4-6',
        schemaVersion: 1,
      },
    }
    mockExtractContract.mockResolvedValueOnce(engineResponse)

    const fd = makeFormData(makeFile('pdf content'))
    const result = await extractContractAction(fd)

    expect(result).toEqual(engineResponse)
    expect(mockExtractContract).toHaveBeenCalledOnce()

    const callArg = mockExtractContract.mock.calls[0]![0] as {
      fileBuffer: Buffer | Uint8Array
      fileType: string
    }
    expect(callArg.fileType).toBe('pdf')
    expect(Buffer.isBuffer(callArg.fileBuffer)).toBe(true)
  })

  it('missing file entry returns empty_file without calling engine', async () => {
    const fd = new FormData()
    fd.set('fileType', 'pdf')

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'empty_file' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })

  it('file exceeding 10 MB returns file_too_large without calling engine', async () => {
    const bigContent = new Uint8Array(10 * 1024 * 1024 + 1)
    const bigFile = new File([bigContent], 'big.pdf', {
      type: 'application/pdf',
    })
    const fd = makeFormData(bigFile)

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'file_too_large' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })

  it('engine throwing returns extraction_failed (never propagates)', async () => {
    mockExtractContract.mockRejectedValueOnce(new Error('unexpected boom'))

    const fd = makeFormData(makeFile('pdf content'))
    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'extraction_failed' },
    })
  })

  it('engine returning a failure response is passed through verbatim', async () => {
    const failureResponse: ContractExtractionResponse = {
      success: false,
      error: { code: 'not_a_contract' },
    }
    mockExtractContract.mockResolvedValueOnce(failureResponse)

    const fd = makeFormData(makeFile('pdf content'))
    const result = await extractContractAction(fd)

    expect(result).toEqual(failureResponse)
  })

  it('passes docx fileType through to the engine', async () => {
    mockExtractContract.mockResolvedValueOnce({
      success: true,
      data: {
        isRentalContract: true,
        propertyType: null,
        address: null,
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'en',
        rawExtractedText: 'text',
        modelId: 'claude-sonnet-4-6',
        schemaVersion: 1,
      },
    })

    const fd = makeFormData(
      makeFile('docx content', 'contract.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      'docx',
    )
    const result = await extractContractAction(fd)

    expect(result.success).toBe(true)
    const callArg = mockExtractContract.mock.calls[0][0] as {
      fileType: string
    }
    expect(callArg.fileType).toBe('docx')
  })

  it('string file entry returns empty_file without calling engine', async () => {
    const fd = new FormData()
    fd.set('file', 'not-a-file')
    fd.set('fileType', 'pdf')

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'empty_file' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })

  it('zero-byte file returns empty_file without calling engine', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' })
    const fd = makeFormData(emptyFile)

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'empty_file' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })

  it('rejects missing fileType with unsupported_format', async () => {
    const fd = new FormData()
    fd.set('file', makeFile('pdf content'))

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'unsupported_format' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })

  it('rejects invalid fileType with unsupported_format', async () => {
    const fd = new FormData()
    fd.set('file', makeFile('some content'))
    fd.set('fileType', 'png')

    const result = await extractContractAction(fd)

    expect(result).toEqual({
      success: false,
      error: { code: 'unsupported_format' },
    })
    expect(mockExtractContract).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, type UploadFileOptions, type UploadFileResult } from './upload-file'

// Mock XMLHttpRequest
function createMockXHR() {
  const xhr: Record<string, unknown> = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    upload: { onprogress: null as ((e: ProgressEvent) => void) | null },
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    status: 200,
    readyState: 4,
  }
  return xhr
}

let mockXHR: ReturnType<typeof createMockXHR>

beforeEach(() => {
  mockXHR = createMockXHR()
  vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR))
})

afterEach(() => {
  vi.restoreAllMocks()
})

const baseOptions: UploadFileOptions = {
  file: new File(['test content'], 'bill.pdf', { type: 'application/pdf' }),
  bucket: 'source-documents',
  path: 'unit-1/2026-04/abc.pdf',
  authToken: 'test-token-123',
  supabaseUrl: 'http://localhost:54321',
}

describe('uploadFile', () => {
  it('constructs the correct URL from bucket, path, and supabaseUrl', () => {
    uploadFile(baseOptions)

    expect(mockXHR.open).toHaveBeenCalledWith(
      'POST',
      'http://localhost:54321/storage/v1/object/source-documents/unit-1/2026-04/abc.pdf',
      true,
    )
  })

  it('sets authorization header and content type', () => {
    uploadFile(baseOptions)

    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-token-123')
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
  })

  it('sends the file as the request body', () => {
    uploadFile(baseOptions)

    expect(mockXHR.send).toHaveBeenCalledWith(baseOptions.file)
  })

  it('resolves with success on HTTP 200', async () => {
    const promise = uploadFile(baseOptions)

    mockXHR.status = 200
    ;(mockXHR.onload as () => void)()

    const result = await promise
    expect(result).toEqual({ success: true })
  })

  it('resolves with error on non-200 status', async () => {
    const promise = uploadFile(baseOptions)

    mockXHR.status = 403
    ;(mockXHR.onload as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Upload failed with status 403' })
  })

  it('calls onProgress with increasing percentages', async () => {
    const onProgress = vi.fn()
    uploadFile({ ...baseOptions, onProgress })

    const progressHandler = mockXHR.upload.onprogress as (e: ProgressEvent) => void
    progressHandler({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
    progressHandler({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent)

    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('ignores progress events where lengthComputable is false', () => {
    const onProgress = vi.fn()
    uploadFile({ ...baseOptions, onProgress })

    const progressHandler = mockXHR.upload.onprogress as (e: ProgressEvent) => void
    progressHandler({ lengthComputable: false, loaded: 0, total: 0 } as ProgressEvent)

    expect(onProgress).not.toHaveBeenCalled()
  })

  it('resolves with error on network failure', async () => {
    const promise = uploadFile(baseOptions)

    ;(mockXHR.onerror as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Network error during upload' })
  })

  it('aborts the XHR when signal is aborted', async () => {
    const controller = new AbortController()
    const promise = uploadFile({ ...baseOptions, signal: controller.signal })

    controller.abort()

    ;(mockXHR.onabort as () => void)()

    const result = await promise
    expect(result).toEqual({ success: false, error: 'Upload aborted' })
    expect(mockXHR.abort).toHaveBeenCalled()
  })

  it('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await uploadFile({ ...baseOptions, signal: controller.signal })
    expect(result).toEqual({ success: false, error: 'Upload aborted' })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { createRef, type MutableRefObject } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { FileUpload } from './file-upload'
import type { UploadFileResult } from '@/lib/storage/upload-file'

// Mock the upload utility
vi.mock('@/lib/storage/upload-file', () => ({
  uploadFile: vi.fn(),
}))

// Mock next-intl
const messages = {
  propertyDetail: {
    tapToAttachBill: 'Tap to attach a bill',
    uploaded: 'Uploaded',
    fileTooLarge: 'File is too large. Maximum size is {max}MB.',
    uploadFailed: 'Upload failed. Please try again.',
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

afterEach(cleanup)

describe('FileUpload', () => {
  describe('display modes', () => {
    it('renders dropzone when no file or URL is provided', () => {
      renderWithIntl(<FileUpload />)
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })

    it('renders file card with name when uploadedUrl is provided', () => {
      renderWithIntl(
        <FileUpload
          uploadedUrl="https://example.com/bill.pdf"
          uploadedFileName="electricity-bill.pdf"
        />,
      )
      expect(screen.getByText('electricity-bill.pdf')).toBeInTheDocument()
      expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
    })

    it('renders file card when file is provided', () => {
      const file = new File(['content'], 'water-bill.pdf', { type: 'application/pdf' })
      renderWithIntl(<FileUpload file={file} />)
      expect(screen.getByText('water-bill.pdf')).toBeInTheDocument()
    })

    it('shows Eye icon link when uploadedUrl is provided', () => {
      renderWithIntl(
        <FileUpload
          uploadedUrl="https://example.com/bill.pdf"
          uploadedFileName="bill.pdf"
        />,
      )
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://example.com/bill.pdf')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('file selection', () => {
    it('calls onFileSelect when a file is picked', () => {
      const onFileSelect = vi.fn()
      renderWithIntl(<FileUpload onFileSelect={onFileSelect} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).toHaveBeenCalledWith(file, undefined)
    })

    it('calls onClear when X button is clicked', () => {
      const onClear = vi.fn()
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      renderWithIntl(<FileUpload file={file} onClear={onClear} />)

      const clearButton = screen.getByTestId('file-clear-btn')
      fireEvent.click(clearButton)

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('upload orchestration', () => {
    let mockUploadFile: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const mod = await import('@/lib/storage/upload-file')
      mockUploadFile = mod.uploadFile as ReturnType<typeof vi.fn>
      mockUploadFile.mockReset()
    })

    const uploadProps = {
      bucket: 'source-documents',
      storagePath: 'unit-1/2026-04/abc.pdf',
      authToken: 'test-token',
      supabaseUrl: 'http://localhost:54321',
    }

    it('starts upload on file select when upload props are provided', async () => {
      mockUploadFile.mockResolvedValue({ success: true })
      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          bucket: 'source-documents',
          path: 'unit-1/2026-04/abc.pdf',
          authToken: 'test-token',
          supabaseUrl: 'http://localhost:54321',
        }),
      )
    })

    it('sets uploadPromiseRef during upload and clears on complete', async () => {
      let resolveUpload: (value: UploadFileResult) => void
      const uploadPromise = new Promise<UploadFileResult>((resolve) => {
        resolveUpload = resolve
      })
      mockUploadFile.mockReturnValue(uploadPromise)

      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(ref.current).not.toBeNull()

      resolveUpload!({ success: true })
      await waitFor(() => expect(ref.current).toBeNull())
    })

    it('aborts upload when onClear is called during upload', async () => {
      let resolveUpload: (value: UploadFileResult) => void
      mockUploadFile.mockReturnValue(
        new Promise<UploadFileResult>((resolve) => { resolveUpload = resolve }),
      )

      const ref = createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null
      const onClear = vi.fn()

      renderWithIntl(
        <FileUpload
          {...uploadProps}
          uploadPromiseRef={ref}
          onFileSelect={vi.fn()}
          onClear={onClear}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'bill.pdf', { type: 'application/pdf' })
      fireEvent.change(input, { target: { files: [file] } })

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )

      const callArgs = mockUploadFile.mock.calls[0][0]
      const signal = callArgs.signal as AbortSignal

      const clearButton = screen.getByTestId('file-clear-btn')
      fireEvent.click(clearButton)

      expect(signal.aborted).toBe(true)
      expect(onClear).toHaveBeenCalled()
    })
  })
})

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
  fileUpload: {
    tapToAttach: 'Tap to attach a bill',
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
        <FileUpload uploadedUrl="https://example.com/bill.pdf" uploadedFileName="bill.pdf" />,
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

  describe('labels override', () => {
    it('renders custom dropzone label when labels prop is provided', () => {
      renderWithIntl(<FileUpload labels={{ dropzone: 'Drop your contract here' }} />)
      expect(screen.getByText('Drop your contract here')).toBeInTheDocument()
      expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
    })

    it('falls back to i18n translations when labels prop is absent', () => {
      renderWithIntl(<FileUpload />)
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })
  })

  describe('hint styling', () => {
    it('uses semantic warning tokens for hint pill, not hardcoded amber', () => {
      renderWithIntl(<FileUpload hint="Max 10MB" />)
      const hintEl = screen.getByText('Max 10MB')
      expect(hintEl).toBeInTheDocument()
      expect(hintEl.className).toContain('bg-warning-subtle')
      expect(hintEl.className).toContain('text-warning-subtle-foreground')
      expect(hintEl.className).not.toContain('amber')
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
      const ref =
        createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(<FileUpload {...uploadProps} uploadPromiseRef={ref} onFileSelect={vi.fn()} />)

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

      const ref =
        createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
      ref.current = null

      renderWithIntl(<FileUpload {...uploadProps} uploadPromiseRef={ref} onFileSelect={vi.fn()} />)

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
        new Promise<UploadFileResult>((resolve) => {
          resolveUpload = resolve
        }),
      )

      const ref =
        createRef<Promise<UploadFileResult> | null>() as MutableRefObject<Promise<UploadFileResult> | null>
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

  describe('error slot', () => {
    it('replaces dropzone with the provided error node when error prop is set', () => {
      renderWithIntl(<FileUpload error={<div>Something broke</div>} />)

      expect(screen.getByText('Something broke')).toBeInTheDocument()
      expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
    })
  })

  describe('onValidationError', () => {
    it('fires file_too_large and suppresses the built-in error text when handler is provided', () => {
      const onValidationError = vi.fn()
      const onFileSelect = vi.fn()
      renderWithIntl(
        <FileUpload
          maxSizeMB={1}
          onFileSelect={onFileSelect}
          onValidationError={onValidationError}
        />,
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const big = new File([new Uint8Array(2 * 1024 * 1024)], 'huge.pdf', {
        type: 'application/pdf',
      })
      fireEvent.change(input, { target: { files: [big] } })

      expect(onValidationError).toHaveBeenCalledWith('file_too_large', big)
      expect(onFileSelect).not.toHaveBeenCalled()
      expect(screen.queryByText(/too large/i)).not.toBeInTheDocument()
    })

    it('falls back to local error text when onValidationError is not provided', () => {
      renderWithIntl(<FileUpload maxSizeMB={1} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const big = new File([new Uint8Array(2 * 1024 * 1024)], 'huge.pdf', {
        type: 'application/pdf',
      })
      fireEvent.change(input, { target: { files: [big] } })

      expect(screen.getByText(/too large/i)).toBeInTheDocument()
    })
  })

  describe('desktop drag hint', () => {
    it('renders labels.dropzoneDrag when provided', () => {
      renderWithIntl(<FileUpload labels={{ dropzoneDrag: 'or drop one here' }} />)
      expect(screen.getByText('or drop one here')).toBeInTheDocument()
    })

    it('omits the drag hint when not provided', () => {
      renderWithIntl(<FileUpload />)
      expect(screen.queryByText(/drop one here/i)).not.toBeInTheDocument()
    })
  })

  describe('drag and drop', () => {
    function getDropzone(container: HTMLElement) {
      // Card element is the first child of FileUpload's outer div
      return container.querySelector('[role="button"]') as HTMLElement
    }

    function makeDataTransfer(file: File | null) {
      return {
        files: file ? ([file] as unknown as FileList) : ([] as unknown as FileList),
        types: ['Files'],
        dropEffect: 'none',
      }
    }

    it('accepts a dropped file via onFileSelect', () => {
      const onFileSelect = vi.fn()
      const { container } = renderWithIntl(<FileUpload onFileSelect={onFileSelect} />)
      const dropzone = getDropzone(container)
      const file = new File(['x'], 'dragged.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropzone, { dataTransfer: makeDataTransfer(file) })

      expect(onFileSelect).toHaveBeenCalledWith(file, undefined)
    })

    it('marks dropzone with data-dragging during dragenter', () => {
      const { container } = renderWithIntl(<FileUpload />)
      const dropzone = getDropzone(container)

      fireEvent.dragEnter(dropzone, { dataTransfer: makeDataTransfer(null) })

      expect(dropzone).toHaveAttribute('data-dragging', 'true')
    })

    it('clears dragging state on dragleave', () => {
      const { container } = renderWithIntl(<FileUpload />)
      const dropzone = getDropzone(container)

      fireEvent.dragEnter(dropzone, { dataTransfer: makeDataTransfer(null) })
      expect(dropzone).toHaveAttribute('data-dragging', 'true')

      fireEvent.dragLeave(dropzone, { dataTransfer: makeDataTransfer(null) })

      expect(dropzone).not.toHaveAttribute('data-dragging')
    })

    it('rejects an oversized dropped file with the fileTooLarge label', () => {
      const onFileSelect = vi.fn()
      const { container } = renderWithIntl(<FileUpload onFileSelect={onFileSelect} maxSizeMB={1} />)
      const dropzone = getDropzone(container)
      const big = new File([new Uint8Array(2 * 1024 * 1024)], 'huge.pdf', {
        type: 'application/pdf',
      })

      fireEvent.drop(dropzone, { dataTransfer: makeDataTransfer(big) })

      expect(onFileSelect).not.toHaveBeenCalled()
      expect(screen.getByText(/too large/i)).toBeInTheDocument()
    })

    it('ignores drag events that are not file drags', () => {
      const { container } = renderWithIntl(<FileUpload />)
      const dropzone = getDropzone(container)

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { files: [] as unknown as FileList, types: ['text/plain'] },
      })

      expect(dropzone).not.toHaveAttribute('data-dragging')
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const enMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'),
) as Record<string, unknown>
import type { ContractExtractionResponse, ContractExtractionResult, ContractExtractionErrorCode } from '@/lib/contract-extraction/types'

// --- Mocks -------------------------------------------------------------

const mockExtractContractAction = vi.fn<(fd: FormData) => Promise<ContractExtractionResponse>>()
vi.mock('../../actions/extract-contract-action', () => ({
  extractContractAction: (fd: FormData) => mockExtractContractAction(fd),
}))

const mockCapture = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}))

const mockToast = { message: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn() }
vi.mock('sonner', () => ({
  toast: mockToast,
}))

const mockUseReducedMotion = vi.fn(() => false)
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

// --- Fixtures -----------------------------------------------------------

function makeExtractionResult(
  overrides: Partial<ContractExtractionResult> = {},
): ContractExtractionResult {
  return {
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
    rawExtractedText: 'text',
    ...overrides,
  }
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as unknown as Record<string, unknown>}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function makePdfFile(name = 'contract.pdf', size = 1024): File {
  const content = new Uint8Array(size)
  return new File([content], name, { type: 'application/pdf' })
}

async function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

// --- Tests --------------------------------------------------------------

beforeEach(() => {
  mockExtractContractAction.mockReset()
  mockCapture.mockReset()
  mockToast.message.mockReset()
  mockToast.info.mockReset()
  mockToast.success.mockReset()
  mockToast.error.mockReset()
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(cleanup)

describe('UploadContract', () => {
  describe('initial render', () => {
    it('renders hero title and description', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)
      expect(screen.getByText('Upload your rental contract')).toBeInTheDocument()
      expect(screen.getByText("We'll read it and fill in the rest.")).toBeInTheDocument()
    })

    it('renders dropzone with contract-specific copy', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)
      expect(screen.getByText('Choose a PDF or DOCX')).toBeInTheDocument()
    })

    it('renders the "I don\'t have a contract" link', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)
      expect(screen.getByText('Set up without a contract')).toBeInTheDocument()
    })

    it('renders file chip when initialFile provided', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract onExtracted={vi.fn()} initialFile={makePdfFile('existing.pdf')} />,
      )
      expect(screen.getByText('existing.pdf')).toBeInTheDocument()
    })

    it('initialFile does not re-trigger extraction', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract onExtracted={vi.fn()} initialFile={makePdfFile('existing.pdf')} />,
      )
      expect(mockExtractContractAction).not.toHaveBeenCalled()
    })
  })

  describe('file selection — happy path', () => {
    it('fires contract_upload_started with fileType and size on pick', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: true,
        data: makeExtractionResult(),
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile('c.pdf', 2048))

      expect(mockCapture).toHaveBeenCalledWith('contract_upload_started', {
        fileType: 'pdf',
        fileSizeBytes: 2048,
      })
    })

    it('selecting an unsupported file type shows unsupported_format without calling the action', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      const txt = new File(['content'], 'notes.txt', { type: 'text/plain' })
      await selectFile(txt)

      expect(mockExtractContractAction).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText('Only PDF and DOCX are supported.')).toBeInTheDocument()
      })
    })

    it('detects docx from extension and passes fileType=docx to the action', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: true,
        data: makeExtractionResult(),
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      const docx = new File([new Uint8Array(1024)], 'c.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      await selectFile(docx)

      await waitFor(() => expect(mockExtractContractAction).toHaveBeenCalledTimes(1))
      const fd = mockExtractContractAction.mock.calls[0]![0]
      expect(fd.get('fileType')).toBe('docx')
      expect(fd.get('file')).toBeInstanceOf(File)
    })

    it('renders ExtractionLoading while pending', async () => {
      let resolveAction: (r: ContractExtractionResponse) => void = () => {}
      mockExtractContractAction.mockImplementation(
        () => new Promise<ContractExtractionResponse>((resolve) => { resolveAction = resolve }),
      )
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      // skeleton loading state visible
      expect(document.querySelector('[data-slot="extraction-loading"]')).toBeTruthy()

      await act(async () => {
        resolveAction({ success: true, data: makeExtractionResult() })
      })
    })

    it('fires contract_extraction_completed and calls onExtracted on success', async () => {
      const result = makeExtractionResult({
        address: {
          street: 'Ave',
          number: '1',
          complement: null,
          neighborhood: null,
          city: 'SP',
          state: null,
          postalCode: null,
          country: null,
        },
        rent: { amount: 100000, currency: 'BRL', dueDay: 5, includes: [] },
      })
      mockExtractContractAction.mockResolvedValue({ success: true, data: result })

      const onExtracted = vi.fn()
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={onExtracted} />)

      const file = makePdfFile('c.pdf')
      await selectFile(file)

      await waitFor(() => expect(onExtracted).toHaveBeenCalledTimes(1))

      expect(onExtracted).toHaveBeenCalledWith({
        file,
        fileName: 'c.pdf',
        fileType: 'pdf',
        extractionResult: result,
      })
      expect(mockCapture).toHaveBeenCalledWith('contract_extraction_completed', {
        language: 'pt-br',
        fieldCount: expect.any(Number),
      })
    })
  })

  describe('error paths — every ContractExtractionErrorCode', () => {
    const codes: Array<ContractExtractionErrorCode> = [
      'file_too_large',
      'unsupported_format',
      'corrupt_file',
      'empty_file',
      'no_text_extractable',
      'password_protected',
      'unsupported_language',
      'not_a_contract',
      'extraction_failed',
      'extraction_timeout',
      'rate_limited',
      'api_key_missing',
    ]

    const expectations: Record<ContractExtractionErrorCode, { message: string; cta?: string }> = {
      file_too_large: {
        message: 'Your contract is larger than 10 MB.',
        cta: 'Upload a smaller file',
      },
      unsupported_format: {
        message: 'Only PDF and DOCX are supported.',
        cta: 'Choose another file',
      },
      corrupt_file: { message: "We couldn't read this file.", cta: 'Try another file' },
      empty_file: { message: 'This file is empty.', cta: 'Choose another file' },
      no_text_extractable: {
        message: "We couldn't find any text. Is this a scanned document?",
        cta: 'Upload a digital version',
      },
      password_protected: {
        message: 'This file is password-protected.',
        cta: 'Remove the password and try again',
      },
      unsupported_language: {
        message: "We don't support contracts in this language yet.",
        cta: 'Continue without a contract',
      },
      not_a_contract: {
        message: "This doesn't look like a rental contract.",
        cta: 'Try another file',
      },
      extraction_failed: {
        message: 'Something went wrong on our side.',
        cta: 'Try again',
      },
      extraction_timeout: {
        message: 'This took longer than expected.',
        cta: 'Try again',
      },
      rate_limited: {
        message: "We're experiencing high demand.",
        cta: 'Try again in a moment',
      },
      api_key_missing: {
        message: "We're having trouble reaching our extraction service. Try again later.",
      },
    }

    it.each(codes)('renders i18n message and CTA for code %s', async (code) => {
      mockExtractContractAction.mockResolvedValue({ success: false, error: { code } })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      const { message, cta } = expectations[code]
      await waitFor(() => {
        expect(screen.getByText(message)).toBeInTheDocument()
      })
      if (cta) {
        const action = document.querySelector(
          '[data-slot="file-upload-error-action"]',
        ) as HTMLElement | null
        expect(action).toBeTruthy()
        expect(action?.textContent).toBe(cta)
      } else {
        // api_key_missing has no CTA — verify the error box has no action button
        expect(
          document.querySelector('[data-slot="file-upload-error-action"]'),
        ).toBeNull()
      }

      expect(mockCapture).toHaveBeenCalledWith('contract_extraction_failed', { code })
    })

    it('unsupported_format warning renders error box with data-variant="warning"', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'unsupported_format' },
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        const box = document.querySelector('[data-slot="file-upload-error"]')
        expect(box).toBeTruthy()
        expect(box?.getAttribute('data-variant')).toBe('warning')
      })
    })

    it('extraction_failed renders error box with data-variant="destructive"', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'extraction_failed' },
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        const box = document.querySelector('[data-slot="file-upload-error"]')
        expect(box).toBeTruthy()
        expect(box?.getAttribute('data-variant')).toBe('destructive')
      })
    })

    it('unsupported_language CTA fires the no-contract path', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'unsupported_language' },
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        expect(
          document.querySelector('[data-slot="file-upload-error-action"]'),
        ).toBeTruthy()
      })
      const cta = document.querySelector(
        '[data-slot="file-upload-error-action"]',
      ) as HTMLButtonElement
      await act(async () => {
        fireEvent.click(cta)
      })

      expect(mockCapture).toHaveBeenCalledWith('no_contract_path_clicked')
      const totalToasts =
        mockToast.message.mock.calls.length +
        mockToast.info.mock.calls.length +
        mockToast.success.mock.calls.length +
        mockToast.error.mock.calls.length
      expect(totalToasts).toBeGreaterThan(0)
    })

    it('clicking the error CTA clears the error and restores the dropzone', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'corrupt_file' },
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      const retryBtn = await screen.findByRole('button', { name: 'Try another file' })
      await act(async () => {
        fireEvent.click(retryBtn)
      })

      expect(screen.queryByText("We couldn't read this file.")).not.toBeInTheDocument()
      expect(screen.getByText('Choose a PDF or DOCX')).toBeInTheDocument()
    })
  })

  describe('no-contract link', () => {
    it('fires no_contract_path_clicked and shows toast without navigating', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(mockCapture).toHaveBeenCalledWith('no_contract_path_clicked')
      // Some toast is shown
      const totalToasts =
        mockToast.message.mock.calls.length +
        mockToast.info.mock.calls.length +
        mockToast.success.mock.calls.length +
        mockToast.error.mock.calls.length
      expect(totalToasts).toBeGreaterThan(0)
    })

    it('remains visible when an extraction error is showing', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'corrupt_file' },
      })
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(<UploadContract onExtracted={vi.fn()} />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        expect(screen.getByText("We couldn't read this file.")).toBeInTheDocument()
      })
      expect(screen.getByText('Set up without a contract')).toBeInTheDocument()
    })

    it('clears file + wizard state when clicked while a file is uploaded', async () => {
      const onFileCleared = vi.fn()
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract
          onExtracted={vi.fn()}
          initialFile={makePdfFile('existing.pdf')}
          onFileCleared={onFileCleared}
        />,
      )

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(onFileCleared).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledWith('no_contract_path_clicked')
      // Not a removal — the "no contract" intent supersedes the remove event
      expect(mockCapture).not.toHaveBeenCalledWith('contract_upload_removed')
    })

    it('clears the error state when clicked while an error is showing', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'extraction_failed' },
      })
      const onFileCleared = vi.fn()
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract onExtracted={vi.fn()} onFileCleared={onFileCleared} />,
      )

      await selectFile(makePdfFile())

      await waitFor(() => {
        expect(screen.getByText('Something went wrong on our side.')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(onFileCleared).toHaveBeenCalled()
      expect(
        screen.queryByText('Something went wrong on our side.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('remove flow', () => {
    it('calls onFileCleared and fires contract_upload_removed when clearing an initial file', async () => {
      const onFileCleared = vi.fn()
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract
          onExtracted={vi.fn()}
          initialFile={makePdfFile('existing.pdf')}
          onFileCleared={onFileCleared}
        />,
      )

      const clearBtn = screen.getByTestId('file-clear-btn')
      fireEvent.click(clearBtn)

      expect(onFileCleared).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledWith('contract_upload_removed')
    })
  })

  describe('onFileSelected (pre-extraction persistence)', () => {
    it('calls onFileSelected with file + type before extraction starts', async () => {
      const onFileSelected = vi.fn().mockResolvedValue(undefined)
      let extractionResolved = false
      mockExtractContractAction.mockImplementation(async () => {
        // ensure onFileSelected was called before extraction resolves
        expect(onFileSelected).toHaveBeenCalled()
        extractionResolved = true
        return { success: true, data: makeExtractionResult() }
      })

      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract
          onExtracted={vi.fn()}
          onFileSelected={onFileSelected}
        />,
      )

      await selectFile(makePdfFile('fresh.pdf'))

      await waitFor(() => {
        expect(onFileSelected).toHaveBeenCalledWith(
          expect.any(File),
          'pdf',
        )
      })
      await waitFor(() => {
        expect(extractionResolved).toBe(true)
      })
    })
  })

  describe('autoExtract (resume mid-upload)', () => {
    it('runs extraction on mount when autoExtract + initialFile + initialFileType provided', async () => {
      const onExtracted = vi.fn()
      const result = makeExtractionResult()
      mockExtractContractAction.mockResolvedValue({ success: true, data: result })

      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract
          onExtracted={onExtracted}
          initialFile={makePdfFile('resumed.pdf')}
          initialFileType="pdf"
          autoExtract
        />,
      )

      await waitFor(() => {
        expect(mockExtractContractAction).toHaveBeenCalledTimes(1)
      })
      await waitFor(() => {
        expect(onExtracted).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'resumed.pdf',
            fileType: 'pdf',
            extractionResult: result,
          }),
        )
      })
    })

    it('does NOT run extraction on mount when autoExtract is false', async () => {
      const { UploadContract } = await import('../upload-contract')
      renderWithIntl(
        <UploadContract
          onExtracted={vi.fn()}
          initialFile={makePdfFile('idle.pdf')}
          initialFileType="pdf"
        />,
      )

      // give effects a chance to flush
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockExtractContractAction).not.toHaveBeenCalled()
    })
  })
})

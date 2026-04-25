import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const enMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'),
) as Record<string, unknown>
import type {
  ContractExtractionResponse,
  ContractExtractionResult,
  ContractExtractionErrorCode,
} from '@/lib/contract-extraction/types'

// --- Mocks -------------------------------------------------------------

const mockExtractContractAction = vi.fn<(fd: FormData) => Promise<ContractExtractionResponse>>()
vi.mock('../../../actions/extract-contract-action', () => ({
  extractContractAction: (fd: FormData) => mockExtractContractAction(fd),
}))

const mockCapture = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}))

// Intercept wizard-state persistence so the store's hydrate() + save
// subscriber don't hit real IndexedDB during tests.
const mockLoadWizardState = vi.fn()
const mockSaveWizardState = vi.fn()
const mockClearWizardState = vi.fn()
vi.mock('@/lib/wizard-state', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wizard-state')>(
    '@/lib/wizard-state',
  )
  return {
    ...actual,
    loadWizardState: (...args: unknown[]) => mockLoadWizardState(...args),
    saveWizardState: (...args: unknown[]) => mockSaveWizardState(...args),
    clearWizardState: (...args: unknown[]) => mockClearWizardState(...args),
  }
})

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
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
    >
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

/**
 * Fresh import helper — resets the wizard store singleton so each test
 * gets a clean store. Because the store is a module singleton, we reset its
 * internal state rather than re-importing.
 */
async function freshImport() {
  const storeMod = await import('../../../state/store')
  storeMod.__resetPropertyCreationStoreForTests()
  const { UploadContract } = await import('../upload-contract')
  const store = storeMod.getPropertyCreationStore()
  return { UploadContract, store }
}

// --- Tests --------------------------------------------------------------

beforeEach(() => {
  mockExtractContractAction.mockReset()
  mockCapture.mockReset()
  mockLoadWizardState.mockReset()
  mockLoadWizardState.mockResolvedValue(null)
  mockSaveWizardState.mockReset()
  mockSaveWizardState.mockResolvedValue(undefined)
  mockClearWizardState.mockReset()
  mockClearWizardState.mockResolvedValue(undefined)
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(() => {
  cleanup()
})

describe('UploadContract', () => {
  describe('initial render', () => {
    it('renders hero title and description', async () => {
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)
      expect(screen.getByText('Upload your rental contract')).toBeInTheDocument()
      expect(screen.getByText("We'll read it and fill in the rest.")).toBeInTheDocument()
    })

    it('renders dropzone with contract-specific copy', async () => {
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)
      expect(screen.getByText('Choose a PDF or DOCX')).toBeInTheDocument()
    })

    it('renders the "I don\'t have a contract" link', async () => {
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)
      expect(screen.getByText('Set up without a contract')).toBeInTheDocument()
    })

    it('renders file chip when store has a contract file', async () => {
      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('existing.pdf'),
        contractFileName: 'existing.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
        path: 'contract',
      })
      renderWithIntl(<UploadContract />)
      expect(screen.getByText('existing.pdf')).toBeInTheDocument()
    })

    it('stored file with extraction result does NOT re-trigger extraction', async () => {
      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('existing.pdf'),
        contractFileName: 'existing.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
        path: 'contract',
      })
      renderWithIntl(<UploadContract />)
      // Give effects a chance to flush.
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockExtractContractAction).not.toHaveBeenCalled()
    })
  })

  describe('file selection — happy path', () => {
    it('fires contract_upload_started with fileType and size on pick', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: true,
        data: makeExtractionResult(),
      })
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile('c.pdf', 2048))

      expect(mockCapture).toHaveBeenCalledWith('contract_upload_started', {
        fileType: 'pdf',
        fileSizeBytes: 2048,
      })
    })

    it('selecting an unsupported file type shows unsupported_format without calling the action', async () => {
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

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
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

      const docx = new File([new Uint8Array(1024)], 'c.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      await selectFile(docx)

      await waitFor(() => expect(mockExtractContractAction).toHaveBeenCalledTimes(1))
      const fd = mockExtractContractAction.mock.calls[0]![0]
      expect(fd.get('fileType')).toBe('docx')
      expect(fd.get('file')).toBeInstanceOf(File)
    })

    it('renders the extraction-loading skeleton while pending', async () => {
      let resolveAction: (r: ContractExtractionResponse) => void = () => {}
      mockExtractContractAction.mockImplementation(
        () =>
          new Promise<ContractExtractionResponse>((resolve) => {
            resolveAction = resolve
          }),
      )
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile())

      // skeleton loading state visible
      expect(document.querySelector('[data-slot="extraction-loading"]')).toBeTruthy()

      await act(async () => {
        resolveAction({ success: true, data: makeExtractionResult() })
      })
    })

    it('fires contract_extraction_completed and writes result + path=contract + step=2 to the store on success', async () => {
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

      const { UploadContract, store } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile('c.pdf'))

      await waitFor(() => {
        const s = store.getState()
        expect(s.extractionResult).toEqual(result)
        expect(s.path).toBe('contract')
        expect(s.step).toBe(2)
      })

      expect(mockCapture).toHaveBeenCalledWith('contract_extraction_completed', {
        language: 'pt-br',
        fieldCount: expect.any(Number),
      })

      const finalState = store.getState()
      expect(finalState.contractFile).toBeInstanceOf(File)
      expect(finalState.contractFileName).toBe('c.pdf')
      expect(finalState.contractFileType).toBe('pdf')
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

    const expectations: Record<
      ContractExtractionErrorCode,
      { message: string; cta?: string }
    > = {
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
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

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
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

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
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        const box = document.querySelector('[data-slot="file-upload-error"]')
        expect(box).toBeTruthy()
        expect(box?.getAttribute('data-variant')).toBe('destructive')
      })
    })

    it('unsupported_language CTA fires the no-contract path (step=2, path=no_contract)', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'unsupported_language' },
      })
      const { UploadContract, store } = await freshImport()
      renderWithIntl(<UploadContract />)

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
      const s = store.getState()
      expect(s.step).toBe(2)
      expect(s.path).toBe('no_contract')
    })

    it('clicking the error CTA clears the error and restores the dropzone', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'corrupt_file' },
      })
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

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
    it('fires no_contract_path_clicked and commits store (step=2, path=no_contract)', async () => {
      const { UploadContract, store } = await freshImport()
      renderWithIntl(<UploadContract />)

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(mockCapture).toHaveBeenCalledWith('no_contract_path_clicked')
      const s = store.getState()
      expect(s.step).toBe(2)
      expect(s.path).toBe('no_contract')
    })

    it('remains visible when an extraction error is showing', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'corrupt_file' },
      })
      const { UploadContract } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        expect(screen.getByText("We couldn't read this file.")).toBeInTheDocument()
      })
      expect(screen.getByText('Set up without a contract')).toBeInTheDocument()
    })

    it('clears store file and commits no_contract path when clicked while a file is uploaded', async () => {
      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('existing.pdf'),
        contractFileName: 'existing.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
        path: 'contract',
      })
      renderWithIntl(<UploadContract />)

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(mockCapture).toHaveBeenCalledWith('no_contract_path_clicked')
      // Not a removal — the "no contract" intent supersedes the remove event
      expect(mockCapture).not.toHaveBeenCalledWith('contract_upload_removed')
      const s = store.getState()
      expect(s.step).toBe(2)
      expect(s.path).toBe('no_contract')
      expect(s.contractFile).toBeNull()
      expect(s.extractionResult).toBeNull()
    })

    it('clears the error state when clicked while an error is showing', async () => {
      mockExtractContractAction.mockResolvedValue({
        success: false,
        error: { code: 'extraction_failed' },
      })
      const { UploadContract, store } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile())

      await waitFor(() => {
        expect(screen.getByText('Something went wrong on our side.')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Set up without a contract'))

      expect(
        screen.queryByText('Something went wrong on our side.'),
      ).not.toBeInTheDocument()
      const s = store.getState()
      expect(s.step).toBe(2)
      expect(s.path).toBe('no_contract')
    })
  })

  describe('remove flow', () => {
    it('clears store file and fires contract_upload_removed when clearing the current file', async () => {
      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('existing.pdf'),
        contractFileName: 'existing.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
        path: 'contract',
      })
      renderWithIntl(<UploadContract />)

      const clearBtn = screen.getByTestId('file-clear-btn')
      fireEvent.click(clearBtn)

      expect(mockCapture).toHaveBeenCalledWith('contract_upload_removed')
      expect(store.getState().contractFile).toBeNull()
      expect(store.getState().extractionResult).toBeNull()
    })
  })

  describe('file selection writes to store before extraction resolves', () => {
    it('sets store contractFileType before the extraction action resolves', async () => {
      let resolveAction: (r: ContractExtractionResponse) => void = () => {}
      mockExtractContractAction.mockImplementation(
        () =>
          new Promise<ContractExtractionResponse>((resolve) => {
            resolveAction = resolve
          }),
      )

      const { UploadContract, store } = await freshImport()
      renderWithIntl(<UploadContract />)

      await selectFile(makePdfFile('fresh.pdf'))

      // Store should already have the file type set before we resolve extraction.
      expect(store.getState().contractFileType).toBe('pdf')

      await act(async () => {
        resolveAction({ success: true, data: makeExtractionResult() })
      })
    })
  })

  describe('auto-extract (resume mid-upload)', () => {
    it('runs extraction on mount when the store has a file but no extraction result and no path', async () => {
      const result = makeExtractionResult()
      mockExtractContractAction.mockResolvedValue({ success: true, data: result })

      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('resumed.pdf'),
        contractFileName: 'resumed.pdf',
        contractFileType: 'pdf',
        extractionResult: null,
        path: null,
      })
      renderWithIntl(<UploadContract />)

      await waitFor(() => {
        expect(mockExtractContractAction).toHaveBeenCalledTimes(1)
      })
      await waitFor(() => {
        const s = store.getState()
        expect(s.extractionResult).toEqual(result)
        expect(s.path).toBe('contract')
        expect(s.step).toBe(2)
      })
    })

    it('does NOT auto-extract on mount when the store already has an extraction result', async () => {
      const { UploadContract, store } = await freshImport()
      store.setState({
        contractFile: makePdfFile('idle.pdf'),
        contractFileName: 'idle.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
        path: 'contract',
      })
      renderWithIntl(<UploadContract />)

      // give effects a chance to flush
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockExtractContractAction).not.toHaveBeenCalled()
    })
  })
})

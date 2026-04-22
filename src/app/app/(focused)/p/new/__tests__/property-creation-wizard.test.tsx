import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  PropertyCreationWizardState,
  WizardState,
} from '@/lib/wizard-state'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

const enMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'),
) as Record<string, unknown>

// --- Mocks --------------------------------------------------------------

const mockLoadWizardState = vi.fn()
const mockSaveWizardState = vi.fn()
const mockClearWizardState = vi.fn()

vi.mock('@/lib/wizard-state', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wizard-state')>('@/lib/wizard-state')
  return {
    ...actual,
    loadWizardState: (...args: unknown[]) => mockLoadWizardState(...args),
    saveWizardState: (...args: unknown[]) => mockSaveWizardState(...args),
    clearWizardState: (...args: unknown[]) => mockClearWizardState(...args),
  }
})

const mockCapture = vi.fn()
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}))

vi.mock('sonner', () => ({
  toast: { message: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

// UploadContract is exercised in its own suite — stub it here.
vi.mock('../steps/upload-contract', () => ({
  UploadContract: ({
    initialFile,
    autoExtract,
    initialFileType,
  }: {
    initialFile: File | null
    autoExtract?: boolean
    initialFileType?: 'pdf' | 'docx' | null
  }) => (
    <div
      data-testid="upload-contract-stub"
      data-auto-extract={autoExtract ? 'true' : 'false'}
      data-initial-file-type={initialFileType ?? ''}
    >
      {initialFile ? `initial:${initialFile.name}` : 'empty'}
    </div>
  ),
}))

const mockRouterPrefetch = vi.fn()
const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: mockRouterPrefetch, push: mockRouterPush }),
}))

// motion/react is used downstream — simplest to stub useReducedMotion
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    useReducedMotion: () => false,
  }
})

// --- Helpers ------------------------------------------------------------

function makeExtractionResult(): ContractExtractionResult {
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
  }
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
})

beforeEach(() => {
  mockLoadWizardState.mockReset()
  mockSaveWizardState.mockReset()
  mockClearWizardState.mockReset()
  mockCapture.mockReset()
  mockRouterPrefetch.mockReset()
  mockRouterPush.mockReset()
})

afterEach(cleanup)

describe('PropertyCreationWizard — resume flow', () => {
  it('renders step 1 with no initial file when IndexedDB has no state', async () => {
    mockLoadWizardState.mockResolvedValue(null)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    await waitFor(() => {
      expect(screen.getByTestId('upload-contract-stub')).toHaveTextContent('empty')
    })
    expect(mockCapture).not.toHaveBeenCalledWith(
      'property_creation_wizard_resumed',
      expect.anything(),
    )
  })

  it('resumes to step 2 when IndexedDB has saved state, fires wizard_resumed', async () => {
    const blob = new Blob([new Uint8Array(128)], { type: 'application/pdf' })
    const state: WizardState<PropertyCreationWizardState['data']> = {
      version: 1,
      currentStep: 2,
      updatedAt: '2026-04-21T12:00:00Z',
      data: {
        contractFile: blob,
        contractFileName: 'saved.pdf',
        contractFileType: 'pdf',
        extractionResult: makeExtractionResult(),
      },
    }
    mockLoadWizardState.mockResolvedValue(state)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    await waitFor(() => {
      expect(mockCapture).toHaveBeenCalledWith('property_creation_wizard_resumed', {
        step: 2,
      })
    })

    // Step count label should show step 2
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
  })

  it('stays on step 1 and passes autoExtract when resumed state has a file but no extractionResult', async () => {
    const blob = new Blob([new Uint8Array(64)], { type: 'application/pdf' })
    const state: WizardState<PropertyCreationWizardState['data']> = {
      version: 1,
      currentStep: 1,
      updatedAt: '2026-04-21T12:00:00Z',
      data: {
        contractFile: blob,
        contractFileName: 'interrupted.pdf',
        contractFileType: 'pdf',
        extractionResult: null,
      },
    }
    mockLoadWizardState.mockResolvedValue(state)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    const stub = await screen.findByTestId('upload-contract-stub')
    expect(stub).toHaveAttribute('data-auto-extract', 'true')
    expect(stub).toHaveAttribute('data-initial-file-type', 'pdf')
    expect(stub).toHaveTextContent('initial:interrupted.pdf')
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('uses distinct IDB keys for different draft ids', async () => {
    mockLoadWizardState.mockResolvedValue(null)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    const { rerender } = renderWithIntl(<PropertyCreationWizard draftId="one" />)

    await waitFor(() => {
      expect(mockLoadWizardState).toHaveBeenCalledWith('property-creation:one', {
        expectedVersion: 1,
      })
    })

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <PropertyCreationWizard draftId="two" />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(mockLoadWizardState).toHaveBeenCalledWith('property-creation:two', {
        expectedVersion: 1,
      })
    })
  })

  it('resume does not fire when state has wrong version (returned as null)', async () => {
    mockLoadWizardState.mockResolvedValue(null)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    await waitFor(() => {
      expect(mockLoadWizardState).toHaveBeenCalledWith('property-creation:draft-abc', {
        expectedVersion: 1,
      })
    })
    expect(mockCapture).not.toHaveBeenCalledWith(
      'property_creation_wizard_resumed',
      expect.anything(),
    )
  })
})

describe('PropertyCreationWizard — exit prompt', () => {
  function draftState(): WizardState<PropertyCreationWizardState['data']> {
    const blob = new Blob([new Uint8Array(32)], { type: 'application/pdf' })
    return {
      version: 1,
      currentStep: 1,
      updatedAt: '2026-04-21T12:00:00Z',
      data: {
        contractFile: blob,
        contractFileName: 'saved.pdf',
        contractFileType: 'pdf',
        extractionResult: null,
      },
    }
  }

  it('skips the prompt and navigates directly when there is nothing saved locally', async () => {
    mockLoadWizardState.mockResolvedValue(null)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    const closeBtn = await screen.findByRole('button', { name: 'Exit' })
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/app')
    expect(screen.queryByRole('link', { name: 'Save for later' })).not.toBeInTheDocument()
  })

  it('save-for-later fires property_creation_wizard_abandoned with step', async () => {
    mockLoadWizardState.mockResolvedValue(draftState())

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    // Open exit prompt via the Close button (aria-label "Exit")
    const closeBtn = await screen.findByRole('button', { name: 'Exit' })
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    const saveLink = await screen.findByRole('link', { name: 'Save for later' })
    await act(async () => {
      fireEvent.click(saveLink)
    })

    expect(mockCapture).toHaveBeenCalledWith('property_creation_wizard_abandoned', {
      step: 1,
    })
  })

  it('discard calls clearWizardState', async () => {
    mockLoadWizardState.mockResolvedValue(draftState())
    mockClearWizardState.mockResolvedValue(undefined)

    const { PropertyCreationWizard } = await import('../property-creation-wizard')
    renderWithIntl(<PropertyCreationWizard draftId="draft-abc" />)

    const closeBtn = await screen.findByRole('button', { name: 'Exit' })
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    const discardLink = await screen.findByRole('link', { name: 'Discard and exit' })
    await act(async () => {
      fireEvent.click(discardLink)
    })

    expect(mockClearWizardState).toHaveBeenCalledWith('property-creation:draft-abc')
  })
})

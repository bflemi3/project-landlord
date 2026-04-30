import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { PersistedPropertyCreationState } from '../store'

// --- Mocks: idb-keyval -------------------------------------------------------
// Each test gets a fresh in-memory store. The persist middleware writes via
// structured clone, so values flow through unchanged.

const idbStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    idbStore.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    idbStore.delete(key)
    return Promise.resolve()
  }),
}))

// Imports must come after the vi.mock() call.
import {
  PropertyCreationStoreProvider,
  usePropertyCreationActions,
  usePropertyCreationState,
  usePropertyCreationHasHydrated,
} from '../store-provider'
import { useIsExtracted } from '../use-property-creation'
import { propertyCreationWizardKey } from '../persistence'
import { defaultPropertyInput } from '@/data/properties/schema'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

// --- Helpers ----------------------------------------------------------------

function makeWrapper(draftId: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PropertyCreationStoreProvider draftId={draftId}>
        {children}
      </PropertyCreationStoreProvider>
    )
  }
}

/**
 * Seeds the IDB-backed store as if the user had previously persisted state
 * under v3. Mirrors the envelope the persist middleware writes —
 * `{ state: <PersistedPropertyCreationState>, version: 3 }`.
 */
function seedPersistedState(
  draftId: string,
  state: Partial<PersistedPropertyCreationState>,
) {
  const key = propertyCreationWizardKey(draftId)
  idbStore.set(key, {
    state,
    version: 3,
  })
}

beforeEach(() => {
  idbStore.clear()
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// --- Tests ------------------------------------------------------------------

describe('usePropertyCreationState — hydration', () => {
  it('starts with default state and flips hasHydrated to true after first idle', async () => {
    const wrapper = makeWrapper('draft-fresh')
    const { result } = renderHook(
      () => ({
        step: usePropertyCreationState((s) => s.step),
        hasHydrated: usePropertyCreationHasHydrated(),
      }),
      { wrapper },
    )

    // Defaults are visible synchronously — the store is constructed eagerly.
    expect(result.current.step).toBe(1)

    // Hydration runs on the IDB microtask. Wait for it.
    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true)
    })
  })

  it('reflects loaded data in the store after hydration', async () => {
    const draftId = 'draft-loaded'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: null,
      path: 'no_contract',
      sectionStates: {
        property: 'completed',
        'rent-dates': 'upcoming',
        tenants: 'upcoming',
        expenses: 'upcoming',
        cpf: 'upcoming',
        bank: 'upcoming',
      },
      activeSectionId: 'rent-dates',
      sectionData: {},
    })

    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        step: usePropertyCreationState((s) => s.step),
        path: usePropertyCreationState((s) => s.path),
        property: usePropertyCreationState((s) => s.sectionStates.property),
        activeSectionId: usePropertyCreationState((s) => s.activeSectionId),
        hasHydrated: usePropertyCreationHasHydrated(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true)
    })

    expect(result.current.step).toBe(2)
    expect(result.current.path).toBe('no_contract')
    expect(result.current.property).toBe('completed')
    expect(result.current.activeSectionId).toBe('rent-dates')
  })

  it('resume-mid-extraction merge forces step=1 when contractFile set but extractionResult null and path null', async () => {
    const draftId = 'draft-resume'
    const blob = new Blob([new Uint8Array(8)], { type: 'application/pdf' })
    seedPersistedState(draftId, {
      step: 2,
      // Persisted as Blob (structured clone preserves it). The merge
      // reconstructs a `File` from blob + filename.
      contractFile: blob as unknown as File,
      contractFileName: 'x.pdf',
      contractFileType: 'pdf',
      extractionResult: null,
      path: null,
      sectionStates: {
        property: 'upcoming',
        'rent-dates': 'upcoming',
        tenants: 'upcoming',
        expenses: 'upcoming',
        cpf: 'upcoming',
        bank: 'upcoming',
      },
      activeSectionId: 'property',
      sectionData: {},
    })

    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        step: usePropertyCreationState((s) => s.step),
        contractFile: usePropertyCreationState((s) => s.contractFile),
        hasHydrated: usePropertyCreationHasHydrated(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true)
    })

    expect(result.current.step).toBe(1)
    // File is reconstructed from the persisted Blob.
    expect(result.current.contractFile).toBeInstanceOf(File)
    expect(result.current.contractFile?.name).toBe('x.pdf')
  })

  it('backfills the property slice when path=contract and extractionResult is present but slice is missing', async () => {
    const draftId = 'draft-backfill'
    const extraction: ContractExtractionResult = {
      isRentalContract: true,
      propertyType: 'apartment',
      address: {
        street: 'Rua A',
        number: '123',
        complement: null,
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000-000',
        country: 'BR',
      },
      rent: null,
      contractDates: null,
      rentAdjustment: null,
      landlords: null,
      tenants: null,
      expenses: null,
      languageDetected: 'pt-br',
      rawExtractedText: '',
    }

    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: extraction,
      path: 'contract',
      sectionStates: {
        property: 'upcoming',
        'rent-dates': 'upcoming',
        tenants: 'upcoming',
        expenses: 'upcoming',
        cpf: 'upcoming',
        bank: 'upcoming',
      },
      activeSectionId: 'property',
      // No `property` slice — this is what backfill is for.
      sectionData: {},
    })

    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        property: usePropertyCreationState(
          (s) => s.sectionData.property as { street?: string } | undefined,
        ),
        hasHydrated: usePropertyCreationHasHydrated(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true)
    })

    expect(result.current.property?.street).toBe('Rua A')
  })
})

describe('usePropertyCreationActions + state machine invariants', () => {
  it('completeCurrentSection flips status AND advances activeSectionId in one update', async () => {
    const wrapper = makeWrapper('draft-complete')
    const { result } = renderHook(
      () => ({
        actions: usePropertyCreationActions(),
        activeId: usePropertyCreationState((s) => s.activeSectionId),
        property: usePropertyCreationState((s) => s.sectionStates.property),
      }),
      { wrapper },
    )

    // Seed a path so the state machine can reason about required sections.
    act(() => {
      result.current.actions.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    expect(result.current.activeId).toBe('property')
    expect(result.current.property).toBe('upcoming')

    act(() => {
      result.current.actions.completeCurrentSection()
    })

    // Status of the just-completed section is now completed, and the active
    // id has advanced to the next upcoming section — in a single update.
    expect(result.current.property).toBe('completed')
    expect(result.current.activeId).toBe('rent-dates')
  })

  it('openSection preserves status of previously-active and newly-active sections', async () => {
    const wrapper = makeWrapper('draft-open')
    const { result } = renderHook(
      () => ({
        actions: usePropertyCreationActions(),
        activeId: usePropertyCreationState((s) => s.activeSectionId),
        property: usePropertyCreationState((s) => s.sectionStates.property),
        rentDates: usePropertyCreationState(
          (s) => s.sectionStates['rent-dates'],
        ),
      }),
      { wrapper },
    )

    act(() => {
      result.current.actions.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    // Complete `property` → active becomes `rent-dates`.
    act(() => {
      result.current.actions.completeCurrentSection()
    })

    // Now tap the header of `property` again — re-opens it without changing
    // its completed status.
    act(() => {
      result.current.actions.openSection('property')
    })

    expect(result.current.activeId).toBe('property')
    expect(result.current.property).toBe('completed')
    expect(result.current.rentDates).toBe('upcoming')
  })

  it('skipCurrentSection no-ops when the section is required for the current path', async () => {
    const wrapper = makeWrapper('draft-skip-required')
    const { result } = renderHook(
      () => ({
        actions: usePropertyCreationActions(),
        activeId: usePropertyCreationState((s) => s.activeSectionId),
        property: usePropertyCreationState((s) => s.sectionStates.property),
      }),
      { wrapper },
    )

    act(() => {
      result.current.actions.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    act(() => {
      result.current.actions.skipCurrentSection()
    })

    expect(result.current.activeId).toBe('property')
    expect(result.current.property).toBe('upcoming')
  })

  it('skipCurrentSection advances past an optional section on the no_contract path', async () => {
    const wrapper = makeWrapper('draft-skip-optional')
    const { result } = renderHook(
      () => ({
        actions: usePropertyCreationActions(),
        activeId: usePropertyCreationState((s) => s.activeSectionId),
        tenants: usePropertyCreationState((s) => s.sectionStates.tenants),
      }),
      { wrapper },
    )

    act(() => {
      result.current.actions.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    // Walk forward to `tenants`.
    act(() => {
      result.current.actions.completeCurrentSection() // property → rent-dates
    })
    act(() => {
      result.current.actions.completeCurrentSection() // rent-dates → tenants
    })

    act(() => {
      result.current.actions.skipCurrentSection()
    })

    expect(result.current.tenants).toBe('skipped')
    expect(result.current.activeId).toBe('expenses')
  })
})

describe('persist middleware — writes', () => {
  it('writes the persisted slice through idb-keyval after a state change', async () => {
    const idb = await import('idb-keyval')
    const setSpy = vi.mocked(idb.set)
    setSpy.mockClear()

    const wrapper = makeWrapper('draft-write')
    const { result } = renderHook(
      () => ({
        actions: usePropertyCreationActions(),
        hasHydrated: usePropertyCreationHasHydrated(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true)
    })

    act(() => {
      result.current.actions.goToStep(2)
    })

    // Wait for the persist write to flush.
    await waitFor(() => {
      const lastCall = setSpy.mock.calls.at(-1)
      expect(lastCall?.[0]).toBe(propertyCreationWizardKey('draft-write'))
    })

    const lastCall = setSpy.mock.calls.at(-1)!
    const [, value] = lastCall as [string, { state: PersistedPropertyCreationState; version: number }]
    expect(value.version).toBe(3)
    expect(value.state.step).toBe(2)
    // `actions` is excluded by partialize.
    expect(value.state).not.toHaveProperty('actions')
  })
})

describe('usePropertyCreationActions stability', () => {
  it('returns the same action-bag reference across re-renders', async () => {
    const wrapper = makeWrapper('draft-stable')
    const { result, rerender } = renderHook(
      () => usePropertyCreationActions(),
      { wrapper },
    )

    const first = result.current
    rerender()
    const second = result.current

    expect(first).toBe(second)
  })

  it('throws a clear error when used outside the Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      renderHook(() => usePropertyCreationActions()),
    ).toThrow(/PropertyCreationStoreProvider/)
    spy.mockRestore()
  })
})

describe('useIsExtracted', () => {
  function withExtractedAddress(draftId: string) {
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: {
        isRentalContract: true,
        propertyType: 'apartment',
        address: {
          street: 'Rua Augusta',
          number: '123',
          complement: 'Apto 4B',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          postalCode: '01310-100',
          country: 'BR',
        },
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: '',
      } satisfies ContractExtractionResult,
      path: 'contract',
      // Eager-init `defaultSectionData()` populates `property` to defaults; the
      // merge function then folds extraction values in. Mirror the post-merge
      // shape directly so the slice values match what `useIsExtracted` reads.
      sectionData: {
        property: {
          ...defaultPropertyInput(),
          postal_code: '01310-100',
          street: 'Rua Augusta',
          number: '123',
          complement: 'Apto 4B',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          property_type: 'apartment',
        },
      },
    })
  }

  it.each([
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
  ] as const)(
    'maps property.%s correctly to its extraction.address counterpart',
    async (field) => {
      const draftId = `extracted-${field}`
      withExtractedAddress(draftId)
      const wrapper = makeWrapper(draftId)
      const { result } = renderHook(
        () => ({
          hasHydrated: usePropertyCreationHasHydrated(),
          extracted: useIsExtracted(`property.${field}`),
        }),
        { wrapper },
      )
      await waitFor(() => expect(result.current.hasHydrated).toBe(true))
      expect(result.current.extracted).toBe(true)
    },
  )

  it('returns true for property_type when slice matches extraction', async () => {
    const draftId = 'extracted-prop-type'
    withExtractedAddress(draftId)
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        propertyType: useIsExtracted('property.property_type'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.propertyType).toBe(true)
  })

  it('maps postalCode → postal_code via the mapping table', async () => {
    const draftId = 'extracted-postal'
    withExtractedAddress(draftId)
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        postal: useIsExtracted('property.postal_code'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.postal).toBe(true)
  })

  it('returns false when the slice value diverges from extraction', async () => {
    const draftId = 'extracted-divergent'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: {
        isRentalContract: true,
        propertyType: 'apartment',
        address: {
          street: 'Rua Augusta',
          number: null,
          complement: null,
          neighborhood: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        },
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: '',
      } satisfies ContractExtractionResult,
      path: 'contract',
      sectionData: {
        property: {
          ...defaultPropertyInput(),
          street: 'Avenida Paulista', // user edited from extracted "Rua Augusta"
          property_type: 'apartment',
        },
      },
    })
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        street: useIsExtracted('property.street'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.street).toBe(false)
  })

  it('returns false when extraction has no value for the field', async () => {
    const draftId = 'extracted-null'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: null,
      path: 'no_contract',
      sectionData: {
        property: {
          ...defaultPropertyInput(),
          street: 'Avenida Paulista',
        },
      },
    })
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        street: useIsExtracted('property.street'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.street).toBe(false)
  })

  it('returns false when the slice value is empty (even if extraction is also empty)', async () => {
    const draftId = 'extracted-both-empty'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: {
        isRentalContract: true,
        propertyType: null,
        address: {
          street: '',
          number: null,
          complement: null,
          neighborhood: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        },
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: '',
      } satisfies ContractExtractionResult,
      path: 'contract',
      sectionData: { property: defaultPropertyInput() },
    })
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        street: useIsExtracted('property.street'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.street).toBe(false)
  })

  it('returns false for paths with no extraction source even when slice is non-empty', async () => {
    const draftId = 'extracted-no-source'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: null,
      path: 'no_contract',
      sectionData: {
        property: {
          ...defaultPropertyInput(),
          name: 'Edifício Aurora', // user-entered, no extraction source for name
          country_code: 'BR', // never sourced from extraction
        },
      },
    })
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        name: useIsExtracted('property.name'),
        country: useIsExtracted('property.country_code'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.name).toBe(false)
    expect(result.current.country).toBe(false)
  })

  it('returns false when the slice value is null (property_type unset, even if extraction is also null)', async () => {
    const draftId = 'extracted-prop-type-null'
    seedPersistedState(draftId, {
      step: 2,
      contractFile: null,
      contractFileName: null,
      contractFileType: null,
      extractionResult: {
        isRentalContract: true,
        propertyType: null,
        address: null,
        rent: null,
        contractDates: null,
        rentAdjustment: null,
        landlords: null,
        tenants: null,
        expenses: null,
        languageDetected: 'pt-br',
        rawExtractedText: '',
      } satisfies ContractExtractionResult,
      path: 'contract',
      sectionData: { property: defaultPropertyInput() },
    })
    const wrapper = makeWrapper(draftId)
    const { result } = renderHook(
      () => ({
        hasHydrated: usePropertyCreationHasHydrated(),
        propertyType: useIsExtracted('property.property_type'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.hasHydrated).toBe(true))
    expect(result.current.propertyType).toBe(false)
  })
})

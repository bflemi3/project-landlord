import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { WizardState } from '@/lib/wizard-state'
import type { PropertyCreationData } from '../persistence'

// --- Mocks: idb-keyval / wizard-state I/O -----------------------------------

const mockLoadWizardState = vi.fn<
  (key: string, options?: { expectedVersion?: number }) => Promise<
    WizardState<PropertyCreationData> | null
  >
>()
const mockSaveWizardState = vi.fn<
  (key: string, state: WizardState<PropertyCreationData>) => Promise<void>
>()
const mockClearWizardState = vi.fn<(key: string) => Promise<void>>()

vi.mock('@/lib/wizard-state', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wizard-state')>(
    '@/lib/wizard-state',
  )
  return {
    ...actual,
    loadWizardState: (
      ...args: Parameters<typeof mockLoadWizardState>
    ) => mockLoadWizardState(...args),
    saveWizardState: (
      ...args: Parameters<typeof mockSaveWizardState>
    ) => mockSaveWizardState(...args),
    clearWizardState: (
      ...args: Parameters<typeof mockClearWizardState>
    ) => mockClearWizardState(...args),
  }
})

// --- Helpers ----------------------------------------------------------------

async function freshImport() {
  vi.resetModules()
  const mod = await import('../use-property-creation')
  const storeMod = await import('../store')
  // Clean the module-level singleton so each test gets a pristine store.
  storeMod.__resetPropertyCreationStoreForTests()
  return mod
}

beforeEach(() => {
  mockLoadWizardState.mockReset()
  mockSaveWizardState.mockReset()
  mockClearWizardState.mockReset()
  mockLoadWizardState.mockResolvedValue(null)
  mockSaveWizardState.mockResolvedValue(undefined)
  mockClearWizardState.mockResolvedValue(undefined)
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// --- Tests ------------------------------------------------------------------

describe('usePropertyCreationState — hydration', () => {
  it('(a) triggers a single loadWizardState call on first render', async () => {
    const mod = await freshImport()
    const { hydrate, usePropertyCreationState } = mod

    await act(async () => {
      await hydrate('test-wizard-key-a')
    })

    renderHook(() => usePropertyCreationState((s) => s.hydrating))

    expect(mockLoadWizardState).toHaveBeenCalledTimes(1)
    expect(mockLoadWizardState).toHaveBeenCalledWith(
      'test-wizard-key-a',
      expect.objectContaining({ expectedVersion: 2 }),
    )

    // Re-calling hydrate with the same key is a no-op (idempotent)
    await act(async () => {
      await hydrate('test-wizard-key-a')
    })
    expect(mockLoadWizardState).toHaveBeenCalledTimes(1)
  })

  it('(b) reflects loaded data in the store after hydration', async () => {
    const saved: WizardState<PropertyCreationData> = {
      version: 2,
      currentStep: 2,
      updatedAt: '2026-04-23T00:00:00Z',
      data: {
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
      },
    }
    mockLoadWizardState.mockResolvedValueOnce(saved)

    const { hydrate, usePropertyCreationState } = await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-b')
    })

    const { result } = renderHook(() => ({
      step: usePropertyCreationState((s) => s.step),
      path: usePropertyCreationState((s) => s.path),
      sectionStates: usePropertyCreationState((s) => s.sectionStates),
      activeSectionId: usePropertyCreationState((s) => s.activeSectionId),
      hydrating: usePropertyCreationState((s) => s.hydrating),
    }))

    expect(result.current.hydrating).toBe(false)
    expect(result.current.step).toBe(2)
    expect(result.current.path).toBe('no_contract')
    expect(result.current.sectionStates.property).toBe('completed')
    expect(result.current.activeSectionId).toBe('rent-dates')
  })

  it('resume-extraction post-processing forces step=1 when contractFile set but extractionResult null and path null', async () => {
    const blob = new Blob([new Uint8Array(8)], { type: 'application/pdf' })
    const saved: WizardState<PropertyCreationData> = {
      version: 2,
      currentStep: 2,
      updatedAt: '2026-04-23T00:00:00Z',
      data: {
        contractFile: blob,
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
      },
    }
    mockLoadWizardState.mockResolvedValueOnce(saved)

    const { hydrate, usePropertyCreationState } = await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-resume')
    })

    const { result } = renderHook(() => usePropertyCreationState((s) => s.step))
    expect(result.current).toBe(1)
  })
})

describe('usePropertyCreationActions + state machine invariants', () => {
  it('(c) completeCurrentSection flips status AND advances activeSectionId in one update', async () => {
    const { hydrate, usePropertyCreationState, usePropertyCreationActions } =
      await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-c')
    })

    // Seed a path so the state machine can reason about required sections.
    const { result: actionsRef } = renderHook(() => usePropertyCreationActions())
    act(() => {
      actionsRef.current.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    let renderCount = 0
    const { result: stateRef } = renderHook(() => {
      renderCount++
      return {
        activeId: usePropertyCreationState((s) => s.activeSectionId),
        property: usePropertyCreationState((s) => s.sectionStates.property),
      }
    })

    const baselineRenders = renderCount
    expect(stateRef.current.activeId).toBe('property')
    expect(stateRef.current.property).toBe('upcoming')

    act(() => {
      actionsRef.current.completeCurrentSection()
    })

    // Status of the just-completed section is now completed, and the active
    // id has advanced to the next upcoming section — in a single update.
    expect(stateRef.current.property).toBe('completed')
    expect(stateRef.current.activeId).toBe('rent-dates')

    // The composite action fires exactly one re-render (Zustand batches
    // set() calls inside one action).
    expect(renderCount - baselineRenders).toBe(1)
  })

  it('(d) openSection preserves status of previously-active and newly-active sections', async () => {
    const { hydrate, usePropertyCreationState, usePropertyCreationActions } =
      await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-d')
    })

    const { result: actionsRef } = renderHook(() => usePropertyCreationActions())
    act(() => {
      actionsRef.current.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    // Complete `property` → active becomes `rent-dates`.
    act(() => {
      actionsRef.current.completeCurrentSection()
    })

    // Now tap the header of `property` again — re-opens it without changing
    // its completed status.
    act(() => {
      actionsRef.current.openSection('property')
    })

    const { result: stateRef } = renderHook(() => ({
      activeId: usePropertyCreationState((s) => s.activeSectionId),
      property: usePropertyCreationState((s) => s.sectionStates.property),
      rentDates: usePropertyCreationState((s) => s.sectionStates['rent-dates']),
    }))

    expect(stateRef.current.activeId).toBe('property')
    // previously-active section's status is preserved
    expect(stateRef.current.property).toBe('completed')
    // newly-active section's status is preserved (still upcoming)
    expect(stateRef.current.rentDates).toBe('upcoming')
  })

  it('(e) skipCurrentSection no-ops when the section is required for the current path', async () => {
    const { hydrate, usePropertyCreationActions, usePropertyCreationState } =
      await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-e')
    })

    const { result: actionsRef } = renderHook(() => usePropertyCreationActions())
    act(() => {
      actionsRef.current.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    const { result: stateRef } = renderHook(() => ({
      activeId: usePropertyCreationState((s) => s.activeSectionId),
      property: usePropertyCreationState((s) => s.sectionStates.property),
    }))

    // `property` is required in both paths — skip must no-op.
    act(() => {
      actionsRef.current.skipCurrentSection()
    })

    expect(stateRef.current.activeId).toBe('property')
    expect(stateRef.current.property).toBe('upcoming')
  })

  it('skipCurrentSection advances past an optional section on the no_contract path', async () => {
    const { hydrate, usePropertyCreationActions, usePropertyCreationState } =
      await freshImport()
    await act(async () => {
      await hydrate('test-wizard-key-e2')
    })

    const { result: actionsRef } = renderHook(() => usePropertyCreationActions())
    act(() => {
      actionsRef.current.commitContractOutput({
        extractionResult: null,
        path: 'no_contract',
      })
    })

    // Walk to an optional section: complete property + rent-dates (both
    // required in no_contract only for property, let's verify by jumping
    // active pointer to tenants which is optional).
    act(() => {
      actionsRef.current.completeCurrentSection() // property -> rent-dates
    })
    act(() => {
      actionsRef.current.completeCurrentSection() // rent-dates -> tenants
    })

    // tenants is optional — skip should work.
    act(() => {
      actionsRef.current.skipCurrentSection()
    })

    const { result: stateRef } = renderHook(() => ({
      activeId: usePropertyCreationState((s) => s.activeSectionId),
      tenants: usePropertyCreationState((s) => s.sectionStates.tenants),
    }))

    expect(stateRef.current.tenants).toBe('skipped')
    expect(stateRef.current.activeId).toBe('expenses')
  })
})

describe('persistence subscriber', () => {
  it('(f) calls saveWizardState with the expected shape after the debounce window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { hydrate, usePropertyCreationActions } = await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-f')
    })

    // Ignore any save triggered by hydration bookkeeping.
    mockSaveWizardState.mockClear()

    const { result: actionsRef } = renderHook(() => usePropertyCreationActions())
    act(() => {
      actionsRef.current.goToStep(2)
    })

    // Before the debounce fires, nothing is persisted.
    expect(mockSaveWizardState).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
      // Let microtasks flush
      await Promise.resolve()
    })

    expect(mockSaveWizardState).toHaveBeenCalledTimes(1)
    const [key, record] = mockSaveWizardState.mock.calls[0]!
    expect(key).toBe('test-wizard-key-f')
    expect(record.version).toBe(2)
    expect(record.currentStep).toBe(2)
    expect(record.data).toEqual(
      expect.objectContaining({
        path: null,
        activeSectionId: 'property',
      }),
    )
    // Transient hydration flag is NOT persisted.
    expect(record.data).not.toHaveProperty('hydrating')
  })
})

describe('usePropertyCreationActions stability', () => {
  it('returns the same action-bag reference across re-renders (stable ref, no re-renders on read)', async () => {
    const { hydrate, usePropertyCreationActions } = await freshImport()

    await act(async () => {
      await hydrate('test-wizard-key-stable')
    })

    const { result, rerender } = renderHook(() => usePropertyCreationActions())

    const first = result.current
    rerender()
    const second = result.current

    expect(first).toBe(second)
  })
})

// Hydration is now kicked off at the route root via `use(hydrate(wizardKey))`
// in page.tsx, not from inside any hook. The store-level hydration contract
// (idempotency, resume-extraction post-processing, data reflection) is
// covered by the tests above — there's no component-scoped kick-off to
// exercise here anymore.

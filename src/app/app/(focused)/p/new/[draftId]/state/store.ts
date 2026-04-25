import { createStore } from 'zustand/vanilla'
import posthog from 'posthog-js'
import {
  loadWizardState,
  saveWizardState,
  clearWizardState,
} from '@/lib/wizard-state'
import {
  PROPERTY_CREATION_STATE_VERSION,
  type PropertyCreationData,
  type SectionStatus,
} from './persistence'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import {
  CHECKOUT_SECTIONS,
  FIRST_SECTION_ID,
  getRequiredSectionIds,
  type CheckoutPath,
  type SectionId,
} from './registry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdaterOrValue<T> = T | ((prev: T) => T)

export interface PropertyCreationStateShape {
  hydrating: boolean
  step: 1 | 2
  contractFile: File | null
  contractFileName: string | null
  contractFileType: 'pdf' | 'docx' | null
  extractionResult: ContractExtractionResult | null
  path: CheckoutPath | null
  sectionStates: Record<SectionId, SectionStatus>
  activeSectionId: SectionId | null
  sectionData: Partial<Record<SectionId, unknown>>
}

export interface PropertyCreationActions {
  goToStep: (step: 1 | 2) => void
  setContractFile: (
    file: File,
    name: string,
    type: 'pdf' | 'docx',
  ) => void
  clearContractFile: () => void
  commitContractOutput: (
    next: UpdaterOrValue<{
      extractionResult: ContractExtractionResult | null
      path: CheckoutPath
    }>,
  ) => void
  openSection: (id: SectionId | null) => void
  completeCurrentSection: () => void
  skipCurrentSection: () => void
  goToPreviousSection: () => void
  setSectionData: <T>(id: SectionId, next: UpdaterOrValue<T>) => void
  reset: () => void
}

export interface PropertyCreationStoreValue extends PropertyCreationStateShape {
  actions: PropertyCreationActions
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function initialSectionStates(): Record<SectionId, SectionStatus> {
  const acc = {} as Record<SectionId, SectionStatus>
  for (const s of CHECKOUT_SECTIONS) {
    acc[s.id] = 'upcoming'
  }
  return acc
}

function defaultState(): PropertyCreationStateShape {
  return {
    hydrating: true,
    step: 1,
    contractFile: null,
    contractFileName: null,
    contractFileType: null,
    extractionResult: null,
    path: null,
    sectionStates: initialSectionStates(),
    activeSectionId: FIRST_SECTION_ID,
    sectionData: {},
  }
}

// ---------------------------------------------------------------------------
// Pure section-state helpers
// ---------------------------------------------------------------------------

// Given a current section and the latest status map, return the next section
// that is still `upcoming`. Searches forward first, then wraps. Returns null
// when every other section is completed or skipped.
function nextUpcomingId(
  fromId: SectionId,
  statuses: Record<SectionId, SectionStatus>,
): SectionId | null {
  const idx = CHECKOUT_SECTIONS.findIndex((s) => s.id === fromId)
  if (idx < 0) return null
  for (let i = idx + 1; i < CHECKOUT_SECTIONS.length; i++) {
    const candidate = CHECKOUT_SECTIONS[i]!
    if (statuses[candidate.id] === 'upcoming') return candidate.id
  }
  for (let i = 0; i < idx; i++) {
    const candidate = CHECKOUT_SECTIONS[i]!
    if (statuses[candidate.id] === 'upcoming') return candidate.id
  }
  return null
}

function previousSectionId(fromId: SectionId): SectionId | null {
  const idx = CHECKOUT_SECTIONS.findIndex((s) => s.id === fromId)
  if (idx <= 0) return null
  return CHECKOUT_SECTIONS[idx - 1]!.id
}

function isRequired(id: SectionId, path: CheckoutPath | null): boolean {
  // Before the path is committed, treat every section as required so skip is
  // a no-op — the user shouldn't advance past sections before path selection.
  if (!path) return true
  return getRequiredSectionIds(path).includes(id)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function createPropertyCreationStore() {
  return createStore<PropertyCreationStoreValue>()((set, get) => ({
    ...defaultState(),
    actions: {
      goToStep: (step) => set({ step }),

      setContractFile: (file, name, type) =>
        set({
          contractFile: file,
          contractFileName: name,
          contractFileType: type,
        }),

      clearContractFile: () =>
        set({
          contractFile: null,
          contractFileName: null,
          contractFileType: null,
          extractionResult: null,
        }),

      commitContractOutput: (nextOrUpdater) => {
        const state = get()
        const prev = {
          extractionResult: state.extractionResult,
          path: state.path ?? ('contract' as CheckoutPath),
        }
        const next =
          typeof nextOrUpdater === 'function'
            ? (nextOrUpdater as (p: typeof prev) => typeof prev)(prev)
            : nextOrUpdater
        set({
          extractionResult: next.extractionResult,
          path: next.path,
        })
      },

      openSection: (id) => set({ activeSectionId: id }),

      completeCurrentSection: () => {
        const state = get()
        const current = state.activeSectionId
        if (!current) return
        const nextStatuses: Record<SectionId, SectionStatus> = {
          ...state.sectionStates,
          [current]: 'completed',
        }
        set({
          sectionStates: nextStatuses,
          activeSectionId: nextUpcomingId(current, nextStatuses),
        })
      },

      skipCurrentSection: () => {
        const state = get()
        const current = state.activeSectionId
        if (!current) return
        if (isRequired(current, state.path)) return
        const nextStatuses: Record<SectionId, SectionStatus> = {
          ...state.sectionStates,
          [current]: 'skipped',
        }
        set({
          sectionStates: nextStatuses,
          activeSectionId: nextUpcomingId(current, nextStatuses),
        })
      },

      goToPreviousSection: () => {
        const state = get()
        const current = state.activeSectionId
        if (!current) return
        const prev = previousSectionId(current)
        if (!prev) return
        set({ activeSectionId: prev })
      },

      setSectionData: <T>(id: SectionId, nextOrUpdater: UpdaterOrValue<T>) => {
        const state = get()
        const prev = state.sectionData[id] as T
        const next =
          typeof nextOrUpdater === 'function'
            ? (nextOrUpdater as (p: T) => T)(prev)
            : nextOrUpdater
        set({
          sectionData: {
            ...state.sectionData,
            [id]: next,
          },
        })
      },

      reset: () => {
        // Reset to defaults but mark hydration complete — we're live again.
        set({ ...defaultState(), hydrating: false })
      },
    },
  }))
}

export type PropertyCreationStore = ReturnType<typeof createPropertyCreationStore>

// ---------------------------------------------------------------------------
// Singleton accessors — one store per browser session. Since the wizard is
// mounted on one route at a time, a module-level singleton is sufficient and
// gives UI code stable selector semantics without prop drilling.
// ---------------------------------------------------------------------------

let singleton: PropertyCreationStore | null = null

export function getPropertyCreationStore(): PropertyCreationStore {
  if (!singleton) singleton = createPropertyCreationStore()
  return singleton
}

/**
 * Test-only reset. Tears down the singleton and any pending persistence timer
 * so the next call to getPropertyCreationStore() produces a fresh instance.
 * Also resets the hydration guard so hydrate() will run again.
 */
export function __resetPropertyCreationStoreForTests(): void {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
  }
  singleton = null
  hydrationPromise = null
  hydratedKey = null
}

// ---------------------------------------------------------------------------
// Persistence — debounced write on every state change to a persisted slice.
// Encapsulated here; UI code never calls saveWizardState directly.
// ---------------------------------------------------------------------------

const PERSIST_DEBOUNCE_MS = 300

let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null
let persistenceKey: string | null = null
let persistenceSubscribed = false

function persistedData(state: PropertyCreationStoreValue): PropertyCreationData {
  return {
    contractFile: state.contractFile,
    contractFileName: state.contractFileName,
    contractFileType: state.contractFileType,
    extractionResult: state.extractionResult,
    path: state.path,
    sectionStates: state.sectionStates,
    activeSectionId: state.activeSectionId,
    sectionData: state.sectionData,
  }
}

function scheduleSave(store: PropertyCreationStore) {
  if (!persistenceKey) return
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer)
  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null
    const state = store.getState()
    if (state.hydrating) return
    if (!persistenceKey) return
    void saveWizardState<PropertyCreationData>(persistenceKey, {
      version: PROPERTY_CREATION_STATE_VERSION,
      currentStep: state.step,
      updatedAt: new Date().toISOString(),
      data: persistedData(state),
    }).catch((err) => {
      console.error('[property-creation-store] saveWizardState failed', err)
    })
  }, PERSIST_DEBOUNCE_MS)
}

function flushPendingSave(store: PropertyCreationStore) {
  if (!pendingSaveTimer) return
  clearTimeout(pendingSaveTimer)
  pendingSaveTimer = null
  if (!persistenceKey) return
  const state = store.getState()
  if (state.hydrating) return
  void saveWizardState<PropertyCreationData>(persistenceKey, {
    version: PROPERTY_CREATION_STATE_VERSION,
    currentStep: state.step,
    updatedAt: new Date().toISOString(),
    data: persistedData(state),
  }).catch((err) => {
    console.error('[property-creation-store] saveWizardState (flush) failed', err)
  })
}

function ensurePersistenceSubscriber(store: PropertyCreationStore) {
  if (persistenceSubscribed) return
  persistenceSubscribed = true

  store.subscribe((state, prev) => {
    // Hydration flip isn't a user-initiated change — skip persisting it.
    if (prev.hydrating && !state.hydrating) return
    if (!persistenceKey) return
    scheduleSave(store)
  })

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingSave(store)
    })
    window.addEventListener('pagehide', () => flushPendingSave(store))
  }
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

let hydratedKey: string | null = null
let hydrationPromise: Promise<void> | null = null

// Cached "no-op" promises reused across renders so React's `use()` sees a
// stable reference instead of a fresh Promise.resolve() every call (an
// unstable reference triggers "suspended by an uncached promise").
const NOOP_PROMISE: Promise<void> = Promise.resolve()

/**
 * One-shot hydration entry point. Reads persisted state for the given wizard
 * key, seeds the store, applies resume-extraction post-processing, flips
 * `hydrating: false`, and wires the persistence subscriber.
 *
 * Idempotent for the same key — re-invocations return the same cached promise
 * reference. Invocation with a DIFFERENT key (user finished/abandoned the
 * previous wizard and opened a new one in the same SPA session) resets the
 * in-memory singleton to defaults and starts a fresh hydration for the new
 * key. Without this reset, stale state from the previous wizard (e.g.
 * `step: 2` after the user chose "No contract — continue manually") would
 * leak into the new wizard's first render.
 *
 * Declared as a plain function (not `async`) so the returned reference is the
 * cached `hydrationPromise` itself — an `async` wrapper would allocate a new
 * promise on every call and break React 19's `use()` which requires stable
 * references.
 */
export function hydrate(wizardKey: string): Promise<void> {
  if (hydratedKey === wizardKey) return hydrationPromise ?? NOOP_PROMISE

  const store = getPropertyCreationStore()

  // New wizard key. Cancel any stale persistence timer, null persistenceKey
  // BEFORE writing defaults so the subscriber skips the reset-write, then
  // seed the store with a fresh default state (`hydrating: true` so any
  // consumer inside the Suspense boundary still sees the fallback until the
  // IDB load finishes).
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
  }
  persistenceKey = null
  store.setState({ ...defaultState() })

  hydratedKey = wizardKey
  persistenceKey = wizardKey
  ensurePersistenceSubscriber(store)

  hydrationPromise = (async () => {
    try {
      const loaded = await loadWizardState<PropertyCreationData>(wizardKey, {
        expectedVersion: PROPERTY_CREATION_STATE_VERSION,
      })
      if (!loaded) {
        store.setState({ hydrating: false })
        return
      }

      const { data, currentStep } = loaded
      // Blob → File (idb-keyval preserves Blob but we want a File for the
      // extraction action's FormData binding).
      const restoredFile =
        data.contractFile instanceof Blob && data.contractFileName
          ? new File([data.contractFile], data.contractFileName, {
              type: data.contractFile.type,
            })
          : null

      // Resume-extraction post-processing: if we find step === 2 with a
      // contract file but no extraction result and no committed path, the
      // user reloaded mid-extraction — force them back to step 1 so Step 1's
      // auto-extract kicks in.
      const resumeMidExtraction =
        currentStep === 2 &&
        restoredFile !== null &&
        data.extractionResult === null &&
        data.path === null

      store.setState({
        hydrating: false,
        step: resumeMidExtraction ? 1 : ((currentStep === 2 ? 2 : 1) as 1 | 2),
        contractFile: restoredFile,
        contractFileName: data.contractFileName,
        contractFileType: data.contractFileType,
        extractionResult: data.extractionResult,
        path: data.path,
        sectionStates: data.sectionStates ?? initialSectionStates(),
        activeSectionId: data.activeSectionId ?? FIRST_SECTION_ID,
        sectionData: data.sectionData ?? {},
      })

      try {
        posthog.capture('property_creation_wizard_resumed', {
          step: currentStep,
        })
      } catch {
        // posthog unavailable in tests; swallow — capture is best-effort.
      }
    } catch (err) {
      console.error('[property-creation-store] hydrate failed', err)
      store.setState({ hydrating: false })
    }
  })()

  return hydrationPromise
}

/**
 * Clears persisted wizard state. Cancels any pending debounced save, wipes
 * the IDB record, and nulls `persistenceKey` so any straggler state mutations
 * during the exit transition don't write a fresh default record back to IDB.
 *
 * Deliberately does NOT reset the in-memory store. A synchronous reset would
 * push `step: 1` through the Zustand subscription and force a re-render of
 * the still-mounted wizard before `router.push` finishes — visible as a step-1
 * flash on exit from step 2, and as extra wasted work on step 1. The next
 * wizard mount with a different draftId resets the store via `hydrate()`'s
 * "new key" branch, so there's no leak across wizards.
 */
export function clearPropertyCreation(): void {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
  }
  const keyToClear = persistenceKey
  persistenceKey = null
  if (keyToClear) {
    void clearWizardState(keyToClear).catch((err) => {
      console.error('[property-creation-store] clearWizardState failed', err)
    })
  }
}

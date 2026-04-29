import { create } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import {
  PROPERTY_CREATION_STATE_VERSION,
  propertyCreationWizardKey,
  type SectionStatus,
} from './persistence'
import { createIdbStorage } from './idb-storage'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import {
  CHECKOUT_SECTIONS,
  FIRST_SECTION_ID,
  getRequiredSectionIds,
  type CheckoutPath,
  type SectionId,
} from './registry'
import {
  defaultSectionData,
  mergeExtractionIntoSectionData,
} from './extraction-seeding'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdaterOrValue<T> = T | ((prev: T) => T)

export interface PropertyCreationStateShape {
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
  updateSectionData: <T>(id: SectionId, partial: Partial<T>) => void
  /** Wipes this draft's persisted IDB record. Called from the wizard's exit
   * flow (no-work close, explicit discard from the exit prompt) so abandoned
   * drafts don't accumulate. The "Save for later" branch deliberately does
   * NOT call this — leaving IDB intact is what enables resume. */
  clearPersisted: () => void
}

export interface PropertyCreationStoreValue extends PropertyCreationStateShape {
  actions: PropertyCreationActions
}

// The persisted slice is everything except the actions bag. Functions can't
// be cloned by structured clone (DataCloneError), and persisting them would
// be meaningless anyway — the action callbacks are recreated by the factory
// every time the store is constructed.
export type PersistedPropertyCreationState = PropertyCreationStateShape

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
    step: 1,
    contractFile: null,
    contractFileName: null,
    contractFileType: null,
    extractionResult: null,
    path: null,
    sectionStates: initialSectionStates(),
    activeSectionId: FIRST_SECTION_ID,
    // Eager-initialize so each section's slice is non-undefined from the
    // moment the store exists. Components read `sectionData[id]` with a
    // typed cast and never need a `??` fallback. `mergeExtractionIntoSectionData`
    // and `setSectionData` both rely on this invariant.
    sectionData: defaultSectionData(),
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
// Persist options
// ---------------------------------------------------------------------------

function buildPersistOptions(
  draftId: string,
): PersistOptions<PropertyCreationStoreValue, PersistedPropertyCreationState> {
  return {
    name: propertyCreationWizardKey(draftId),
    storage: createIdbStorage<PersistedPropertyCreationState>(),
    version: PROPERTY_CREATION_STATE_VERSION,
    // Required: excludes `actions` from the persisted payload. The store
    // value contains an `actions` bag of functions, and our IDB storage
    // adapter (no createJSONStorage) writes via IndexedDB structured clone —
    // which throws DataCloneError on functions. `partialize` enumerates the
    // data fields explicitly so any future addition to the state shape is
    // opt-in for persistence rather than accidentally serialized.
    partialize: (state) => ({
      step: state.step,
      contractFile: state.contractFile,
      contractFileName: state.contractFileName,
      contractFileType: state.contractFileType,
      extractionResult: state.extractionResult,
      path: state.path,
      sectionStates: state.sectionStates,
      activeSectionId: state.activeSectionId,
      sectionData: state.sectionData,
    }),
    merge: (persistedStateUnknown, currentState) => {
      // Persist v5 calls `merge` on every hydration — including the
      // no-persisted-state path, where it passes `undefined`. In that case
      // we must return `currentState` unchanged: `set(stateFromStorage, true)`
      // (replace=true) runs immediately after merge, and returning a partial
      // shape would null out fields the caller may have set via `setState`
      // between store construction and hydration completion (a real concern
      // in tests; benign-but-wasteful in production).
      if (persistedStateUnknown == null) {
        return currentState
      }
      const persisted = persistedStateUnknown as Partial<PersistedPropertyCreationState>

      // Reconstruct File from the persisted Blob + saved filename. Structured
      // clone preserves the underlying bytes but may lose the `File` identity
      // depending on the runtime — the extraction action's FormData binding
      // wants a `File`, so we rebuild it here.
      const persistedFile = persisted.contractFile as Blob | File | null | undefined
      const contractFile =
        persistedFile instanceof Blob && persisted.contractFileName
          ? new File([persistedFile], persisted.contractFileName, { type: persistedFile.type })
          : null

      // Merge persisted sectionData over the eager-initialized defaults so
      // any missing slice (older payloads written before this section's
      // defaults shipped) falls through to its default shape and the
      // "slice is always non-undefined" invariant holds.
      const baseSectionData = {
        ...defaultSectionData(),
        ...(persisted.sectionData ?? {}),
      }

      // Backfill: persisted state from before the seeding logic shipped won't
      // have a property slice (or only has the eager-init defaults). Whenever
      // `path === 'contract'` and `extractionResult` is non-null AND the
      // persisted payload had no property slice, fold extraction-derived
      // values in now via the same merge function `commitContractOutput`
      // uses. Persisted user edits (slice exists in `persisted.sectionData`)
      // are preserved — re-seeding is a backfill, not an overwrite.
      const shouldBackfillProperty =
        persisted.path === 'contract' &&
        persisted.extractionResult != null &&
        persisted.sectionData?.property === undefined
      const sectionData = shouldBackfillProperty
        ? mergeExtractionIntoSectionData(
            baseSectionData,
            persisted.extractionResult!,
          )
        : baseSectionData

      // Resume-mid-extraction sanity check: if persisted state shows the
      // user reached step 2 with a contract file but no extractionResult
      // and no committed path, force them back to step 1 so Step 1's
      // auto-extract kicks in. This is the same logic the legacy `hydrate`
      // owned. It belongs in `merge` (not `onRehydrateStorage`) because
      // it's a state reshape; doing it in onRehydrateStorage would cause
      // a redundant persist write.
      const resumeMidExtraction =
        persisted.step === 2 &&
        contractFile !== null &&
        persisted.extractionResult == null &&
        persisted.path == null

      const sectionStates = persisted.sectionStates ?? initialSectionStates()
      const activeSectionId = persisted.activeSectionId ?? FIRST_SECTION_ID

      return {
        ...currentState,
        step: resumeMidExtraction ? 1 : (persisted.step ?? currentState.step),
        contractFile,
        contractFileName: persisted.contractFileName ?? null,
        contractFileType: persisted.contractFileType ?? null,
        extractionResult: persisted.extractionResult ?? null,
        path: persisted.path ?? null,
        sectionStates,
        activeSectionId,
        sectionData,
      }
    },
    migrate: (persistedState) => {
      // No real migrations needed yet — v3 is the first shape we ship under
      // the persist middleware. When a future shape change requires
      // transforming v3 → v4, accept `(persistedState, version)` and branch
      // on `version` to reshape the payload.
      return persistedState as PersistedPropertyCreationState
    },
    onRehydrateStorage: () => (_state, error) => {
      if (error) {
        console.error('[property-creation] rehydration failed', error)
        return
      }
      // Place for analytics or post-hydration side effects. Do NOT mutate
      // state here — that triggers a redundant persist write.
    },
  }
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

/**
 * Creates a fresh wizard store keyed on `draftId`. Each call returns a new
 * Zustand store instance with its own persist `name` — so navigating between
 * drafts produces independent stores backed by independent IndexedDB records.
 *
 * The store is intentionally NOT a module singleton. Per the Next.js App
 * Router guidance, stores should not be shared across requests; the store
 * factory is invoked from a React Context provider's `useState(() => ...)`
 * so each provider scope owns its own store.
 */
export function createPropertyCreationStore(draftId: string) {
  // Forward reference to the constructed store, held in a stable holder
  // object so `clearPersisted`'s closure can read the eventual store ref via
  // `storeRef.current`. Structurally typed to just the persist API we use —
  // a direct `PropertyCreationStore` reference would create a circular type
  // with the `ReturnType<typeof createPropertyCreationStore>` alias below.
  // Populated after the factory returns; safe because `clearPersisted` can
  // only fire from a user interaction long after assignment.
  const storeRef: { current: { persist: { clearStorage: () => void } } | undefined } = {
    current: undefined,
  }

  const store = create<PropertyCreationStoreValue>()(
    persist(
      (set, get) => ({
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
            // When committing a non-null extraction on the contract path,
            // fold extraction-derived values into `sectionData` via the
            // single merge function — sections render their slice without
            // ever reading `extractionResult` directly. Committing represents
            // "this is the new extraction" and overwrites the affected
            // slices. The no-contract path or a null extraction leaves
            // `sectionData` untouched.
            const sectionData =
              next.extractionResult !== null && next.path === 'contract'
                ? mergeExtractionIntoSectionData(
                    state.sectionData,
                    next.extractionResult,
                  )
                : state.sectionData
            set({
              extractionResult: next.extractionResult,
              path: next.path,
              sectionData,
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

          updateSectionData: <T>(id: SectionId, partial: Partial<T>) => {
            const state = get()
            const prev = (state.sectionData[id] ?? {}) as T
            set({
              sectionData: {
                ...state.sectionData,
                [id]: { ...prev, ...partial },
              },
            })
          },

          clearPersisted: () => {
            storeRef.current?.persist.clearStorage()
          },
        },
      }),
      buildPersistOptions(draftId),
    ),
  )

  storeRef.current = store
  return store
}

export type PropertyCreationStore = ReturnType<typeof createPropertyCreationStore>

import { create } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import {
  PROPERTY_CREATION_STATE_VERSION,
  propertyCreationWizardKey,
  type SectionStatus,
} from './persistence'
import {
  defaultSectionServerErrors,
  defaultSectionTouched,
} from './section-defaults'
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
import { fetchProfile } from '@/data/profiles/shared'
import { createClient } from '@/lib/supabase/client'
import type { TaxIdInput } from '../steps/checkout/sections/tax-id/schemas'
import type { TenantRow } from '../steps/checkout/sections/tenants/schemas'
import type {
  GlobalError,
  SectionServerErrors,
  ServerErrorsResponse,
} from './server-errors-types'

// Types

type UpdaterOrValue<T> = T | ((prev: T) => T)

const EXTRACTION_SEEDED_SECTION_IDS = [
  'property',
  'rent-dates',
  'tenants',
] as const satisfies readonly SectionId[]

/** On the store (not local) so it survives the section's collapse/expand
 *  cycle — base-ui unmounts panel content when collapsed. Persisted so
 *  resumed drafts remember which row the user was editing. Single-active
 *  semantics: at most one row open at a time. After extraction, seeded
 *  to the first tenant's id so the user lands on an open row. */
export interface TenantsListUI {
  activeTenantId: string | null
}

/** Same rationale as TenantsListUI — survives section collapse/expand. The
 *  expenses list uses a controlled accordion: only one row open at a time,
 *  and adding a row makes the new id active. Persisted alongside the slice. */
export interface ExpensesListUI {
  activeExpenseId: string | null
}

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
  /** Per-section touched state. Each section defines its own shape (single-
   *  form sections use `Set<string>` of field names; row sections use
   *  `Record<rowId, Set<fieldName>>`). The store doesn't know the shape — it
   *  just dispatches updaters via `setTouched(sectionId, updater)`, where
   *  the updater receives only that section's touched state. */
  sectionTouched: Partial<Record<SectionId, unknown>>
  /** Sections the user has opened at least once. Validity surfaces (badges,
   *  summary card dot, progress bars) stay quiet until a section is in this
   *  set, so an extracted-invalid row in an unvisited section doesn't yell
   *  on Step 2 landing. */
  visitedSectionIds: ReadonlySet<SectionId>
  tenantsListUI: TenantsListUI
  expensesListUI: ExpensesListUI
  /** Server-side validation errors for each section, persisted alongside the
   *  draft so a refresh mid-fix keeps errors visible. Replaced wholesale per
   *  section on every non-ok server response; cleared on `ok: true` or when
   *  the user edits the offending field/row. */
  sectionServerErrors: Record<SectionId, SectionServerErrors>
  /** Wizard-wide error codes from the server action (unauthenticated,
   *  RPC constraint violation, …). Rendered as a destructive toast at the
   *  top of the wizard; bypasses per-section accordion focus. */
  globalErrors: GlobalError[]
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
  setTenantsListUI: (
    next:
      | Partial<TenantsListUI>
      | ((prev: TenantsListUI) => Partial<TenantsListUI>),
  ) => void
  setExpensesListUI: (
    next:
      | Partial<ExpensesListUI>
      | ((prev: ExpensesListUI) => Partial<ExpensesListUI>),
  ) => void
  /** Updates a section's touched state via an opaque updater. The updater
   * receives only that section's touched value — the store never inspects
   * its shape. Each section's UI files own how to construct updaters
   * (a form blur appends a field name; a list collapse marks every field
   * for a row; section-visit/leave promote everything via the section's
   * `setAllTouched` helper). */
  setTouched: <T>(id: SectionId, updater: (prev: T) => T) => void
  /** Marks the given section as visited. Called the first time a section
   * becomes active — promotes section-level validity surfaces. */
  markSectionVisited: (id: SectionId) => void
  /** Wipes this draft's persisted IDB record. Called from the wizard's exit
   * flow (no-work close, explicit discard from the exit prompt) so abandoned
   * drafts don't accumulate. The "Save for later" branch deliberately does
   * NOT call this — leaving IDB intact is what enables resume. */
  clearPersisted: () => void
  /** Apply a server response to the persisted error slice.
   *   - On `ok: true`: reset every section's slice to its default and clear
   *     `globalErrors` (no UI side effects — pure data).
   *   - On `ok: false`: REPLACE each listed section's slice with the incoming
   *     payload (per-section authoritative for that round), replace
   *     `globalErrors`, and add every section key in `sectionErrors` to
   *     `visitedSectionIds` so section-header validity badges flip on.
   *
   * The "first failing section" lookup runs in the wizard component AFTER
   * this action resolves, not inside the action — the store action stays
   * pure-data. */
  applyServerErrorsResponse: (response: ServerErrorsResponse) => void
  /** Flat-section field clear. Called from `setField` / `handle*` handlers
   *  the moment the user edits — the server's last word on that field is
   *  stale as soon as the slice changes. */
  clearFieldServerError: (section: SectionId, field: string) => void
  /** Row-section: drop every error for a row, used on row delete. Per-row
   *  keying makes this trivial — no index shifting, no "clear all" rule. */
  clearRowServerErrors: (section: SectionId, rowId: string) => void
  /** Row-section: clear a single field for a single row on edit. */
  clearRowFieldServerError: (
    section: SectionId,
    rowId: string,
    field: string,
  ) => void
}

export interface PropertyCreationStoreValue extends PropertyCreationStateShape {
  actions: PropertyCreationActions
}

// Excludes `actions` (functions don't survive structured clone). The
// `*ListUI` slices ARE persisted now so resumed drafts remember which rows
// the user has already acknowledged — `Set` survives IDB structured clone.
export type PersistedPropertyCreationState = PropertyCreationStateShape

// Defaults

function initialSectionStates(): Record<SectionId, SectionStatus> {
  const acc = {} as Record<SectionId, SectionStatus>
  for (const s of CHECKOUT_SECTIONS) {
    acc[s.id] = 'upcoming'
  }
  return acc
}

function defaultTenantsListUI(): TenantsListUI {
  return { activeTenantId: null }
}

function defaultExpensesListUI(): ExpensesListUI {
  return { activeExpenseId: null }
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
    sectionTouched: defaultSectionTouched(),
    visitedSectionIds: new Set(),
    tenantsListUI: defaultTenantsListUI(),
    expensesListUI: defaultExpensesListUI(),
    sectionServerErrors: defaultSectionServerErrors(),
    globalErrors: [],
  }
}

// Pure section-state helpers

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

// Module-local: seeds the tax-id slice from the viewer's profile when the
// persisted slice is empty. Runs from `onRehydrateStorage` after every
// hydration; idempotent thanks to the early return when the slice already
// holds a value.
async function seedTaxIdFromProfileIfMissing(
  state: PropertyCreationStoreValue,
): Promise<void> {
  const slice = state.sectionData['tax-id'] as TaxIdInput | undefined
  if (slice?.tax_id) return

  try {
    const supabase = createClient()
    const profile = await fetchProfile(supabase)
    if (!profile?.tax_id) return

    state.actions.setSectionData<TaxIdInput>('tax-id', (prev) => ({
      ...prev,
      tax_id: profile.tax_id ?? '',
    }))
  } catch (error) {
    // Pre-fill is a nice-to-have — network/auth failure leaves the field
    // empty and the user types it in. Log once for diagnostics.
    console.warn('[property-creation] tax-id profile seed failed', error)
  }
}

// Coerce a possibly-undefined / possibly-array persisted value into a Set.
// Structured clone hands back a Set as-is; older payloads may be missing the
// field or have stored an array. The branch keeps merge tolerant.
function toSectionIdSet(value: unknown): ReadonlySet<SectionId> {
  if (value instanceof Set) return value as Set<SectionId>
  if (Array.isArray(value)) return new Set(value as SectionId[])
  return new Set()
}

function backfillMissingExtractionSections(
  baseSectionData: PropertyCreationStateShape['sectionData'],
  persisted: Partial<PersistedPropertyCreationState>,
): PropertyCreationStateShape['sectionData'] {
  if (persisted.path !== 'contract' || persisted.extractionResult == null) {
    return baseSectionData
  }

  const missingSectionIds = EXTRACTION_SEEDED_SECTION_IDS.filter(
    (id) => persisted.sectionData?.[id] === undefined,
  )
  if (missingSectionIds.length === 0) return baseSectionData

  const seededSectionData = mergeExtractionIntoSectionData(
    baseSectionData,
    persisted.extractionResult,
  )

  return missingSectionIds.reduce<PropertyCreationStateShape['sectionData']>(
    (next, id) => ({
      ...next,
      [id]: seededSectionData[id],
    }),
    baseSectionData,
  )
}

// Persist options

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
      sectionTouched: state.sectionTouched,
      visitedSectionIds: state.visitedSectionIds,
      tenantsListUI: state.tenantsListUI,
      expensesListUI: state.expensesListUI,
      sectionServerErrors: state.sectionServerErrors,
      globalErrors: state.globalErrors,
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

      // Backfill: persisted state from before extraction seeding shipped may
      // be missing slices populated from contract extraction. Seed only absent
      // slices so existing user-edited slices are preserved.
      const sectionData = backfillMissingExtractionSections(
        baseSectionData,
        persisted,
      )

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

      // Sets pass through structured clone unchanged. Defensively coerce
      // visitedSectionIds (older payloads or arrays from migration).
      const visitedSectionIds = toSectionIdSet(persisted.visitedSectionIds)
      const tenantsListUI: TenantsListUI = {
        ...defaultTenantsListUI(),
        ...persisted.tenantsListUI,
      }
      const expensesListUI: ExpensesListUI = {
        ...defaultExpensesListUI(),
        ...persisted.expensesListUI,
      }
      // Per-section touched: each section's own shape is whatever it
      // returned from `defaultTouched()`. If the persisted blob is missing
      // an entry (older payload), fall back to that section's default.
      const sectionTouched: Partial<Record<SectionId, unknown>> = {
        ...defaultSectionTouched(),
        ...(persisted.sectionTouched ?? {}),
      }

      // Server errors: defaults under the persisted slice so a v3 payload
      // (no slices) gets defaults; a v4 payload's slice values win. The v3→v4
      // `migrate` hook strips the keys, so v3 reads always land here with
      // `persisted.sectionServerErrors === undefined`.
      const sectionServerErrors: Record<SectionId, SectionServerErrors> = {
        ...defaultSectionServerErrors(),
        ...(persisted.sectionServerErrors ?? {}),
      }
      const globalErrors: GlobalError[] = persisted.globalErrors ?? []

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
        sectionTouched,
        visitedSectionIds,
        tenantsListUI,
        expensesListUI,
        sectionServerErrors,
        globalErrors,
      }
    },
    migrate: (persistedState, version) => {
      // v3 → v4: server-error slices were added. Server errors are transient
      // by design — there's no value in trying to translate stale errors
      // from a previous session into the new shape. Strip both keys so the
      // merge phase fills them from `defaultSectionServerErrors()` / `[]`.
      if (version < 4 && persistedState && typeof persistedState === 'object') {
        const next = { ...(persistedState as Record<string, unknown>) }
        delete next.sectionServerErrors
        delete next.globalErrors
        return next as unknown as PersistedPropertyCreationState
      }
      return persistedState as PersistedPropertyCreationState
    },
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error('[property-creation] rehydration failed', error)
        return
      }
      // Profile-derived seeding: the tax-id section pre-fills from
      // `profiles.tax_id` when the persisted slice is empty. The persist
      // write that follows the seed is intentional — next load reads the
      // value straight from IDB and the helper short-circuits.
      if (state) void seedTaxIdFromProfileIfMissing(state)
    },
  }
}

// Store factory

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
            const switchingAwayFromContract =
              state.path === 'contract' && next.path !== 'contract'
            const sectionData =
              next.extractionResult !== null && next.path === 'contract'
                ? mergeExtractionIntoSectionData(
                    state.sectionData,
                    next.extractionResult,
                  )
                : switchingAwayFromContract
                  ? defaultSectionData()
                  : state.sectionData
            // Seed `activeTenantId` to the first extracted tenant on a fresh
            // contract extraction so the user lands on an open row. Switching
            // away from contract resets — stale ids would point at a row from
            // the prior path.
            const tenantsListUI: TenantsListUI = switchingAwayFromContract
              ? defaultTenantsListUI()
              : next.extractionResult !== null && next.path === 'contract'
                ? {
                    activeTenantId:
                      (sectionData.tenants as TenantRow[])[0]?.id ?? null,
                  }
                : state.tenantsListUI
            const expensesListUI = switchingAwayFromContract
              ? defaultExpensesListUI()
              : state.expensesListUI
            set({
              extractionResult: next.extractionResult,
              path: next.path,
              sectionData,
              tenantsListUI,
              expensesListUI,
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

          setTenantsListUI: (nextOrUpdater) => {
            const state = get()
            const partial =
              typeof nextOrUpdater === 'function'
                ? nextOrUpdater(state.tenantsListUI)
                : nextOrUpdater
            set({
              tenantsListUI: { ...state.tenantsListUI, ...partial },
            })
          },

          setExpensesListUI: (nextOrUpdater) => {
            const state = get()
            const partial =
              typeof nextOrUpdater === 'function'
                ? nextOrUpdater(state.expensesListUI)
                : nextOrUpdater
            set({
              expensesListUI: { ...state.expensesListUI, ...partial },
            })
          },

          setTouched: (id, updater) => {
            const state = get()
            const prev = state.sectionTouched[id]
            const next = updater(prev as never)
            if (next === prev) return
            set({
              sectionTouched: {
                ...state.sectionTouched,
                [id]: next,
              },
            })
          },

          markSectionVisited: (id) => {
            const state = get()
            if (state.visitedSectionIds.has(id)) return
            const next = new Set(state.visitedSectionIds)
            next.add(id)
            set({ visitedSectionIds: next })
          },

          clearPersisted: () => {
            storeRef.current?.persist.clearStorage()
          },

          applyServerErrorsResponse: (response) => {
            // Pure-data action. Callers (the wizard submit handler, a
            // section's `onBeforeContinue`) decide what to do next — open
            // the first failing section, surface global toasts, etc. —
            // outside this function.
            if (response.ok) {
              set({
                sectionServerErrors: defaultSectionServerErrors(),
                globalErrors: [],
              })
              return
            }
            const state = get()
            const nextSectionServerErrors: Record<SectionId, SectionServerErrors> = {
              ...state.sectionServerErrors,
            }
            // Replace each listed section's slice with the incoming payload.
            // Per the spec, this is REPLACE not merge — the server's view of
            // a section's errors is authoritative for that round.
            if (response.sectionErrors) {
              for (const key of Object.keys(response.sectionErrors) as SectionId[]) {
                const incoming = response.sectionErrors[key]
                if (incoming !== undefined) {
                  nextSectionServerErrors[key] = incoming
                }
              }
            }

            // Add every section key with errors to visitedSectionIds so the
            // section-header validity badge flips on — otherwise an unvisited
            // section with errors stays quiet.
            let nextVisited = state.visitedSectionIds
            if (response.sectionErrors) {
              const keys = Object.keys(response.sectionErrors) as SectionId[]
              const missing = keys.filter((k) => !nextVisited.has(k))
              if (missing.length > 0) {
                const replacement = new Set(nextVisited)
                for (const k of missing) replacement.add(k)
                nextVisited = replacement
              }
            }

            set({
              sectionServerErrors: nextSectionServerErrors,
              globalErrors: response.globalErrors ?? [],
              visitedSectionIds: nextVisited,
            })
          },

          clearFieldServerError: (section, field) => {
            const state = get()
            const slice = state.sectionServerErrors[section] as
              | Record<string, string[]>
              | undefined
            if (!slice || slice[field] == null) return
            const nextSlice: Record<string, string[]> = { ...slice }
            delete nextSlice[field]
            set({
              sectionServerErrors: {
                ...state.sectionServerErrors,
                [section]: nextSlice,
              },
            })
          },

          clearRowServerErrors: (section, rowId) => {
            const state = get()
            const slice = state.sectionServerErrors[section] as
              | Record<string, Record<string, string[]>>
              | undefined
            if (!slice || slice[rowId] == null) return
            const nextSlice: Record<string, Record<string, string[]>> = {
              ...slice,
            }
            delete nextSlice[rowId]
            set({
              sectionServerErrors: {
                ...state.sectionServerErrors,
                [section]: nextSlice,
              },
            })
          },

          clearRowFieldServerError: (section, rowId, field) => {
            const state = get()
            const slice = state.sectionServerErrors[section] as
              | Record<string, Record<string, string[]>>
              | undefined
            const row = slice?.[rowId]
            if (!row || row[field] == null) return
            const nextRow: Record<string, string[]> = { ...row }
            delete nextRow[field]
            const nextSlice: Record<string, Record<string, string[]>> = {
              ...slice,
              [rowId]: nextRow,
            }
            set({
              sectionServerErrors: {
                ...state.sectionServerErrors,
                [section]: nextSlice,
              },
            })
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

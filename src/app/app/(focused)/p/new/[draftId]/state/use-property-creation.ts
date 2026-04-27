'use client'

import { useStore } from 'zustand'
import {
  getPropertyCreationStore,
  type PropertyCreationActions,
  type PropertyCreationStoreValue,
} from './store'
import {
  CHECKOUT_SECTIONS,
  getRequiredSectionIds,
  type SectionId,
} from './registry'
import type { SectionStatus } from './persistence'

// Re-export for consumers.
export { hydrate, clearPropertyCreation } from './store'
export type {
  PropertyCreationActions,
  PropertyCreationStoreValue,
} from './store'

/**
 * Selector-based read into the property creation store. Mirrors Zustand's
 * idiom — the hook re-renders only when the selected slice changes.
 *
 * Hydration is kicked off by the route root via `use(hydrate(wizardKey))` —
 * the Suspense boundary in page.tsx blocks render until the store is seeded,
 * so consumers of this hook never observe `hydrating: true` in practice.
 *
 * Selector convention:
 *   - Inline selectors returning a PRIMITIVE or a stable store ref
 *     (e.g. `s => s.step`, `s => s.sectionStates`) are safe — Zustand's
 *     `Object.is` comparison against the prior value skips the re-render.
 *   - Inline selectors that CONSTRUCT a new object/array on each call
 *     (e.g. `s => ({ a: s.a, b: s.b })`, `s => s.items.filter(...)`)
 *     break identity and cause render-per-store-change. Wrap with
 *     `useShallow` from `zustand/shallow` (or select each field on its own
 *     line and compose inside the component).
 */
export function usePropertyCreationState<T>(
  selector: (state: PropertyCreationStoreValue) => T,
): T {
  const store = getPropertyCreationStore()
  return useStore(store, selector)
}

/**
 * Returns the stable action bag. Does NOT subscribe — the action reference
 * never changes after store construction, so consumers can destructure freely
 * without worrying about re-renders on action calls.
 */
export function usePropertyCreationActions(): PropertyCreationActions {
  const store = getPropertyCreationStore()
  return store.getState().actions
}

// ---------------------------------------------------------------------------
// Per-section selectors. Each section component (property, rent-dates, etc.)
// reads its own slice of the store through these instead of writing the same
// inline selector six times. Each returns a primitive so Zustand's identity
// equality short-circuits the re-render when the value hasn't changed.
// ---------------------------------------------------------------------------

/** This section's status — `'upcoming' | 'completed' | 'skipped'`. */
export function useSectionStatus(id: SectionId): SectionStatus {
  return usePropertyCreationState((s) => s.sectionStates[id])
}

/** True when this section is currently expanded in the accordion. */
export function useIsSectionActive(id: SectionId): boolean {
  return usePropertyCreationState((s) => s.activeSectionId === id)
}

/**
 * True when this section is the immediate next upcoming section. Drives the
 * "Up next" status indicator and (in the locked-upcoming branch) decides
 * whether the section header is tappable.
 */
export function useIsSectionUpNext(id: SectionId): boolean {
  return usePropertyCreationState((s) => {
    const upNextId = CHECKOUT_SECTIONS.find(
      (x) => s.sectionStates[x.id] === 'upcoming',
    )?.id
    return upNextId === id
  })
}

/**
 * True when this section is required for the current entry path. Before the
 * path is committed (Step 1 not yet finished) every section is treated as
 * required so Skip cannot fire prematurely.
 */
export function useIsSectionRequired(id: SectionId): boolean {
  const path = usePropertyCreationState((s) => s.path)
  if (!path) return true
  return getRequiredSectionIds(path).includes(id)
}

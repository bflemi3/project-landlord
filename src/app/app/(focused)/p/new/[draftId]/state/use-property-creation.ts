'use client'

import { useStore } from 'zustand'
import {
  getPropertyCreationStore,
  type PropertyCreationActions,
  type PropertyCreationStoreValue,
} from './store'

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

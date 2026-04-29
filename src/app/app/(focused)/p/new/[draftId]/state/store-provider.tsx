'use client'

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useStore } from 'zustand'
import {
  createPropertyCreationStore,
  type PropertyCreationActions,
  type PropertyCreationStore,
  type PropertyCreationStoreValue,
} from './store'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StoreContext = createContext<PropertyCreationStore | null>(null)

/**
 * Provides a per-`draftId` Zustand store to its subtree. The factory runs
 * lazily inside `useState(() => …)` so the store is constructed once per
 * provider mount — never at module scope, never shared across requests.
 *
 * Mount this with `key={draftId}` so navigating to a different draft remounts
 * the provider and instantiates a fresh store with a different persist `name`.
 * The previous store is garbage collected; its IDB record stays untouched.
 *
 * Tests can inject a pre-constructed store via the optional `store` prop —
 * useful when a test needs `setState` / `getState` access outside the React
 * tree. In production, leave `store` unset; the provider lazy-creates one.
 */
export function PropertyCreationStoreProvider({
  draftId,
  store: providedStore,
  children,
}: {
  draftId: string
  store?: PropertyCreationStore
  children: ReactNode
}) {
  const [store] = useState(() => providedStore ?? createPropertyCreationStore(draftId))
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

function useStoreFromContext(): PropertyCreationStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error(
      'usePropertyCreation* hook must be used inside <PropertyCreationStoreProvider>',
    )
  }
  return store
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Selector-based read into the property creation store. Mirrors Zustand's
 * idiom — the hook re-renders only when the selected slice changes.
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
  const store = useStoreFromContext()
  return useStore(store, selector)
}

/**
 * Returns the stable action bag. Does NOT subscribe — the action reference
 * never changes after store construction, so consumers can destructure freely
 * without worrying about re-renders on action calls.
 */
export function usePropertyCreationActions(): PropertyCreationActions {
  const store = useStoreFromContext()
  return store.getState().actions
}

/**
 * Returns `true` once the persist middleware has finished hydrating the
 * wizard store from IndexedDB (or has decided there's nothing to hydrate).
 * Use to gate UI that depends on persisted state.
 *
 * Implemented via `useSyncExternalStore` so SSR snapshots return `false`
 * deterministically — `store.persist.hasHydrated()` is browser-only.
 *
 * Note: distinct from `useHasHydrated` in `src/lib/hooks/use-has-hydrated.ts`,
 * which is a generic React-hydration signal. This hook is wizard-store-scoped.
 */
export function usePropertyCreationHasHydrated(): boolean {
  const store = useStoreFromContext()
  return useSyncExternalStore(
    (cb) => store.persist.onFinishHydration(cb),
    () => store.persist.hasHydrated(),
    () => false,
  )
}

'use client'

import { useSyncExternalStore } from 'react'

// `useSyncExternalStore` is the React-blessed primitive for "this value differs
// between server and client snapshots." It returns `false` during SSR and the
// hydration render, then `true` after the first commit on the client. No
// effect, no setState — sidesteps the `react-you-might-not-need-an-effect`
// rule and avoids the cascading re-render the classic mounted-flag pattern
// triggers.
const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Returns `true` once the client has finished hydrating. Use to gate UI that
 * depends on client-only APIs (`window.matchMedia`, `localStorage`,
 * `next-themes`'s `useTheme()`, etc.) so SSR and the hydration render agree,
 * and the real values render only after hydration completes.
 *
 * Note: in components that are never SSR'd (rendered only on the client —
 * inside a portal, a dynamic import, etc.) this hook returns `true` from the
 * first render and tells you nothing useful. It is strictly a hydration
 * boundary signal, not a "did this component mount in the DOM" check.
 *
 * @example
 *   const hydrated = useHasHydrated()
 *   if (!hydrated) return null
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

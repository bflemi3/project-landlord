'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Returns whether the given CSS media query currently matches. Returns `false`
 * during SSR and the hydration render (safe default), then the real value on
 * subsequent renders. Subscribes to changes for the lifetime of the component.
 *
 * Implemented with `useSyncExternalStore` so server / client snapshots are
 * handled by React directly — no manual mounted-flag bookkeeping or
 * synchronous-setState-in-effect anti-patterns.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const getServerSnapshot = () => false

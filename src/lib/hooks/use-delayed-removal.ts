'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseDelayedRemovalOptions {
  /** Animation duration in ms before `commit` runs. Defaults to 200, matching
   *  the `AccordionItem` exit animation in `src/components/ui/accordion.tsx`. */
  duration?: number
}

interface UseDelayedRemovalReturn {
  /** True while the id is in the middle of its exit animation. Use this to
   *  drive an exit-animation prop on the rendered row (e.g. `isRemoving` on
   *  `AccordionItem`). */
  isRemoving: (id: string) => boolean
  /** Mark `id` as exiting; runs `commit` after `duration` ms. The hook owns
   *  the in-flight state and the timeout cleanup; the caller's `commit`
   *  performs the actual data removal (e.g. dropping the row from a store). */
  remove: (id: string, commit: () => void) => void
}

/**
 * Run an exit animation before committing a removal. Tracks which ids are
 * mid-animation so the renderer can apply an exit-animation class, then fires
 * the caller's `commit` after the duration.
 *
 * Cleans up any in-flight timeouts on unmount so a commit never lands on a
 * stale tree (and never calls a closure capturing torn-down state).
 */
export function useDelayedRemoval({
  duration = 200,
}: UseDelayedRemovalOptions = {}): UseDelayedRemovalReturn {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )
  // Tracks mount state for in-flight timeout callbacks. A timeout firing
  // just as the parent unmounts can race the cleanup effect: the callback
  // is already on the queue and runs even though `clearTimeout` was called
  // (clearTimeout no-ops on already-fired timers). The ref lets the
  // callback skip the `setPendingIds` call after unmount.
  const mountedRef = useRef(true)

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      mountedRef.current = false
      for (const tid of timeouts.values()) clearTimeout(tid)
      timeouts.clear()
    }
  }, [])

  const remove = useCallback(
    (id: string, commit: () => void) => {
      // Idempotent: a second call for the same id while removal is in-flight
      // is a no-op. Prevents double-fire from rapid clicks.
      if (timeoutsRef.current.has(id)) return
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      const tid = setTimeout(() => {
        // `try/finally` guarantees the in-flight bookkeeping is cleaned up
        // even when the caller's `commit` throws — without it, a throwing
        // commit would leave the id stuck in `pendingIds` / `timeoutsRef`
        // forever and the idempotent guard would silently drop every retry.
        try {
          commit()
        } finally {
          if (mountedRef.current) {
            setPendingIds((prev) => {
              if (!prev.has(id)) return prev
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }
          timeoutsRef.current.delete(id)
        }
      }, duration)
      timeoutsRef.current.set(id, tid)
    },
    [duration],
  )

  const isRemoving = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds],
  )

  return { isRemoving, remove }
}

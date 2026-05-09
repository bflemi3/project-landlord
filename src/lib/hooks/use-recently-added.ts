'use client'

import { useCallback, useState } from 'react'

interface UseRecentlyAddedReturn {
  /** The id of the most recently added item, or `null` if nothing has been
   *  added since the hook mounted (or the section closed and re-opened). */
  recentId: string | null
  /** Mark `id` as the most recently added. Replaces the prior recent id. */
  markAdded: (id: string) => void
  /** Predicate: is this id the most recently added one? Use it to drive
   *  one-shot effects like autoFocus on a freshly-rendered form field. */
  isJustAdded: (id: string) => boolean
}

/**
 * Tracks "the id of the row most recently appended to a list" for one-shot
 * UX cues — typically `autoFocus` on the first field of a freshly-mounted
 * form. Resets to `null` when the consumer unmounts (e.g. when the wizard's
 * section collapses), which is the right behavior: re-opening the section
 * should not refocus a stale row.
 */
export function useRecentlyAdded(): UseRecentlyAddedReturn {
  const [recentId, setRecentId] = useState<string | null>(null)

  const markAdded = useCallback((id: string) => {
    setRecentId(id)
  }, [])

  const isJustAdded = useCallback(
    (id: string) => id === recentId,
    [recentId],
  )

  return { recentId, markAdded, isJustAdded }
}

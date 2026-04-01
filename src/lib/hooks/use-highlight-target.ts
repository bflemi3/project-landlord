'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'

const SCROLL_SETTLE_MS = 500
const HIGHLIGHT_DURATION_MS = 5000

// =============================================================================
// Context
// =============================================================================

const HighlightContext = createContext<string | null>(null)

export const HighlightProvider = HighlightContext.Provider

// =============================================================================
// Consumer hook
// =============================================================================

/**
 * Returns a callback ref + highlighted state. When the element mounts
 * and its `targetId` matches the context value, scrolls into view
 * and plays a flash animation.
 *
 * Only one element should match — the first to consume wins.
 */
export function useHighlightTarget(targetId: string) {
  const highlightTarget = useContext(HighlightContext)
  const [highlighted, setHighlighted] = useState(false)
  const consumed = useRef(false)
  const [pendingFlash, setPendingFlash] = useState(false)

  const isMatch = highlightTarget === targetId && !consumed.current

  // Callback ref: scroll into view and signal the effect to start the flash
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node || !isMatch) return
      consumed.current = true
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setPendingFlash(true)
    },
    [isMatch],
  )

  useEffect(() => {
    if (!pendingFlash) return

    const settleTimer = setTimeout(() => {
      setHighlighted(true)

      const fadeTimer = setTimeout(() => {
        setHighlighted(false)
        setPendingFlash(false)
      }, HIGHLIGHT_DURATION_MS)

      timers.push(fadeTimer)
    }, SCROLL_SETTLE_MS)

    const timers = [settleTimer]
    return () => timers.forEach(clearTimeout)
  }, [pendingFlash])

  return { ref, highlighted }
}

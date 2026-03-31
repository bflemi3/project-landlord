'use client'

import { useLayoutEffect } from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Hides the floating app avatar on mobile while the calling component is mounted.
 * Uses useLayoutEffect to avoid a flash. Restores on unmount.
 *
 * Usage: call at the top of any component that needs the top-right
 * space on mobile (e.g., a flow with its own close button).
 */
export function useHideAppAvatarOnMobile() {
  useLayoutEffect(() => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) return

    const el = document.getElementById('app-avatar')
    if (!el) return

    el.style.display = 'none'
    return () => { el.style.display = '' }
  }, [])
}

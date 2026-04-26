'use client'

import { useMediaQuery } from './use-media-query'

const MOBILE_BREAKPOINT = 768

/**
 * Returns `true` when the viewport is below the mobile breakpoint (768px).
 * Returns `false` during SSR and the hydration render.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

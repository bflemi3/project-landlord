import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

// `gutter` must match the page's own horizontal padding so the bleed reaches the
// viewport edge; `resetAt` is the breakpoint where the content fits and the
// bleed/scroll is dropped. Tailwind needs static classes, so these are presets.
const GUTTER = {
  4: '-mx-4 pl-4',
  6: '-mx-6 pl-6',
  8: '-mx-8 pl-8',
} as const

const GAP = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
} as const

const RESET = {
  none: '',
  sm: 'sm:mx-0 sm:pl-0',
  md: 'md:mx-0 md:pl-0',
  lg: 'lg:mx-0 lg:pl-0',
} as const

interface EdgeScrollerProps extends ComponentProps<'div'> {
  /** Page gutter to bleed past — must equal the page's horizontal padding. */
  gutter?: keyof typeof GUTTER
  /** Gap between items. */
  gap?: keyof typeof GAP
  /** Breakpoint at which the bleed + scroll are dropped (where content fits). */
  resetAt?: keyof typeof RESET
}

/**
 * Full-bleed horizontal scroller: items overflow off the viewport and scroll
 * sideways with the scrollbar hidden, and the leading gutter scrolls off so
 * content reaches both edges. Children should be `shrink-0` to keep their width.
 */
function EdgeScroller({
  gutter = 6,
  gap = 2,
  resetAt = 'md',
  className,
  ...props
}: EdgeScrollerProps) {
  return (
    <div
      data-slot="edge-scroller"
      className={cn(
        'scrollbar-hide flex overflow-x-auto',
        GUTTER[gutter],
        GAP[gap],
        RESET[resetAt],
        className,
      )}
      {...props}
    />
  )
}

export { EdgeScroller }

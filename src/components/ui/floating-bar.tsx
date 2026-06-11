import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type FloatingBarPosition = 'top' | 'bottom'
type FloatingBarVisibility = 'mobile' | 'desktop' | 'all'

const positionClasses: Record<FloatingBarPosition, string> = {
  top: 'top-3 sm:top-5',
  bottom: 'bottom-[max(1rem,env(safe-area-inset-bottom))]',
}

const visibilityClasses: Record<FloatingBarVisibility, string> = {
  mobile: 'flex md:hidden',
  desktop: 'hidden md:flex',
  all: 'flex',
}

/**
 * Self-positioning floating pill nav. `position` anchors it to the viewport
 * top/bottom; `showOn` gates its breakpoint visibility. The outer frame is
 * click-through so it never blocks content beside the pill — only the pill
 * itself is interactive.
 */
function FloatingBar({
  className,
  position = 'bottom',
  showOn = 'all',
  ...props
}: ComponentProps<'div'> & {
  position?: FloatingBarPosition
  showOn?: FloatingBarVisibility
}) {
  return (
    <div
      data-slot="floating-bar-frame"
      data-position={position}
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 justify-center px-4',
        positionClasses[position],
        visibilityClasses[showOn],
      )}
    >
      <div
        data-slot="floating-bar"
        className={cn(
          'border-border bg-card/80 shadow-popover pointer-events-auto flex items-center gap-1 rounded-full border p-1.5 backdrop-blur-md',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function FloatingBarItem({
  className,
  active,
  ...props
}: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="floating-bar-item"
      data-active={active ? '' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-colors outline-none',
        'focus-visible:ring-ring focus-visible:ring-2',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function FloatingBarIcon({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="floating-bar-icon"
      className={cn('inline-flex shrink-0 [&>svg]:size-5', className)}
      {...props}
    />
  )
}

/**
 * Label that expands from zero width when its item is active. The grid
 * `0fr → 1fr` column reveal animates width with no JS; the inner span clips so
 * the text never forces the collapsed track open.
 */
function FloatingBarLabel({ className, children, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="floating-bar-label"
      className={cn(
        'grid grid-cols-[0fr] overflow-hidden transition-[grid-template-columns] duration-500 ease-out group-data-active:grid-cols-[1fr]',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 overflow-hidden pl-1.5 whitespace-nowrap">{children}</span>
    </span>
  )
}

export { FloatingBar, FloatingBarItem, FloatingBarIcon, FloatingBarLabel }

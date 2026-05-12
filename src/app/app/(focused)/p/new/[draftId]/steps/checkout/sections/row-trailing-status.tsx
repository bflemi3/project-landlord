import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface RowTrailingStatusProps {
  children: ReactNode
  icon?: LucideIcon
  tone: 'destructive' | 'primary' | 'muted'
  /** `'status'` is a secondary hint (Needs attention, Will invite) at
   *  `text-xs`; `'data'` is primary content (currency amount) that
   *  inherits the trigger's text size. Defaults to `'status'`. */
  variant?: 'status' | 'data'
  className?: string
}

const TONE_CLASS: Record<RowTrailingStatusProps['tone'], string> = {
  destructive: 'text-destructive',
  primary: 'text-primary',
  muted: 'text-muted-foreground',
}

/** Trailing-edge readout for accordion-row triggers. Icon optional; tone
 *  drives icon and label color. Used by tenant + expense rows to surface
 *  "needs attention", "will invite", currency amount, etc. */
export function RowTrailingStatus({
  children,
  icon: Icon,
  tone,
  variant = 'status',
  className,
}: RowTrailingStatusProps) {
  return (
    <span
      className={cn(
        'shrink-0 items-center gap-1.5 font-normal',
        variant === 'status' ? 'hidden sm:flex' : 'flex',
        className,
      )}
    >
      {Icon && <Icon aria-hidden className={cn('size-3', TONE_CLASS[tone])} />}
      <span
        className={cn(variant === 'status' && 'text-xs', TONE_CLASS[tone])}
      >
        {children}
      </span>
    </span>
  )
}

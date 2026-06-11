import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const toneClasses = {
  current: 'bg-current',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
  highlight: 'bg-highlight',
} as const

const sizeClasses = {
  xs: 'size-1',
  sm: 'size-1.5',
  md: 'size-2',
} as const

type DotProps = ComponentProps<'span'> & {
  tone?: keyof typeof toneClasses
  size?: keyof typeof sizeClasses
  /** Live "ping" halo — the active/online treatment. */
  pulse?: boolean
}

// Editorial status dot — the single source for dot-shaped indicators (status
// pills, attention markers, contract status, progress dots). The default
// `current` tone inherits the parent's text color so it composes inside
// tinted surfaces (badges, alerts); decorative by default (aria-hidden).
function Dot({ tone = 'current', size = 'sm', pulse = false, className, ...props }: DotProps) {
  if (pulse) {
    return (
      <span
        data-slot="dot"
        aria-hidden
        className={cn('relative flex shrink-0', sizeClasses[size], className)}
        {...props}
      >
        <span
          className={cn(
            'absolute inline-flex size-full animate-ping rounded-full opacity-70',
            toneClasses[tone],
          )}
        />
        <span className={cn('relative inline-flex size-full rounded-full', toneClasses[tone])} />
      </span>
    )
  }
  return (
    <span
      data-slot="dot"
      aria-hidden
      className={cn(
        'inline-block shrink-0 rounded-full',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

export { Dot }
export type { DotProps }

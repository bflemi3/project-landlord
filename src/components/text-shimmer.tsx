import * as React from 'react'
import { cn } from '@/lib/utils'

type TextShimmerElement = 'span' | 'p' | 'div'

function TextShimmer<T extends TextShimmerElement = 'span'>({
  className,
  as,
  duration = '2s',
  children,
  ...props
}: Omit<React.ComponentProps<T>, 'as'> & {
  as?: T
  duration?: string
}) {
  const Comp = (as ?? 'span') as TextShimmerElement
  return (
    <Comp
      data-slot="text-shimmer"
      className={cn(
        'inline-block bg-[length:250%_100%] bg-clip-text text-transparent',
        'animate-[text-shimmer_var(--shimmer-duration)_linear_infinite]',
        className,
      )}
      style={{
        '--shimmer-duration': duration,
        backgroundImage:
          'linear-gradient(110deg, oklch(from var(--muted-foreground) l c h / 0.4) 35%, var(--foreground) 50%, oklch(from var(--muted-foreground) l c h / 0.4) 65%)',
      } as React.CSSProperties}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Comp>
  )
}

export { TextShimmer }

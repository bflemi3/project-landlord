import * as React from 'react'
import { cn } from '@/lib/utils'

function StickyBottomBar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sticky-bottom-bar"
      className={cn(
        'shrink-0 border-t border-border bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  )
}

export { StickyBottomBar }

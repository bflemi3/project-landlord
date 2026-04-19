import * as React from 'react'
import { cn } from '@/lib/utils'

function SectionLabel({
  className,
  as = 'h3',
  ...props
}: React.ComponentProps<'h3'> & {
  as?: 'h2' | 'h3' | 'h4'
}) {
  const Comp = as
  return (
    <Comp
      data-slot="section-label"
      className={cn('mb-3 text-base font-semibold text-foreground', className)}
      {...props}
    />
  )
}

export { SectionLabel }

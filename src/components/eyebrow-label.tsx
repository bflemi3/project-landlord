import * as React from 'react'
import { cn } from '@/lib/utils'

type EyebrowLabelTone = 'primary' | 'muted' | 'foreground' | 'highlight'

const toneClasses: Record<EyebrowLabelTone, string> = {
  primary: 'text-primary',
  muted: 'text-muted-foreground',
  foreground: 'text-foreground/70',
  highlight: 'text-highlight',
}

function EyebrowLabel({
  className,
  tone = 'primary',
  ...props
}: React.ComponentProps<'span'> & {
  tone?: EyebrowLabelTone
}) {
  return (
    <span
      data-slot="eyebrow-label"
      data-tone={tone}
      className={cn(
        'font-mono text-xs font-medium uppercase tracking-widest',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

export { EyebrowLabel }

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

function ExplainerCard({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="explainer-card"
      className={cn(
        // Light mode: warm muted tint over the white card.
        // Dark mode: `muted` sits only ~0.05 lightness above `card`, so even
        // full-alpha `muted` barely separates against the parent. Tinting with
        // `foreground` at low alpha lifts past that ceiling — `/10` gives a
        // clearly visible warm-white wash without reading as an elevated card.
        'bg-muted/40 dark:bg-foreground/10 flex flex-col items-center gap-6 rounded-card px-6 py-8 text-center md:px-10 md:py-10',
        className,
      )}
      {...props}
    />
  )
}

function ExplainerCardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="explainer-card-title"
      className={cn('text-foreground text-base font-semibold', className)}
      {...props}
    />
  )
}

function ExplainerCardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="explainer-card-description"
      className={cn('text-muted-foreground text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

function ExplainerCardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="explainer-card-content"
      className={cn(
        'text-foreground flex w-full flex-col items-center gap-4 text-sm',
        // Lucide icons inside the content slot get the primary tint by
        // default. Size and alignment stay on the call site so the primitive
        // doesn't dictate visual rhythm beyond color.
        '[&_svg]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function ExplainerCardList({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="explainer-card-list"
      className={cn('flex flex-col gap-2 text-left', className)}
      {...props}
    />
  )
}

function ExplainerCardListItem({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="explainer-card-list-item"
      className={cn('flex items-start gap-2', className)}
      {...props}
    >
      <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </li>
  )
}

function ExplainerCardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="explainer-card-action"
      className={cn('flex items-center justify-center gap-2', className)}
      {...props}
    />
  )
}

export {
  ExplainerCard,
  ExplainerCardTitle,
  ExplainerCardDescription,
  ExplainerCardContent,
  ExplainerCardList,
  ExplainerCardListItem,
  ExplainerCardAction,
}

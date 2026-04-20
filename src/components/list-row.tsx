import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type ListRowVariant = 'solid' | 'dashed' | 'embedded'

const variantClasses: Record<ListRowVariant, string> = {
  solid: 'rounded-xl border border-border bg-card gap-3 px-4 py-3.5',
  dashed: 'rounded-xl border border-dashed border-border bg-card gap-3 px-4 py-3.5',
  embedded: 'bg-transparent gap-4 px-6 py-5',
}

function listRowClassName({
  variant = 'solid',
  interactive = true,
  className,
}: {
  variant?: ListRowVariant
  interactive?: boolean
  className?: string
} = {}) {
  const isEmbedded = variant === 'embedded'
  return cn(
    'flex w-full items-center text-left',
    !isEmbedded && 'dark:bg-muted/50',
    variantClasses[variant],
    interactive && !isEmbedded && 'transition-colors hover:border-primary/20',
    interactive && isEmbedded && 'transition-colors hover:bg-muted/40',
    className,
  )
}

function ListRow({
  variant = 'solid',
  interactive = true,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: ListRowVariant
  interactive?: boolean
}) {
  return (
    <div
      data-slot="list-row"
      data-variant={variant}
      className={listRowClassName({ variant, interactive, className })}
      {...props}
    />
  )
}

function ListRowButton({
  variant = 'solid',
  className,
  ...props
}: React.ComponentProps<'button'> & {
  variant?: ListRowVariant
}) {
  return (
    <button
      data-slot="list-row"
      data-variant={variant}
      className={listRowClassName({ variant, interactive: true, className })}
      {...props}
    />
  )
}

function ListRowLeading({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="list-row-leading"
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

function ListRowBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="list-row-body"
      className={cn('min-w-0 flex-1', className)}
      {...props}
    />
  )
}

function ListRowTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="list-row-title"
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  )
}

function ListRowDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="list-row-description"
      className={cn('mt-0.5 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function ListRowTrailing({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="list-row-trailing"
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

function ListRowChevron({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <ChevronRight
      data-slot="list-row-chevron"
      className={cn('size-4 shrink-0 text-muted-foreground/40', className)}
      {...props}
    />
  )
}

function List({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="list"
      className={cn('divide-y divide-border/70 dark:divide-border/80', className)}
      {...props}
    />
  )
}

export {
  ListRow,
  ListRowButton,
  ListRowLeading,
  ListRowBody,
  ListRowTitle,
  ListRowDescription,
  ListRowTrailing,
  ListRowChevron,
  List,
  listRowClassName,
}

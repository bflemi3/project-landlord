'use client'

import * as React from 'react'
import { ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function ChargeRow({
  className,
  configured = false,
  disabled = false,
  onClick,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  configured?: boolean
  disabled?: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
        }
      }}
      data-slot="charge-row"
      data-configured={configured}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
        disabled ? 'opacity-50' : 'cursor-default',
        configured
          ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
          : 'border-border hover:not-disabled:border-primary/20',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ChargeRowIcon({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="charge-row-icon"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg',
        'group-data-[configured=true]/charge:bg-primary/10 group-data-[configured=true]/charge:text-primary',
        'bg-secondary text-muted-foreground',
        // Use parent's data-configured to style
        '[[data-configured=true]>&]:bg-primary/10 [[data-configured=true]>&]:text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ChargeRowContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="charge-row-content"
      className={cn('min-w-0 flex-1', className)}
      {...props}
    />
  )
}

function ChargeRowTitle({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="charge-row-title"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

function ChargeRowDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="charge-row-description"
      className={cn('mt-0.5 truncate text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

function ChargeRowAmount({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="charge-row-amount"
      className={cn('text-base font-bold tabular-nums text-foreground', className)}
      {...props}
    />
  )
}

function ChargeRowActions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="charge-row-actions"
      className={cn('flex shrink-0 items-center gap-2', className)}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  )
}

function ChargeRowRemove({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      data-slot="charge-row-remove"
      className={className}
      {...props}
    >
      <X />
    </Button>
  )
}

function ChargeRowChevron({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div data-slot="charge-row-chevron" className={cn('shrink-0', className)} {...props}>
      <ChevronRight className="size-4 text-muted-foreground/40" />
    </div>
  )
}

export {
  ChargeRow,
  ChargeRowIcon,
  ChargeRowContent,
  ChargeRowTitle,
  ChargeRowDescription,
  ChargeRowAmount,
  ChargeRowActions,
  ChargeRowRemove,
  ChargeRowChevron,
}

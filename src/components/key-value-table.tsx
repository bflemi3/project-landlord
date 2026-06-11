import * as React from 'react'
import { cn } from '@/lib/utils'

function KeyValueTable({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="key-value-table"
      className={cn(
        'divide-border border-border bg-secondary/50 divide-y rounded-2xl border',
        className,
      )}
      {...props}
    />
  )
}

function KeyValueRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="key-value-row"
      className={cn('flex items-center justify-between px-4 py-3', className)}
      {...props}
    />
  )
}

function KeyValueLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="key-value-label"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function KeyValueValue({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="key-value-value"
      className={cn('text-foreground text-sm font-medium', className)}
      {...props}
    />
  )
}

export { KeyValueTable, KeyValueRow, KeyValueLabel, KeyValueValue }

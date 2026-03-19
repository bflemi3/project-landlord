import * as React from 'react'
import { cn } from '@/lib/utils'

function KeyValueTable({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="key-value-table"
      className={cn(
        'divide-y divide-border rounded-2xl border border-border bg-secondary/50',
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
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function KeyValueValue({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="key-value-value"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

export { KeyValueTable, KeyValueRow, KeyValueLabel, KeyValueValue }

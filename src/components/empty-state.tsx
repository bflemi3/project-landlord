import * as React from 'react'
import { IconTile } from '@/components/icon-tile'
import { cn } from '@/lib/utils'

type EmptyStateTone = React.ComponentProps<typeof IconTile>['tone']

function EmptyState({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}
      {...props}
    />
  )
}

function EmptyStateIcon({
  tone = 'muted',
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  tone?: EmptyStateTone
  children?: React.ReactNode
}) {
  return (
    <IconTile
      data-slot="empty-state-icon"
      size="lg"
      shape="circle"
      tone={tone}
      className={className}
      {...props}
    >
      {children}
    </IconTile>
  )
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="empty-state-title"
      className={cn('text-foreground text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function EmptyStateDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn('text-muted-foreground max-w-sm text-sm/relaxed', className)}
      {...props}
    />
  )
}

function EmptyStateActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn('flex items-center justify-center gap-2', className)}
      {...props}
    />
  )
}

export { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDescription, EmptyStateActions }
export type { EmptyStateTone }

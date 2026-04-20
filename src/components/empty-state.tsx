import * as React from 'react'
import { IconTile } from '@/components/icon-tile'
import { cn } from '@/lib/utils'

type EmptyStateTone = React.ComponentProps<typeof IconTile>['tone']

function EmptyState({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
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
      className={cn('mb-5', className)}
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
      className={cn(
        'text-lg font-semibold tracking-tight text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function EmptyStateDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn(
        'mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function EmptyStateActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn('mt-6 flex items-center justify-center gap-3', className)}
      {...props}
    />
  )
}

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
}
export type { EmptyStateTone }

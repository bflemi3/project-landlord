import * as React from 'react'
import { cn } from '@/lib/utils'

type StatusBadgeVariant =
  | 'default'
  | 'draft'
  | 'published'
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'disputed'
  | 'rejected'

const variantClasses: Record<StatusBadgeVariant, string> = {
  default: 'bg-secondary text-secondary-foreground',
  draft: 'border border-dashed border-border bg-secondary/50 text-muted-foreground',
  published: 'bg-primary/10 text-primary',
  paid: 'bg-success/10 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-warning/10 text-amber-700 dark:text-amber-400',
  overdue: 'bg-destructive/10 text-destructive',
  disputed: 'bg-warning/10 text-amber-700 dark:text-amber-400',
  rejected: 'bg-destructive/10 text-destructive',
}

function StatusBadge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: StatusBadgeVariant }) {
  return (
    <span
      data-slot="status-badge"
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium [&_svg]:size-3',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export { StatusBadge }
export type { StatusBadgeVariant }

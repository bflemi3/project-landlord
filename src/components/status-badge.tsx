import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Dot } from '@/components/ui/dot'
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

// Map each status to an editorial Badge variant. Status semantics live here;
// the pill chrome (shape, tint, ring) lives in Badge.
const variantMap: Record<StatusBadgeVariant, React.ComponentProps<typeof Badge>['variant']> = {
  default: 'secondary',
  draft: 'outline',
  published: 'primary-subtle',
  paid: 'success-subtle',
  pending: 'warning-subtle',
  overdue: 'destructive-subtle',
  disputed: 'warning-subtle',
  rejected: 'destructive-subtle',
}

// Draft reads as a quiet dashed chip with no leading dot.
const NO_DOT = new Set<StatusBadgeVariant>(['draft'])

function StatusBadge({
  className,
  variant = 'default',
  spotlight,
  children,
  ...props
}: React.ComponentProps<'span'> & { variant?: StatusBadgeVariant; spotlight?: boolean }) {
  return (
    <Badge
      variant={variantMap[variant]}
      spotlight={spotlight}
      data-slot="status-badge"
      data-variant={variant}
      className={cn(
        'gap-1.5',
        variant === 'default' && 'text-muted-foreground',
        variant === 'draft' && 'text-muted-foreground border-dashed border-white/20',
        className,
      )}
      {...props}
    >
      {!NO_DOT.has(variant) && <Dot />}
      {children}
    </Badge>
  )
}

export { StatusBadge }
export type { StatusBadgeVariant }

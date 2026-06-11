import * as React from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardShellClassName, type CardSize } from '@/components/ui/card'
import { EyebrowLabel } from '@/components/eyebrow-label'
import type { PropertySetupProgress, PropertyOperationalData } from '@/lib/types/property'

// =============================================================================
// Helpers — shared between home page, property detail, and preview
// =============================================================================

export function getCompletionSteps(
  progress: PropertySetupProgress,
): { label: string; key: string; done: boolean; inProgress: boolean }[] {
  return [
    {
      label: 'propertyCreated',
      key: 'property',
      done: progress.propertyCreated,
      inProgress: false,
    },
    {
      label: 'tenantsStep',
      key: 'tenants',
      done: progress.tenantsAccepted,
      inProgress: progress.tenantsInvited && !progress.tenantsAccepted,
    },
    { label: 'chargesStep', key: 'charges', done: progress.chargesConfigured, inProgress: false },
    {
      label: 'firstStatementStep',
      key: 'statement',
      done: progress.firstStatementPublished,
      inProgress: false,
    },
  ]
}

export function isPropertyComplete(progress: PropertySetupProgress): boolean {
  return getCompletionSteps(progress).every((s) => s.done)
}

export interface StatusBadge {
  labelKey: string
  labelParams?: Record<string, number>
  dot: string
  text: string
}

export function getStatusBadge(opData: PropertyOperationalData | undefined): StatusBadge | null {
  if (!opData) return null

  if (opData.unpaidCount > 0) {
    return {
      labelKey: 'statusUnpaid',
      labelParams: { count: opData.unpaidCount },
      dot: 'bg-destructive',
      text: 'text-destructive-subtle-foreground',
    }
  }

  if (opData.pendingBillCount > 0) {
    return {
      labelKey: 'statusBillsPending',
      labelParams: { count: opData.pendingBillCount },
      dot: 'bg-warning',
      text: 'text-warning-subtle-foreground',
    }
  }

  return {
    labelKey: 'statusAllPaid',
    dot: 'bg-success',
    text: 'text-success-subtle-foreground',
  }
}

// =============================================================================
// Compound primitives
// =============================================================================

type PropertyCardProps = {
  href?: string
  size?: CardSize
  className?: string
  children?: React.ReactNode
}

function PropertyCard({ href, size = 'md', className, children }: PropertyCardProps) {
  const shell = cardShellClassName({
    size,
    interactive: !!href,
    className: cn('group block w-full overflow-hidden text-left', className),
  })

  if (href) {
    return (
      <Link data-slot="property-card" prefetch href={href} className={shell}>
        {children}
      </Link>
    )
  }
  return (
    <div data-slot="property-card" className={shell}>
      {children}
    </div>
  )
}

function PropertyCardHead({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="property-card-head"
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    />
  )
}

function PropertyCardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="property-card-body" className={cn('min-w-0 flex-1', className)} {...props} />
  )
}

function PropertyCardEyebrow({
  className,
  ...props
}: Omit<React.ComponentProps<typeof EyebrowLabel>, 'tone'>) {
  return (
    <EyebrowLabel
      data-slot="property-card-eyebrow"
      tone="muted"
      className={cn('text-muted-foreground/70 block font-semibold', className)}
      {...props}
    />
  )
}

function PropertyCardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="property-card-title"
      className={cn(
        'text-foreground mt-1.5 truncate text-xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    />
  )
}

function PropertyCardSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="property-card-subtitle"
      className={cn('text-muted-foreground mt-1 text-sm', className)}
      {...props}
    />
  )
}

function PropertyCardChevron({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <ChevronRight
      data-slot="property-card-chevron"
      className={cn(
        'text-muted-foreground/40 mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5',
        className,
      )}
      {...props}
    />
  )
}

function PropertyCardAmount({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="property-card-amount"
      className={cn(
        'text-foreground mt-8 font-mono text-3xl font-bold tracking-tight tabular-nums',
        className,
      )}
      {...props}
    />
  )
}

type StatusTone = 'muted' | 'success' | 'warning' | 'destructive' | 'info'

const statusToneClasses: Record<StatusTone, string> = {
  muted: 'text-muted-foreground',
  success: 'text-success-subtle-foreground',
  warning: 'text-warning-subtle-foreground',
  destructive: 'text-destructive-subtle-foreground',
  info: 'text-info-subtle-foreground',
}

function PropertyCardStatus({
  tone = 'muted',
  className,
  ...props
}: React.ComponentProps<'p'> & { tone?: StatusTone }) {
  return (
    <p
      data-slot="property-card-status"
      data-tone={tone}
      className={cn('mt-2 text-sm', statusToneClasses[tone], className)}
      {...props}
    />
  )
}

function PropertyCardProgress({
  completed,
  total,
  label,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  completed: number
  total: number
  label?: React.ReactNode
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div data-slot="property-card-progress" className={cn('mt-3', className)} {...props}>
      {label !== undefined && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
          <span className="text-primary text-xs font-semibold">{pct}%</span>
        </div>
      )}
      <div className="bg-border h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PropertyCardSteps({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="property-card-steps" className={cn('mt-3 space-y-2', className)} {...props} />
  )
}

type StepState = 'done' | 'inProgress' | 'pending'

const stepLabelClasses: Record<StepState, string> = {
  done: 'text-muted-foreground',
  inProgress: 'font-medium text-foreground',
  pending: 'text-muted-foreground/60',
}

function PropertyCardStep({
  state = 'pending',
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  state?: StepState
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="property-card-step"
      data-state={state}
      className={cn('flex items-center gap-2.5', className)}
      {...props}
    >
      {state === 'done' ? (
        <div className="bg-primary-subtle flex size-5 items-center justify-center rounded-full">
          <Check className="text-primary-subtle-foreground size-3" />
        </div>
      ) : state === 'inProgress' ? (
        <div className="bg-primary-subtle flex size-5 items-center justify-center rounded-full">
          <Clock className="text-primary-subtle-foreground size-3" />
        </div>
      ) : (
        <div className="border-border size-5 rounded-full border" />
      )}
      <span className={cn('text-sm', stepLabelClasses[state])}>{children}</span>
    </div>
  )
}

export {
  PropertyCard,
  PropertyCardHead,
  PropertyCardBody,
  PropertyCardEyebrow,
  PropertyCardTitle,
  PropertyCardSubtitle,
  PropertyCardChevron,
  PropertyCardAmount,
  PropertyCardStatus,
  PropertyCardProgress,
  PropertyCardSteps,
  PropertyCardStep,
}
export type { StatusTone, StepState }

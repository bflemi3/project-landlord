import * as React from 'react'
import { cn } from '@/lib/utils'

type InfoBoxVariant = 'default' | 'warning' | 'success' | 'destructive'

const variantClasses: Record<InfoBoxVariant, string> = {
  default: 'bg-secondary/50 border-border text-muted-foreground',
  warning: 'bg-warning/10 border-warning/20 text-amber-700 dark:text-amber-400',
  success: 'bg-success/10 border-success/20 text-emerald-700 dark:text-emerald-400',
  destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
}

function InfoBox({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: InfoBoxVariant }) {
  return (
    <div
      data-slot="info-box"
      data-variant={variant}
      className={cn(
        'flex gap-3 rounded-2xl border px-5 py-5 text-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

function InfoBoxIcon({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="info-box-icon"
      className={cn('mt-0.5 shrink-0 [&_svg]:size-4', className)}
      {...props}
    />
  )
}

function InfoBoxContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="info-box-content"
      className={cn('min-w-0 flex-1', className)}
      {...props}
    />
  )
}

function InfoBoxDivider({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="info-box-divider"
      className={cn('my-4 h-px bg-border dark:bg-zinc-700', className)}
      {...props}
    />
  )
}

export { InfoBox, InfoBoxIcon, InfoBoxContent, InfoBoxDivider }

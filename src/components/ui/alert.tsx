import { type ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { Dot } from '@/components/ui/dot'
import { cn } from '@/lib/utils'

// Editorial alert (locked 2026-06-10). Borderless subtle surface: bg = token/15, text = the
// *-subtle-foreground pair, dot/icon = full-strength token. Two densities:
// `banner` (single truncating line, dot-led, trailing action) and `default`
// (icon + title + description). Replaces the retired InfoBox.
const alertVariants = cva('flex w-full text-sm [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      neutral:
        'bg-muted/50 text-muted-foreground *:data-[slot=alert-dot]:bg-muted-foreground/60 [&>svg]:text-muted-foreground',
      info: 'bg-primary-subtle text-primary-subtle-foreground *:data-[slot=alert-dot]:bg-primary [&>svg]:text-primary',
      success:
        'bg-success-subtle text-success-subtle-foreground *:data-[slot=alert-dot]:bg-success [&>svg]:text-success',
      warning:
        'bg-warning-subtle text-warning-subtle-foreground *:data-[slot=alert-dot]:bg-warning [&>svg]:text-warning',
      destructive:
        'bg-destructive-subtle text-destructive-subtle-foreground *:data-[slot=alert-dot]:bg-destructive [&>svg]:text-destructive',
    },
    size: {
      default: 'items-start gap-3 rounded-[14px] px-4 py-3.5 [&>svg]:mt-0.5',
      banner: 'items-center gap-2.5 rounded-xl px-4 py-2.5',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'default',
  },
})

function Alert({
  className,
  variant,
  size,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? 'neutral'}
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/** Dot lead for the `banner` density — colored by the parent's variant. */
function AlertDot({ ...props }: ComponentProps<typeof Dot>) {
  return <Dot data-slot="alert-dot" {...props} />
}

function AlertBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-body" className={cn('min-w-0 flex-1', className)} {...props} />
}

function AlertTitle({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="alert-title" className={cn('font-medium', className)} {...props} />
}

function AlertDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="alert-description"
      className={cn('mt-0.5 text-[13px] leading-snug opacity-80', className)}
      {...props}
    />
  )
}

/** Trailing action slot — links/buttons inside render as 12px mono underline. */
function AlertAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        'ml-auto shrink-0 self-center font-mono text-xs [&_a]:underline [&_a]:underline-offset-2 [&_button]:underline [&_button]:underline-offset-2',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertDot, AlertBody, AlertTitle, AlertDescription, AlertAction }

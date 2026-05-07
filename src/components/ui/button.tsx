'use client'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { buttonVariants } from './button-variants'

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

// Mirrors the per-size gap from `buttonVariants`. The loading state cross-
// fades the children layer with a centered spinner overlay, so children get
// wrapped in their own flex span (so we can animate opacity independently of
// the overlay). That wrapper has to apply the same intra-children gap the
// button would otherwise place between an icon and a label.
const innerGapBySize: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'gap-2',
  sm: 'gap-1.5',
  xs: 'gap-1.5',
  lg: 'gap-2.5',
  icon: '',
  'icon-xs': '',
  'icon-sm': '',
  'icon-lg': '',
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {/* Inner wrapper owns the `relative` so the spinner overlay anchors
       *  here instead of the button itself — we can't put `relative` on the
       *  button because consumer-supplied `absolute` (e.g. dialog close) would
       *  collide with it via tailwind-merge. */}
      <span className="relative inline-flex items-center justify-center">
        <span
          className={cn(
            'inline-flex items-center',
            innerGapBySize[size ?? 'default'],
            'motion-safe:transition-opacity motion-safe:duration-300',
            loading && 'opacity-0',
          )}
        >
          {children}
        </span>
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 inline-flex items-center justify-center',
            'motion-safe:transition-opacity motion-safe:duration-300',
            loading ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <Loader2 className="animate-spin" />
        </span>
      </span>
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }

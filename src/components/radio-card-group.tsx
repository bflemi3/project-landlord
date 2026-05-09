'use client'

import type { ComponentType } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const radioCardLayoutVariants = cva('grid w-full', {
  variants: {
    variant: {
      card: 'grid-cols-2 gap-3 md:grid-cols-4',
      chip: 'grid-cols-2 gap-2 md:grid-cols-3',
    },
  },
  defaultVariants: { variant: 'card' },
})

/**
 * Per-card classNames. Exported so non-radio siblings (e.g. the "More
 * options" trigger in `ExpenseTypeSelector`) can match the same chrome
 * without forking the styling.
 *
 * The dark-mode + selected styling is intentionally compounded
 * (`dark:data-checked:`) so the selected state's primary border beats the
 * dark-mode lift's `foreground/15` ring at equal CSS specificity. Without
 * this, the cards lose their primary outline when checked in dark mode.
 */
export const radioCardVariants = cva(
  cn(
    'flex cursor-pointer border text-sm outline-none transition-colors',
    'border-border bg-card hover:bg-accent',
    // Dark mode: `bg-card` and `border-border` collapse to nearly the same
    // lightness as the parent card. Tint with `foreground/N` to lift past
    // that ceiling. Same family of fix as ExplainerCard, the input `card`
    // variant, and the chip-styled controls below.
    'dark:border-foreground/15 dark:bg-foreground/5 dark:hover:bg-foreground/10',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
    'data-checked:border-primary data-checked:bg-primary-subtle data-checked:text-primary-subtle-foreground',
    'dark:data-checked:border-primary dark:data-checked:bg-primary-subtle dark:data-checked:text-primary-subtle-foreground',
  ),
  {
    variants: {
      variant: {
        // Card: vertical stack — icon top, label below. Used for low-count,
        // high-prominence selections (e.g. property type).
        card: 'flex-col items-center gap-2 rounded-card p-4',
        // Chip: horizontal pill — icon left, label right, content centered
        // on the main axis so each chip reads as a balanced unit regardless
        // of label length. Used for compact, higher-count selections that
        // should feel like form controls rather than poster cards
        // (e.g. expense type).
        chip: 'items-center justify-center gap-2 rounded-2xl px-3 py-3',
      },
    },
    defaultVariants: { variant: 'card' },
  },
)

const radioCardIconVariants = cva('shrink-0', {
  variants: {
    variant: {
      card: 'size-6',
      chip: 'size-4',
    },
  },
  defaultVariants: { variant: 'card' },
})

export interface RadioCardOption<T extends string> {
  icon: ComponentType<{ className?: string }>
  label: string
  value: T
}

interface RadioCardGroupProps<T extends string>
  extends VariantProps<typeof radioCardVariants> {
  options: readonly RadioCardOption<T>[]
  value: T | null
  className?: string
  'aria-label'?: string
  onValueChange: (value: T | null) => void
}

export function RadioCardGroup<T extends string>({
  options,
  value,
  variant,
  className,
  'aria-label': ariaLabel,
  onValueChange,
}: RadioCardGroupProps<T>) {
  return (
    <RadioGroup
      data-slot="radio-card-group"
      data-variant={variant ?? 'card'}
      aria-label={ariaLabel}
      value={value}
      onValueChange={(v) => onValueChange(v as T | null)}
      className={cn(radioCardLayoutVariants({ variant }), className)}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        return (
          <Radio.Root
            key={opt.value}
            data-slot="radio-card"
            value={opt.value}
            className={radioCardVariants({ variant })}
          >
            <Icon className={radioCardIconVariants({ variant })} />
            {opt.label}
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}

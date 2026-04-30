'use client'

import type { ComponentType } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'

import { cn } from '@/lib/utils'

export interface RadioCardOption<T extends string> {
  icon: ComponentType<{ className?: string }>
  label: string
  value: T
}

interface RadioCardGroupProps<T extends string> {
  options: readonly RadioCardOption<T>[]
  value: T | null
  className?: string
  'aria-label'?: string
  onValueChange: (value: T | null) => void
}

export function RadioCardGroup<T extends string>({
  options,
  value,
  className,
  'aria-label': ariaLabel,
  onValueChange,
}: RadioCardGroupProps<T>) {
  return (
    <RadioGroup
      data-slot="radio-card-group"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(v) => onValueChange(v as T | null)}
      className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        return (
          <Radio.Root
            key={opt.value}
            data-slot="radio-card"
            value={opt.value}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-card border p-4 text-sm outline-none transition-colors',
              'border-border bg-card hover:bg-accent',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'data-checked:border-primary data-checked:bg-primary-subtle data-checked:text-primary-subtle-foreground',
            )}
          >
            <Icon className="size-6" />
            {opt.label}
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}

'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const checkboxVariants = cva(
  'peer flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-input outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30',
  {
    // Selected + focus accent. `primary` (teal) is the app default; `highlight`
    // (magenta `--highlight`) matches the editorial marketing surfaces.
    variants: {
      tone: {
        primary:
          'focus-visible:border-ring focus-visible:ring-ring/25 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary',
        highlight:
          'focus-visible:border-highlight focus-visible:ring-highlight/25 data-checked:border-highlight data-checked:bg-highlight data-checked:text-highlight-foreground dark:data-checked:bg-highlight',
      },
    },
    defaultVariants: { tone: 'primary' },
  },
)

function Checkbox({
  className,
  tone,
  ...props
}: CheckboxPrimitive.Root.Props & VariantProps<typeof checkboxVariants>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ tone }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, checkboxVariants }

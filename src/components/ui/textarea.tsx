'use client'

import { type ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const textareaVariants = cva(
  // Mirrors the input primitive's structural + state chrome, sized for
  // multi-line entry. See `input.tsx` for the dark-mode lift rationale.
  'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 min-h-24 w-full min-w-0 resize-y rounded-md border px-4 py-3 text-base transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2',
  {
    variants: {
      variant: {
        card: 'bg-muted dark:bg-foreground/5 dark:border-foreground/15',
        page: 'bg-transparent dark:bg-input/30',
      },
    },
    defaultVariants: { variant: 'card' },
  },
)

interface TextareaProps
  extends ComponentProps<'textarea'>,
    VariantProps<typeof textareaVariants> {}

function Textarea({ className, variant, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
export type { TextareaProps }

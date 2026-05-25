import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2.5 py-0.5 font-sans text-[12px] leading-[18px] font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring/25 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline: 'border border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground [a]:hover:bg-success/80',
        'success-subtle': 'bg-success-subtle text-success-subtle-foreground',
        'primary-subtle': 'bg-primary-subtle text-primary-subtle-foreground',
        'warning-subtle': 'bg-warning-subtle text-warning-subtle-foreground',
        'info-subtle': 'bg-info-subtle text-info-subtle-foreground',
        'destructive-subtle': 'bg-destructive-subtle text-destructive-subtle-foreground',
        highlight: 'bg-highlight text-highlight-foreground [a]:hover:bg-highlight/80',
        'highlight-subtle': 'bg-highlight-subtle text-highlight-subtle-foreground',
      },
      // Magenta emphasis ring — marks the single pill that should catch the eye
      // (e.g. a just-detected payment). Offset color is the card surface it sits on.
      spotlight: {
        true: 'ring-2 ring-highlight/40 ring-offset-2 ring-offset-card',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      spotlight: false,
    },
  },
)

function Badge({
  className,
  variant = 'default',
  spotlight = false,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant, spotlight }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }

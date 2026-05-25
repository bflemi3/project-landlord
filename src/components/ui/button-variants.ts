import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-base font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:not-disabled:bg-primary/80',
        outline:
          'border-border bg-background hover:not-disabled:bg-muted hover:not-disabled:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:not-disabled:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:not-disabled:brightness-95 dark:hover:not-disabled:brightness-125 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'text-muted-foreground hover:not-disabled:bg-muted hover:not-disabled:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:not-disabled:bg-muted/50 [&.text-destructive]:text-destructive [&.text-destructive]:hover:not-disabled:bg-destructive/10 [&.text-destructive]:hover:not-disabled:text-destructive',
        destructive:
          'bg-destructive/10 text-destructive hover:not-disabled:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:not-disabled:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        warning:
          'border-warning/30 bg-warning/10 text-warning hover:not-disabled:bg-warning/20 focus-visible:border-warning/40 focus-visible:ring-warning/20',
        link: 'text-primary underline-offset-4 hover:not-disabled:underline',
      },
      size: {
        default:
          'h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        xs: "h-8 gap-1.5 px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-10 gap-1.5 px-4 text-base md:text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        lg: 'h-14 gap-2.5 px-8 text-xl md:text-lg has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6',
        icon: 'size-8',
        'icon-xs':
          "size-6 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          "size-7 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': "size-9 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

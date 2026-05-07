'use client'

import { useMemo } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        className,
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-2 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-6 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        className,
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  'group/field flex w-full gap-2 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
        horizontal:
          'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        responsive:
          'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
)

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

type FieldRowProps = React.ComponentProps<'div'> & {
  columns?: 2 | 3
  /**
   * Viewport at which the row switches from stacked to multi-column.
   * `'always'` keeps the columns at every viewport. Default `'md'`.
   */
  breakpoint?: 'always' | 'sm' | 'md' | 'lg'
}

function FieldRow({
  className,
  columns = 2,
  breakpoint = 'md',
  ...props
}: FieldRowProps) {
  // Stacked row gap matches FieldGroup (24px) so single-column siblings inside
  // a row don't sit visibly tighter than non-paired FieldGroup children. Once
  // the row activates, fields tighten to gap-4 because they're a paired group.
  // Tailwind needs to see literal class strings — keep these inline.
  const gridClass = {
    2: {
      always: 'grid-cols-2 gap-4',
      sm: 'grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4',
      md: 'grid-cols-1 gap-6 md:grid-cols-2 md:gap-4',
      lg: 'grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-4',
    },
    3: {
      always: 'grid-cols-3 gap-4',
      sm: 'grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4',
      md: 'grid-cols-1 gap-6 md:grid-cols-3 md:gap-4',
      lg: 'grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-4',
    },
  }[columns][breakpoint]

  return (
    <div
      data-slot="field-row"
      className={cn('grid w-full', gridClass, className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        'group/field-content flex flex-1 flex-col gap-1 leading-snug',
        className,
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-3 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-2',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-6 text-sm group-data-[variant=outline]/field-group:-mb-2',
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  )
}

// =============================================================================
// FieldActionRow
//
// Composes `Field orientation="horizontal"` for the row layout and adds a
// trailing slot whose visibility is animated. Used for fields that pair an
// input with a contextual action — typically an inline Save button revealed
// only while the field is dirty. The trailing slot transitions max-width,
// opacity, and margin together so the input grows back into the freed space
// without a layout jump. Container handles geometry only; the parent decides
// what the action is (a Button, a link, a confirm + cancel pair, anything).
// =============================================================================

interface FieldActionRowProps {
  /** The leading content — usually the input. */
  children: React.ReactNode
  /** The trailing action element rendered inside the revealable slot. */
  action: React.ReactNode
  /** When true, the action slot is fully visible. When false, it collapses
   *  to zero width, fades out, and is removed from tab/screen-reader order. */
  actionVisible: boolean
  className?: string
}

function FieldActionRow({
  action,
  actionVisible,
  children,
  className,
}: FieldActionRowProps) {
  return (
    // `gap-0` overrides Field's default gap-2 — the animated wrapper applies
    // its own `ml-2` when visible, so the gap collapses with the slot.
    // `items-start` overrides `items-center` to align the action with the
    // top edge of the input rather than its middle.
    <Field orientation="horizontal" className={cn('items-start gap-0', className)}>
      <div className="flex-1">{children}</div>
      <div
        // `inert` removes the collapsed action from tab/click/screen-reader
        // surface; `aria-hidden` is a defense-in-depth for older runtimes.
        inert={!actionVisible}
        aria-hidden={!actionVisible}
        className={cn(
          'overflow-hidden motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out',
          actionVisible
            ? 'ml-2 max-w-32 opacity-100'
            : 'ml-0 max-w-0 opacity-0',
        )}
      >
        {action}
      </div>
    </Field>
  )
}

export {
  Field,
  FieldActionRow,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldRow,
  FieldSeparator,
  FieldSet,
  FieldTitle,
}

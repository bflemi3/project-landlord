import * as React from 'react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// FormRoot — vertical stack that spaces fields and fieldsets evenly
// ---------------------------------------------------------------------------

function FormRoot({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="form-root"
      className={cn('flex flex-col gap-8', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormFieldset — <fieldset> that groups related fields
// ---------------------------------------------------------------------------

interface FormFieldsetProps extends React.ComponentProps<'fieldset'> {
  columns?: 2 | 3
  legend?: string
}

function FormFieldset({
  columns,
  legend,
  className,
  children,
  ...props
}: FormFieldsetProps) {
  return (
    <fieldset
      data-slot="form-fieldset"
      className={cn(
        'grid gap-8',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-3',
        className,
      )}
      {...props}
    >
      {legend && (
        <legend className="col-span-full sr-only">{legend}</legend>
      )}
      {children}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// FormField — layout wrapper for a single field (label + control + hint/error)
// ---------------------------------------------------------------------------

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

function FormField({
  children,
  className,
}: FormFieldProps) {
  return (
    <div data-slot="form-field" className={cn('flex flex-col gap-2', className)}>
      {children}
    </div>
  )
}

export { FormRoot, FormFieldset, FormField }
export type { FormFieldsetProps, FormFieldProps }

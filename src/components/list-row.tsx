import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type ListRowVariant = 'solid' | 'dashed'

const variantClasses: Record<ListRowVariant, string> = {
  solid: 'border-border',
  dashed: 'border-dashed border-border',
}

type ListRowProps = {
  leading?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  trailing?: React.ReactNode
  variant?: ListRowVariant
  interactive?: boolean
  className?: string
}

function ListRowContent({
  leading,
  title,
  description,
  trailing,
  interactive = true,
}: Omit<ListRowProps, 'variant' | 'className'>) {
  return (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {trailing !== undefined
        ? trailing
        : interactive && <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />}
    </>
  )
}

function listRowClassName({
  variant = 'solid',
  interactive = true,
  className,
}: {
  variant?: ListRowVariant
  interactive?: boolean
  className?: string
} = {}) {
  return cn(
    'flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left',
    'dark:bg-muted/50',
    variantClasses[variant],
    interactive && 'transition-colors hover:border-primary/20',
    className,
  )
}

function ListRow({
  leading,
  title,
  description,
  trailing,
  variant = 'solid',
  interactive = true,
  className,
  ...props
}: ListRowProps & Omit<React.ComponentProps<'div'>, 'title'>) {
  return (
    <div
      data-slot="list-row"
      data-variant={variant}
      className={listRowClassName({ variant, interactive, className })}
      {...props}
    >
      <ListRowContent
        leading={leading}
        title={title}
        description={description}
        trailing={trailing}
        interactive={interactive}
      />
    </div>
  )
}

function ListRowButton({
  leading,
  title,
  description,
  trailing,
  variant = 'solid',
  className,
  ...props
}: ListRowProps & Omit<React.ComponentProps<'button'>, 'title'>) {
  return (
    <button
      data-slot="list-row"
      data-variant={variant}
      className={listRowClassName({ variant, interactive: true, className })}
      {...props}
    >
      <ListRowContent
        leading={leading}
        title={title}
        description={description}
        trailing={trailing}
        interactive
      />
    </button>
  )
}

export { ListRow, ListRowButton, ListRowContent, listRowClassName }

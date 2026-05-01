import { cn } from '@/lib/utils'

export function FieldHint({ className, children, field }: { className?: string; children: React.ReactNode; field: string }) {
  return (
    <p id={`${field}-hint`} data-slot="field-hint" className={cn('text-muted-foreground text-sm', className)}>
      {children}
    </p>
  )
}

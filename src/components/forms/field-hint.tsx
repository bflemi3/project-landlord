import { cn } from '@/lib/utils'

export function FieldHint({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p data-slot="field-hint" className={cn('text-muted-foreground text-sm', className)}>
      {children}
    </p>
  )
}

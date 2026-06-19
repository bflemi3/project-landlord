'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { type ExpenseType } from '@/data/charges/shared'

// The one way an expense is named in the UI: localized type word prominent,
// provider muted ("Energia · ENEL"). Derives from structured data — never a
// stored display string. Provider absent (not yet identified) → type word only.
export function ExpenseName({
  type,
  provider,
  className,
}: {
  type: ExpenseType
  provider: string | null
  className?: string
}) {
  const t = useTranslations('expenseTypes')
  return (
    <span data-slot="expense-name" className={cn('truncate', className)}>
      <span className="text-foreground">{t(type)}</span>
      {provider ? <span className="text-muted-foreground"> · {provider}</span> : null}
    </span>
  )
}

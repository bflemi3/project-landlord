'use client'

import { useTranslations } from 'next-intl'
import { useStatement } from '@/lib/hooks/use-statement'
import { useMissingCharges } from '@/lib/hooks/use-missing-charges'

export function CompletenessWarning({
  statementId,
  onReview,
}: {
  statementId: string
  onReview?: () => void
}) {
  const t = useTranslations('propertyDetail')
  const { data: statement } = useStatement(statementId)
  const { data: missingCharges } = useMissingCharges(
    statement.unitId, statementId, statement.periodYear, statement.periodMonth,
  )

  if (missingCharges.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t('missingCharges', { count: missingCharges.length })}
          </p>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/60">
            Missing charges won&apos;t block publishing. You can revise the statement later.
          </p>
        </div>
        {onReview && (
          <button
            onClick={onReview}
            className="shrink-0 text-xs font-medium text-amber-700 underline decoration-amber-500/30 underline-offset-2 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Review
          </button>
        )}
      </div>
    </div>
  )
}

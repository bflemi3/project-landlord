import { getTranslations } from 'next-intl/server'
import { getStatement, getMissingCharges } from '@/data/statements/server'
import { ReviewButton } from './completeness-review-button'

export async function CompletenessWarning({ statementId }: { statementId: string }) {
  const t = await getTranslations('propertyDetail')
  const statement = await getStatement(statementId)
  const missingCharges = await getMissingCharges(
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
            {t('completenessHint')}
          </p>
        </div>
        <ReviewButton label={t('review')} />
      </div>
    </div>
  )
}

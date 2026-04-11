import { getTranslations, getLocale } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { getStatement } from '@/data/statements/server'
import { getProperty } from '@/data/properties/server'
import { formatPeriod } from '@/lib/statement-urgency'
import { formatAddress } from '@/lib/address/format-address'
import { CloseButton } from './close-button'

/**
 * Statement header — fetches statement + property + translations.
 * Renders close button, title with draft badge, and property address subtitle.
 * Wrapped in Suspense by the parent page — streams independently.
 */
export async function StatementHeader({
  statementId,
  propertyId,
}: {
  statementId: string
  propertyId: string
}) {
  const [statement, property, t, locale] = await Promise.all([
    getStatement(statementId),
    getProperty(propertyId),
    getTranslations('propertyDetail'),
    getLocale(),
  ])

  const periodLabel = formatPeriod(statement.periodYear, statement.periodMonth, locale)
  const subtitle = formatAddress(property)

  return (
    <>
      {/* Close button */}
      <div className="mb-4 flex justify-end">
        <CloseButton propertyId={propertyId} />
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t('statementDraft', { period: periodLabel })}
          </h1>
          <Badge variant="outline" className="border-dashed border-primary/30 text-xs text-primary">
            {t('draft')}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </>
  )
}

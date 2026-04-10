import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { FadeIn } from '@/components/fade-in'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { getStatement } from '@/data/statements/server'
import { getProperty } from '@/data/properties/server'
import { getUnit } from '@/data/units/server'
import { formatPeriod } from '@/lib/statement-urgency'
import { formatAddress } from '@/lib/address/format-address'
import { CloseButton } from './close-button'
import { StatementSheetController } from './statement-sheet-controller'
import { SummaryCard } from './sections/summary-card'
import { CompletenessWarning } from './sections/completeness-warning'
import { ChargesList } from './sections/charges-list'
import { SummaryCardSkeleton, CompletenessWarningSkeleton, ChargesListSkeleton } from './skeletons'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}): Promise<Metadata> {
  const { statementId } = await params
  try {
    const statement = await getStatement(statementId)
    const unit = await getUnit(statement.unitId)
    const period = `${MONTH_SHORT[statement.periodMonth - 1]} ${statement.periodYear}`
    return { title: `${period} Statement — ${unit.name}` }
  } catch {
    return { title: 'Statement' }
  }
}

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}) {
  const { id: propertyId, statementId } = await params
  const t = await getTranslations('propertyDetail')
  const locale = await getLocale()

  // Fetch core data needed for the page shell (title, subtitle, controller props)
  const statement = await getStatement(statementId)
  const [property, unit] = await Promise.all([
    getProperty(propertyId),
    getUnit(statement.unitId),
  ])

  const periodLabel = formatPeriod(statement.periodYear, statement.periodMonth, locale)
  const createdLabel = new Date(statement.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  const subtitle = formatAddress(property)

  return (
    <StatementSheetController
      statementId={statementId}
      unitId={statement.unitId}
      periodYear={statement.periodYear}
      periodMonth={statement.periodMonth}
      currency={statement.currency}
    >
      <DetailPageLayout>
        <DetailPageLayoutHeader>
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

          {/* Mobile-only: summary card in header */}
          <div className="mb-6 md:hidden">
            <Suspense fallback={<SummaryCardSkeleton />}>
              <FadeIn>
                <SummaryCard statementId={statementId} />
              </FadeIn>
            </Suspense>
          </div>
        </DetailPageLayoutHeader>

        <DetailPageLayoutBody>
          <DetailPageLayoutMain>
            <Suspense fallback={<CompletenessWarningSkeleton />}>
              <FadeIn>
                <CompletenessWarning statementId={statementId} />
              </FadeIn>
            </Suspense>

            <Suspense fallback={<ChargesListSkeleton />}>
              <FadeIn>
                <ChargesList statementId={statementId} />
              </FadeIn>
            </Suspense>
          </DetailPageLayoutMain>

          <DetailPageLayoutSidebar>
            {/* Desktop-only summary card */}
            <div className="hidden md:block">
              <Suspense fallback={<SummaryCardSkeleton />}>
                <FadeIn>
                  <SummaryCard statementId={statementId} />
                </FadeIn>
              </Suspense>
            </div>

            {/* Review & Publish + audit note */}
            <div className="hidden md:block">
              <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
                {t('reviewAndPublish')}
              </Button>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <Clock className="size-3" />
                <span>{t('draftCreated', { date: createdLabel })}</span>
              </div>
            </div>
          </DetailPageLayoutSidebar>
        </DetailPageLayoutBody>

        {/* Mobile bottom bar */}
        <StickyBottomBar className="md:hidden">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Clock className="size-3" />
            <span>Draft created {createdLabel}</span>
          </div>
          <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
            Review & Publish
          </Button>
        </StickyBottomBar>
      </DetailPageLayout>
    </StatementSheetController>
  )
}

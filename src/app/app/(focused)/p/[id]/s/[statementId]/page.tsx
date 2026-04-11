import type { Metadata } from 'next'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { getStatement } from '@/data/statements/server'
import { getUnit } from '@/data/units/server'
import { TrackStatementViewed } from './track-statement-viewed'
import { StatementHeader } from './statement-header'
import { SummaryCard } from './sections/summary-card'
import { CompletenessWarning } from './sections/completeness-warning'
import { ChargesList } from './sections/charges-list'
import { ReviewPublishSection } from './review-publish-section'
import {
  StatementHeaderSkeleton,
  SummaryCardSkeleton,
  CompletenessWarningSkeleton,
  ChargesListSkeleton,
} from './skeletons'

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

/**
 * Statement draft page — fully synchronous, zero blocking awaits.
 *
 * All sections stream independently via SuspenseFadeIn. Sheet state lives
 * in ChargesListInteractive (no page-level controller needed).
 * PostHog tracking fires via a tiny client component.
 */
export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}) {
  const { id: propertyId, statementId } = await params

  return (
    <>
      <TrackStatementViewed statementId={statementId} />

      <DetailPageLayout>
        <DetailPageLayoutHeader>
          <SuspenseFadeIn fallback={<StatementHeaderSkeleton />}>
            <StatementHeader statementId={statementId} propertyId={propertyId} />
          </SuspenseFadeIn>

          {/* Mobile-only: summary card in header */}
          <div className="mb-6 md:hidden">
            <SuspenseFadeIn fallback={<SummaryCardSkeleton />}>
              <SummaryCard statementId={statementId} />
            </SuspenseFadeIn>
          </div>
        </DetailPageLayoutHeader>

        <DetailPageLayoutBody>
          <DetailPageLayoutMain>
            <SuspenseFadeIn fallback={<CompletenessWarningSkeleton />}>
              <CompletenessWarning statementId={statementId} />
            </SuspenseFadeIn>

            <SuspenseFadeIn fallback={<ChargesListSkeleton />}>
              <ChargesList statementId={statementId} />
            </SuspenseFadeIn>
          </DetailPageLayoutMain>

          <DetailPageLayoutSidebar>
            {/* Desktop-only summary card */}
            <div className="hidden md:block">
              <SuspenseFadeIn fallback={<SummaryCardSkeleton />}>
                <SummaryCard statementId={statementId} />
              </SuspenseFadeIn>
            </div>

            <SuspenseFadeIn>
              <ReviewPublishSection statementId={statementId} />
            </SuspenseFadeIn>
          </DetailPageLayoutSidebar>
        </DetailPageLayoutBody>
      </DetailPageLayout>
    </>
  )
}

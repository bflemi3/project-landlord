import { getTranslations, getLocale } from 'next-intl/server'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { getStatement } from '@/data/statements/server'

/**
 * Review & Publish button + audit note.
 * Fetches statement for the created date.
 * Renders both desktop (sidebar) and mobile (sticky bottom bar) versions.
 */
export async function ReviewPublishSection({ statementId }: { statementId: string }) {
  const [statement, t, locale] = await Promise.all([
    getStatement(statementId),
    getTranslations('propertyDetail'),
    getLocale(),
  ])

  const createdLabel = new Date(statement.createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      {/* Desktop — sidebar */}
      <div className="hidden md:block">
        <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
          {t('reviewAndPublish')}
        </Button>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Clock className="size-3" />
          <span>{t('draftCreated', { date: createdLabel })}</span>
        </div>
      </div>

      {/* Mobile — sticky bottom bar */}
      <StickyBottomBar className="md:hidden">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Clock className="size-3" />
          <span>{t('draftCreated', { date: createdLabel })}</span>
        </div>
        <Button className="h-12 w-full rounded-2xl" size="lg" disabled>
          {t('reviewAndPublish')}
        </Button>
      </StickyBottomBar>
    </>
  )
}

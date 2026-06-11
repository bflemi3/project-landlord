'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, DoorOpen, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { cardShellClassName } from '@/components/ui/card'

interface EmptyStateProps {
  firstName?: string
  greeting: string
  draftId: string
}

export function EmptyState({ firstName, greeting, draftId }: EmptyStateProps) {
  const t = useTranslations('home')
  const router = useRouter()
  const [showComingSoon, setShowComingSoon] = useState(false)
  const newPropertyHref = `/app/p/new/${draftId}`
  const warmPrefetch = useCallback(
    () => router.prefetch(newPropertyHref),
    [router, newPropertyHref],
  )

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="font-display text-foreground text-2xl font-medium tracking-[-0.015em] md:text-3xl">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">{t('roleChoiceSubtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={newPropertyHref}
          prefetch
          onMouseEnter={warmPrefetch}
          onFocus={warmPrefetch}
          onTouchStart={warmPrefetch}
          className={cardShellClassName({
            interactive: true,
            size: 'none',
            className:
              'group dark:hover:border-primary/40 flex h-full flex-col items-center px-6 py-7 text-center md:p-8',
          })}
        >
          <div className="bg-primary/10 text-primary group-hover:bg-primary/15 mb-4 flex size-14 items-center justify-center rounded-2xl transition-colors md:mb-5 md:size-16">
            <Building2 className="size-6 md:size-7" />
          </div>
          <h3 className="text-foreground text-lg font-semibold">{t('iOwnProperty')}</h3>
          <p className="text-muted-foreground mt-1.5 text-sm/relaxed">
            {t('iOwnPropertyDescription')}
          </p>
          <div className="text-primary mt-4 flex items-center gap-1 text-sm font-medium md:mt-5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
            {t('addProperty')} <ChevronRight className="size-4" />
          </div>
        </Link>

        <button
          onClick={() => setShowComingSoon(true)}
          className={cardShellClassName({
            size: 'none',
            className:
              'group flex h-full w-full flex-col items-center px-6 py-7 text-center opacity-60 transition-all hover:opacity-80 md:p-8',
          })}
        >
          <div className="bg-secondary text-muted-foreground mb-4 flex size-14 items-center justify-center rounded-2xl md:mb-5 md:size-16">
            <DoorOpen className="size-6 md:size-7" />
          </div>
          <h3 className="text-foreground text-lg font-semibold">{t('iRentProperty')}</h3>
          <div className="text-muted-foreground mt-1.5 min-h-14 text-sm/relaxed">
            {showComingSoon ? (
              <p className="animate-fade-in">{t('comingSoonDescription')}</p>
            ) : (
              <p>{t('iRentPropertyDescription')}</p>
            )}
          </div>
          <span className="bg-secondary text-muted-foreground mt-4 rounded-full px-3 py-1 text-xs font-medium md:mt-5">
            {t('comingSoon')}
          </span>
        </button>
      </div>

      <div className="bg-secondary/40 mt-5 flex items-start justify-center gap-2.5 rounded-xl px-5 py-3 text-center dark:bg-transparent dark:px-0">
        <span className="flex h-5 shrink-0 items-center">
          <ArrowLeftRight className="text-muted-foreground/50 size-3.5" />
        </span>
        <p className="text-muted-foreground/70 dark:text-muted-foreground text-sm/relaxed">
          {t('roleNote')}
        </p>
      </div>
    </div>
  )
}

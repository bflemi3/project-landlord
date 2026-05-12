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
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-base text-muted-foreground md:text-lg">
          {t('roleChoiceSubtitle')}
        </p>
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
              'group flex h-full flex-col items-center px-6 py-7 text-center dark:hover:border-primary/40 md:p-8',
          })}
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 md:mb-5 md:size-16">
            <Building2 className="size-6 md:size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('iOwnProperty')}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('iOwnPropertyDescription')}</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary md:mt-5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
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
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground md:mb-5 md:size-16">
            <DoorOpen className="size-6 md:size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('iRentProperty')}</h3>
          <div className="mt-1.5 min-h-[3.5rem] text-sm leading-relaxed text-muted-foreground">
            {showComingSoon ? (
              <p className="animate-fade-in">{t('comingSoonDescription')}</p>
            ) : (
              <p>{t('iRentPropertyDescription')}</p>
            )}
          </div>
          <span className="mt-4 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground md:mt-5">
            {t('comingSoon')}
          </span>
        </button>
      </div>

      <div className="mt-5 flex items-start justify-center gap-2.5 rounded-xl bg-secondary/40 px-5 py-3 text-center dark:bg-transparent dark:px-0">
        <span className="flex h-5 shrink-0 items-center">
          <ArrowLeftRight className="size-3.5 text-muted-foreground/50" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground/70 dark:text-muted-foreground">
          {t('roleNote')}
        </p>
      </div>
    </div>
  )
}

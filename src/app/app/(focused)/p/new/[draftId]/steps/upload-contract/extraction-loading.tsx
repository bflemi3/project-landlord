'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useReducedMotion } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionLabel } from '@/components/section-label'
import { TextShimmer } from '@/components/text-shimmer'
import { cn } from '@/lib/utils'

const LINE_KEYS = ['line1', 'line2', 'line3', 'line4', 'line5', 'line6', 'line7'] as const
const ROTATION_MS = 3500

function SkeletonSection({
  title,
  rows,
  animate,
}: {
  title: string
  rows: number
  animate: boolean
}) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton
              className={cn(
                'size-10 shrink-0 rounded-2xl',
                !animate && 'animate-none',
              )}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton
                className={cn('h-3 w-24 rounded-full', !animate && 'animate-none')}
              />
              <Skeleton
                className={cn(
                  'h-4 rounded-full',
                  i % 2 === 0 ? 'w-3/4' : 'w-1/2',
                  !animate && 'animate-none',
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ExtractionLoading() {
  const t = useTranslations('propertyCreation.loading')
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (!animate) return
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % LINE_KEYS.length)
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [animate])

  return (
    <div className="pt-4" data-slot="extraction-loading">
      <div className="space-y-8">
        <SkeletonSection title={t('sections.property')} rows={3} animate={animate} />
        <SkeletonSection title={t('sections.rent')} rows={3} animate={animate} />
        <SkeletonSection title={t('sections.parties')} rows={2} animate={animate} />
        <SkeletonSection title={t('sections.expenses')} rows={2} animate={animate} />
      </div>

      <div
        className="mt-10 text-center text-base"
        aria-live={animate ? 'off' : 'polite'}
        data-slot="extraction-loading-copy"
      >
        {animate ? (
          <TextShimmer as="p" duration="2.5s">
            {t(LINE_KEYS[lineIndex])}
          </TextShimmer>
        ) : (
          <p className="text-muted-foreground">{t('static')}</p>
        )}
      </div>
    </div>
  )
}

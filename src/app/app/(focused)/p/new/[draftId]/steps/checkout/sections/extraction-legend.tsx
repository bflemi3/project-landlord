'use client'

import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { usePropertyCreationState } from '../../../state/use-property-creation'

export function ExtractionLegend({ className }: { className?: string }) {
  const path = usePropertyCreationState((s) => s.path)
  const t = useTranslations('propertyCreation.checkout')

  if (path !== 'contract') return null

  return (
    <p className={cn('text-muted-foreground flex items-center gap-1.5 text-sm', className)}>
      <Sparkles className="text-primary size-3" />
      {t('extractionLegend')}
    </p>
  )
}

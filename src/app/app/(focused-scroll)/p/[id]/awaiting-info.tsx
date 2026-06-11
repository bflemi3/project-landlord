'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { ResponsivePopover } from '@/components/responsive-popover'

// The ? beside the Awaiting stat — hover/click popover on desktop, bottom
// sheet on mobile (ResponsivePopover handles the split).
export function AwaitingInfo() {
  const t = useTranslations('property.bills')
  const tSummary = useTranslations('property.summary')
  const [open, setOpen] = useState(false)

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopover.Trigger
        render={
          <button
            type="button"
            aria-label={t('awaitingInfoLabel')}
            className="border-muted-foreground/50 text-muted-foreground hover:border-foreground hover:text-foreground inline-flex size-4 items-center justify-center rounded-full border text-xs leading-none transition-colors"
          >
            ?
          </button>
        }
      />
      <ResponsivePopover.Content
        title={tSummary('awaiting')}
        className="text-muted-foreground w-64 p-3 text-sm"
      >
        <p className="text-muted-foreground px-3 pb-3 text-sm md:p-0">{t('awaitingTooltip')}</p>
      </ResponsivePopover.Content>
    </ResponsivePopover>
  )
}

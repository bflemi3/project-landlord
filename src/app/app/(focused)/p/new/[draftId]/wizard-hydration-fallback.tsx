'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button-variants'
import { WizardShell } from '@/components/wizard-shell'
import { cn } from '@/lib/utils'

const EXIT_HREF = '/app'

/**
 * Suspense fallback rendered by page.tsx while the Zustand wizard store
 * hydrates from IndexedDB. Mirrors Step 1's shell — top bar (Close only; Back
 * is hidden on step 1 like the real chrome) plus the Step-1 content skeleton
 * (title + dashed dropzone + "no contract" link). Step 1 is the dominant
 * first-load case and a fresh wizard always starts here. When hydration
 * resumes a Step-2 draft, the skeleton-to-content swap is a brief mismatch —
 * preferable to showing Step-2 chrome on a fresh wizard.
 *
 * Close links directly to `/app` without the exit prompt — the store hasn't
 * hydrated, so there's no reliable way to know whether there's work to lose.
 */
export function WizardHydrationFallback() {
  const t = useTranslations('propertyCreation')

  return (
    <WizardShell wizardId="hydrating" currentStep={1} totalSteps={2}>
      <WizardShell.TopBar className="max-w-5xl">
        <div className="w-20" />
        <WizardShell.StepCount label={t('title')} />
        <div className="flex w-20 justify-end">
          <Link
            href={EXIT_HREF}
            aria-label={t('exit')}
            className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }))}
            data-slot="wizard-shell-close"
          >
            <X />
          </Link>
        </div>
      </WizardShell.TopBar>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-8">
          <div data-slot="wizard-hydration-fallback" className="flex flex-col gap-8 pt-8">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-3/4 max-w-md rounded-full" />
              <Skeleton className="h-5 w-full max-w-lg rounded-full" />
              <Skeleton className="h-5 w-2/3 max-w-md rounded-full" />
            </div>

            <Card variant="dashed" size="none" className="px-6 py-16">
              <div className="flex flex-col items-center justify-center gap-4">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-5 w-56 rounded-full" />
                <Skeleton className="h-4 w-48 rounded-full" />
              </div>
            </Card>

            <Skeleton className="h-4 w-40 self-start rounded-full" />
          </div>
        </div>
      </div>
    </WizardShell>
  )
}

'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { WizardShell } from '@/components/wizard-shell'
import { captureEvent } from '@/lib/analytics/capture'
import { propertyCreationWizardKey } from './state/persistence'
import { PropertyCreationTopBar } from './top-bar'
import { PropertyCheckoutShell } from './steps/checkout/checkout-shell'
import { UploadContract } from './steps/upload-contract/upload-contract'
import {
  usePropertyCreationActions,
  usePropertyCreationHasHydrated,
  usePropertyCreationState,
  usePropertyCreationStoreApi,
} from './state/use-property-creation'
import { hasWizardWork } from './state/derivations'
import { WizardHydrationFallback } from './wizard-hydration-fallback'

const TOTAL_STEPS = 2
const EXIT_HREF = '/app'

/**
 * Thin parent shell. All wizard data lives in the Zustand store, which is
 * hydrated by the persist middleware on store creation. While the persist
 * middleware loads from IndexedDB, `usePropertyCreationHasHydrated` returns
 * `false` and we render the Step-1 hydration fallback inline. Once hydration
 * finishes, the component re-renders and selects the rendered subtree by
 * `step`.
 *
 * This component:
 *   1. Gates render on hydration via `usePropertyCreationHasHydrated()`
 *   2. Reads `step` to choose the rendered subtree
 *   3. Owns local React state for the exit prompt (route-level UI concern;
 *      not persisted)
 *   4. Wires the WizardShell's onBack / onExit context callbacks
 */
export function PropertyCreationWizard({ draftId }: { draftId: string }) {
  const router = useRouter()
  const t = useTranslations('propertyCreation')
  const wizardKey = useMemo(() => propertyCreationWizardKey(draftId), [draftId])

  const hasHydrated = usePropertyCreationHasHydrated()

  const [exitPromptOpen, setExitPromptOpen] = useState(false)

  const step = usePropertyCreationState((s) => s.step)
  const storeApi = usePropertyCreationStoreApi()
  const { goToStep, clearPersisted } = usePropertyCreationActions()

  useEffect(() => {
    router.prefetch(EXIT_HREF)
    // Next.js RSC prefetches for dynamic routes have a short TTL (~30s), so a
    // long wizard session will stale the cached home RSC and force
    // (main)/loading.tsx to flash during `router.push`. Refresh on an
    // interval to keep the cache warm.
    const id = setInterval(() => router.prefetch(EXIT_HREF), 20_000)
    return () => clearInterval(id)
  }, [router])

  const handleBack = useCallback(() => {
    // Step-level back. Section-level back inside Step 2 is owned by the
    // checkout shell itself and routes through the store's
    // goToPreviousSection action.
    if (step === 2) {
      goToStep(1)
    }
  }, [step, goToStep])

  const handleExit = useCallback(() => {
    // Prompt whenever there's something to lose. A bare step-1 wizard or a
    // fresh no-contract step-2 wizard with no section data exits silently —
    // wipe IDB + reset store, then navigate. Wrapping the push in
    // startTransition lets React keep the wizard on screen until the home
    // RSC is ready (avoiding a PageLoader flash from (main)/loading.tsx on
    // a stale prefetch). Reading via `storeApi.getState()` keeps this off
    // the render path — it runs once per click, not per keystroke.
    if (!hasWizardWork(storeApi.getState())) {
      clearPersisted()
      startTransition(() => {
        router.push(EXIT_HREF)
      })
      return
    }
    setExitPromptOpen(true)
  }, [storeApi, router, clearPersisted])

  const handleSaveForLater = useCallback(() => {
    captureEvent('property_creation_wizard_exited', {
      step,
      reason: 'save_for_later',
    })
  }, [step])

  const handleDiscard = useCallback(() => {
    captureEvent('property_creation_wizard_exited', {
      step,
      reason: 'discard',
    })
    clearPersisted()
  }, [step, clearPersisted])

  if (!hasHydrated) {
    return <WizardHydrationFallback />
  }

  return (
    <>
      <WizardShell
        wizardId={wizardKey}
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onExit={handleExit}
      >
        <PropertyCreationTopBar
          backLabel={t('back')}
          exitLabel={t('exit')}
        />
        {step === 1 ? (
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
            <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-8">
              <UploadContract />
            </div>
          </div>
        ) : (
          <PropertyCheckoutShell />
        )}
      </WizardShell>

      <WizardShell.ExitPrompt
        open={exitPromptOpen}
        onOpenChange={setExitPromptOpen}
        title={t('exitPrompt.title')}
        description={t('exitPrompt.description')}
        saveForLaterLabel={t('exitPrompt.saveForLater')}
        discardLabel={t('exitPrompt.discard')}
        exitHref={EXIT_HREF}
        onSaveForLater={handleSaveForLater}
        onDiscard={handleDiscard}
      />
    </>
  )
}

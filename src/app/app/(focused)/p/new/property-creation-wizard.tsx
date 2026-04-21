'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { WizardShell } from '@/components/wizard-shell'

const WIZARD_ID = 'property-creation'
const TOTAL_STEPS = 2
const EXIT_HREF = '/app'

export function PropertyCreationWizard() {
  const router = useRouter()
  const t = useTranslations('propertyCreation')

  const [step, setStep] = useState(1)
  const [exitPromptOpen, setExitPromptOpen] = useState(false)

  useEffect(() => {
    router.prefetch(EXIT_HREF)
  }, [router])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1))
  }, [])

  const handleExit = useCallback(() => {
    setExitPromptOpen(true)
  }, [])

  const handleDiscard = useCallback(() => {
    // TODO(Task 3): clear IndexedDB wizard state via clearWizardState(WIZARD_ID)
  }, [])

  return (
    <>
      <WizardShell
        wizardId={WIZARD_ID}
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onExit={handleExit}
      >
        <WizardShell.TopBar>
          <WizardShell.Back label={t('back')} />
          <WizardShell.StepCount
            label={t('step', { current: step, total: TOTAL_STEPS })}
          />
          <WizardShell.Close ariaLabel={t('exit')} />
        </WizardShell.TopBar>
        <WizardShell.Progress className="mb-2" />
        <WizardShell.Steps>
          <WizardShell.Step step={1}>
            <div className="pt-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {t('step1.title')}
              </h1>
              <p className="mb-6 text-base text-muted-foreground">
                {t('step1.description')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('step1.placeholder')}
              </p>
            </div>
          </WizardShell.Step>
          <WizardShell.Step step={2}>
            <div className="pt-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {t('step2.title')}
              </h1>
              <p className="text-base text-muted-foreground">
                {t('step2.placeholder')}
              </p>
            </div>
          </WizardShell.Step>
        </WizardShell.Steps>
      </WizardShell>

      <WizardShell.ExitPrompt
        open={exitPromptOpen}
        onOpenChange={setExitPromptOpen}
        title={t('exitPrompt.title')}
        description={t('exitPrompt.description')}
        saveForLaterLabel={t('exitPrompt.saveForLater')}
        discardLabel={t('exitPrompt.discard')}
        exitHref={EXIT_HREF}
        onDiscard={handleDiscard}
      />
    </>
  )
}

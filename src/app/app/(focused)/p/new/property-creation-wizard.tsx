'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import posthog from 'posthog-js'
import { toast } from 'sonner'
import { WizardShell } from '@/components/wizard-shell'
import {
  PROPERTY_CREATION_STATE_VERSION,
  clearWizardState,
  loadWizardState,
  propertyCreationWizardKey,
  saveWizardState,
  type PropertyCreationData,
} from '@/lib/wizard-state'
import { UploadContract } from './steps/upload-contract'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

const TOTAL_STEPS = 2
const EXIT_HREF = '/app'

const EMPTY_DATA: PropertyCreationData = {
  contractFile: null,
  contractFileName: null,
  contractFileType: null,
  extractionResult: null,
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type })
}

export function PropertyCreationWizard({ draftId }: { draftId: string }) {
  const router = useRouter()
  const t = useTranslations('propertyCreation')
  const wizardKey = useMemo(() => propertyCreationWizardKey(draftId), [draftId])

  const [step, setStep] = useState(1)
  const [exitPromptOpen, setExitPromptOpen] = useState(false)
  const [wizardData, setWizardData] = useState<PropertyCreationData>(EMPTY_DATA)
  const [hydrated, setHydrated] = useState(false)
  const [autoExtractOnMount, setAutoExtractOnMount] = useState(false)

  const resumeFiredRef = useRef(false)

  useEffect(() => {
    router.prefetch(EXIT_HREF)
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function resume() {
      const stored = await loadWizardState<PropertyCreationData>(wizardKey, {
        expectedVersion: PROPERTY_CREATION_STATE_VERSION,
      })
      if (cancelled) return
      if (!stored) {
        setHydrated(true)
        return
      }

      const { data, currentStep } = stored
      setWizardData(data)

      if (data.contractFile && !data.extractionResult) {
        setStep(1)
        setAutoExtractOnMount(true)
      } else {
        setStep(currentStep)
      }

      if (!resumeFiredRef.current) {
        resumeFiredRef.current = true
        posthog.capture('property_creation_wizard_resumed', {
          step: currentStep,
        })
      }
      setHydrated(true)
    }
    resume()
    return () => {
      cancelled = true
    }
  }, [wizardKey])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1))
  }, [])

  const handleExit = useCallback(() => {
    if (!wizardData.contractFile) {
      router.push(EXIT_HREF)
      return
    }
    setExitPromptOpen(true)
  }, [wizardData.contractFile, router])

  const handleSaveForLater = useCallback(() => {
    posthog.capture('property_creation_wizard_abandoned', { step })
  }, [step])

  const handleDiscard = useCallback(() => {
    void clearWizardState(wizardKey)
  }, [wizardKey])

  const handleFileSelected = useCallback(
    async (file: File, fileType: 'pdf' | 'docx') => {
      const next: PropertyCreationData = {
        contractFile: file,
        contractFileName: file.name,
        contractFileType: fileType,
        extractionResult: null,
      }
      setWizardData(next)
      try {
        await saveWizardState<PropertyCreationData>(wizardKey, {
          version: PROPERTY_CREATION_STATE_VERSION,
          currentStep: 1,
          updatedAt: new Date().toISOString(),
          data: next,
        })
      } catch (e) {
        console.error('[PropertyCreationWizard] saveWizardState failed', e)
        toast.message(t('resumeUnavailable'))
      }
    },
    [wizardKey, t],
  )

  const handleExtracted = useCallback(
    async (payload: {
      file: File
      fileName: string
      fileType: 'pdf' | 'docx'
      extractionResult: ContractExtractionResult
    }) => {
      const next: PropertyCreationData = {
        contractFile: payload.file,
        contractFileName: payload.fileName,
        contractFileType: payload.fileType,
        extractionResult: payload.extractionResult,
      }
      setWizardData(next)
      setStep(2)
      setAutoExtractOnMount(false)

      try {
        await saveWizardState<PropertyCreationData>(wizardKey, {
          version: PROPERTY_CREATION_STATE_VERSION,
          currentStep: 2,
          updatedAt: new Date().toISOString(),
          data: next,
        })
      } catch (e) {
        console.error('[PropertyCreationWizard] saveWizardState failed', e)
        toast.message(t('resumeUnavailable'))
      }
    },
    [wizardKey, t],
  )

  const handleFileCleared = useCallback(async () => {
    setWizardData(EMPTY_DATA)
    setAutoExtractOnMount(false)
    await clearWizardState(wizardKey)
  }, [wizardKey])

  const initialFile = useMemo(() => {
    if (wizardData.contractFile instanceof Blob && wizardData.contractFileName) {
      return blobToFile(wizardData.contractFile, wizardData.contractFileName)
    }
    return null
  }, [wizardData.contractFile, wizardData.contractFileName])

  return (
    <>
      <WizardShell
        wizardId={wizardKey}
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
            {hydrated && (
              <UploadContract
                key={initialFile ? `${initialFile.name}-${initialFile.size}` : 'empty'}
                initialFile={initialFile}
                initialFileType={wizardData.contractFileType}
                autoExtract={autoExtractOnMount}
                onFileSelected={handleFileSelected}
                onExtracted={handleExtracted}
                onFileCleared={handleFileCleared}
              />
            )}
          </WizardShell.Step>
          <WizardShell.Step step={2}>
            <div className="pt-8">
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {t('step2.title')}
              </h1>
              <p className="text-base text-muted-foreground">
                {wizardData.extractionResult
                  ? `Language: ${wizardData.extractionResult.languageDetected} · ${
                      wizardData.contractFileName ?? ''
                    }`
                  : t('step2.placeholder')}
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
        onSaveForLater={handleSaveForLater}
        onDiscard={handleDiscard}
      />
    </>
  )
}

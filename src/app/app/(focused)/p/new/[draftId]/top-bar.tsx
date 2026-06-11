'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { WizardShell } from '@/components/wizard-shell'
import { StepProgress, type StepProgressSegmentState } from '@/components/step-progress'
import { useShallow } from 'zustand/react/shallow'
import { CHECKOUT_SECTIONS } from './state/registry'
import { deriveAllSectionValidities, SectionValidity } from './state/section-validity'
import { usePropertyCreationState } from './state/use-property-creation'

interface PropertyCreationTopBarProps {
  /**
   * Fired when the user taps the Close button. The exit prompt's open state
   * lives in the parent wizard's local React state — it's a route-level UI
   * concern, not wizard data. The parent wires this onto
   * `<WizardShell onExit={...}>` context so `WizardShell.Close` fires it.
   */
  backLabel: string
  exitLabel: string
}

const validitySegmentStatMap: Record<SectionValidity, StepProgressSegmentState> = {
  completed: 'done',
  skipped: 'skipped',
  upcoming: 'upcoming',
  invalid: 'invalid',
}

/**
 * The wizard's TopBar. Encapsulates per-step rendering so the parent wizard
 * never branches on `step` for nav chrome. Reads `step`, `sectionStates`, and
 * `activeSectionId` from the store. The Back button delegates to
 * `WizardShell.Back`'s `onBack` context callback and the Close button
 * delegates to `onExit` on context — both are wired on the parent's
 * `<WizardShell>`.
 *
 * Step 1: a single nav row (no progress bar, centered title).
 * Step 2: nav row + a second row with the six-segment progress bar driven by
 *   per-section state (done / active / upcoming / skipped).
 */
export function PropertyCreationTopBar({ backLabel, exitLabel }: PropertyCreationTopBarProps) {
  const t = useTranslations('propertyCreation')
  const step = usePropertyCreationState((s) => s.step)
  const activeSectionId = usePropertyCreationState((s) => (s.step === 2 ? s.activeSectionId : null))
  // `useShallow` keeps the returned record stable when no per-section
  // validity actually changes, so the `useMemo` below stays cheap.
  const validities = usePropertyCreationState(
    useShallow((s) => (s.step === 2 ? deriveAllSectionValidities(s) : null)),
  )

  const segments = useMemo<StepProgressSegmentState[]>(() => {
    if (!validities) return []
    return CHECKOUT_SECTIONS.map((section) => {
      if (section.id === activeSectionId) return 'active'
      const validity = validities[section.id]
      return validitySegmentStatMap[validity]
    })
  }, [validities, activeSectionId])

  return (
    <>
      <WizardShell.TopBar className="max-w-5xl">
        <WizardShell.Back label={backLabel} />
        <WizardShell.StepCount label={t('title')} />
        <WizardShell.Close ariaLabel={exitLabel} />
      </WizardShell.TopBar>

      {step === 2 && segments.length > 0 && (
        <div className="mx-auto -mt-2 w-full max-w-5xl px-6 md:mt-0">
          <StepProgress segments={segments} />
        </div>
      )}
    </>
  )
}

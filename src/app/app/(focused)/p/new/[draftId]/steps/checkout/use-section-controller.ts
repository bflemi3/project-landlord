'use client'

import { useCallback, useState } from 'react'

import { captureEvent } from '@/lib/analytics/capture'

import type { SectionId } from '../../state/registry'
import {
  useIsSectionActive,
  useIsSectionRequired,
  useIsSectionUpNext,
  usePropertyCreationActions,
  usePropertyCreationState,
  useSectionStatus,
} from '../../state/use-property-creation'
import { useCheckoutContext } from './checkout-context'
import type { SectionStatus } from './section'

interface UseSectionControllerOptions {
  /** Async guard that runs before advancing. Return false to block. */
  onBeforeContinue?: () => Promise<boolean>
}

export interface SectionController {
  status: SectionStatus
  isActive: boolean
  isUpNext: boolean
  isRequired: boolean
  isContinuing: boolean
  handleContinue: () => void
  handleSkip: () => void
  handleBack: () => void
}

/**
 * Centralizes the per-section concerns that every accordion section needs:
 * status / active / up-next / required selectors, header ref registration,
 * and Continue / Skip / Back handlers (with their PostHog events). Each
 * per-section file becomes a thin wrapper over this hook + JSX.
 *
 * Section-specific completion / skip events fire from inside the handlers
 * here. The shell still owns mount-once `property_checkout_entered` and the
 * tap-driven `property_checkout_section_reopened` event.
 */
export function useSectionController(
  id: SectionId,
  { onBeforeContinue }: UseSectionControllerOptions = {},
): SectionController {
  const { requestTransitionScroll } = useCheckoutContext()

  const status = useSectionStatus(id)
  const isActive = useIsSectionActive(id)
  const isUpNext = useIsSectionUpNext(id)
  const isRequired = useIsSectionRequired(id)
  const path = usePropertyCreationState((s) => s.path)
  const { completeCurrentSection, skipCurrentSection, goToPreviousSection } =
    usePropertyCreationActions()

  const [isContinuing, setIsContinuing] = useState(false)

  const handleContinue = useCallback(async () => {
    if (onBeforeContinue) {
      setIsContinuing(true)
      try {
        const allowed = await onBeforeContinue()
        if (!allowed) return
      } finally {
        setIsContinuing(false)
      }
    }

    captureEvent('property_checkout_section_completed', { section_id: id, path })
    requestTransitionScroll()
    completeCurrentSection()
  }, [onBeforeContinue, id, path, requestTransitionScroll, completeCurrentSection])

  function handleSkip() {
    captureEvent('property_checkout_section_skipped', { section_id: id, path })
    requestTransitionScroll()
    skipCurrentSection()
  }

  function handleBack() {
    requestTransitionScroll()
    goToPreviousSection()
  }

  return {
    status,
    isActive,
    isUpNext,
    isRequired,
    isContinuing,
    handleContinue,
    handleSkip,
    handleBack,
  }
}

'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import type { SectionId } from '../../state/registry'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../state/use-property-creation'
import {
  CheckoutContextProvider,
  type CheckoutContextValue,
} from './checkout-context'
import { CheckoutMobileBar } from './checkout-mobile-bar'
import { CheckoutSummary } from './checkout-summary'
import { SectionGroup } from './section'
import { PropertySection } from './sections/property'
import { RentDatesSection } from './sections/rent-dates'
import { TenantsSection } from './sections/tenants'
import { ExpensesSection } from './sections/expenses'
import { CpfSection } from './sections/cpf'
import { BankSection } from './sections/bank'
import { ExtractionLegend } from './sections/extraction-legend'

/**
 * Step 2 root. Pure composition layer: renders one component per section,
 * each of which reads its own slice of the wizard store and writes through
 * `usePropertyCreationActions`.
 *
 * Owns its own scroll container so the mobile bottom bar can sit as a sibling
 * outside the scroll area — flex layout pins it to the viewport bottom
 * permanently. `position: sticky` would lose its anchor when the containing
 * block scrolls past.
 *
 * Owns the scroll registry that sections write into:
 *   - `headerRefs` collects each section's trigger button so the shell can
 *     scroll into view on transition.
 *   - `shouldScrollOnNextActiveChange` is flipped to true by a section's
 *     transition handlers (Continue / Back / Skip) before the store action
 *     runs. The effect on `activeSectionId` consults the flag to decide
 *     whether to scroll — direct header taps leave it false, so taps don't
 *     scroll.
 *
 * Analytics for entry / completion / skip live elsewhere:
 *   - `property_checkout_entered` fires from Step 1's two transition paths
 *     (contract extracted OR "no contract" tap).
 *   - `property_checkout_section_completed` / `_skipped` fire from each
 *     section's `useSectionController` handlers.
 */
export function PropertyCheckoutShell() {
  const activeSectionId = usePropertyCreationState((s) => s.activeSectionId)
  const { openSection } = usePropertyCreationActions()

  const headerRefsRef = useRef(new Map<SectionId, HTMLButtonElement>())
  const refCallbacksRef = useRef(
    new Map<SectionId, (node: HTMLButtonElement | null) => void>(),
  )
  const shouldScrollRef = useRef(false)

  // Stable per-id ref callback. Caching avoids React tearing the ref down +
  // re-attaching on every render of the section component.
  const registerHeaderRef = useCallback(
    (id: SectionId) => {
      let cb = refCallbacksRef.current.get(id)
      if (!cb) {
        cb = (node) => {
          if (node) headerRefsRef.current.set(id, node)
          else headerRefsRef.current.delete(id)
        }
        refCallbacksRef.current.set(id, cb)
      }
      return cb
    },
    [],
  )

  const requestTransitionScroll = useCallback(() => {
    shouldScrollRef.current = true
  }, [])

  const checkoutContext = useMemo<CheckoutContextValue>(
    () => ({ registerHeaderRef, requestTransitionScroll }),
    [registerHeaderRef, requestTransitionScroll],
  )

  // Smooth-scroll the new active section's header into view when a transition
  // (Continue / Back / Skip) initiated the change. Direct taps leave the ref
  // false, so this no-ops for them.
  useEffect(() => {
    if (shouldScrollRef.current && activeSectionId) {
      const node = headerRefsRef.current.get(activeSectionId)
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    shouldScrollRef.current = false
  }, [activeSectionId])

  function handleActiveChange(idStr: string) {
    const id = idStr as SectionId
    if (id === activeSectionId) return
    openSection(id)
  }

  return (
    <CheckoutContextProvider value={checkoutContext}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-8">
          <DetailPageLayoutBody className="mt-8">
            <DetailPageLayoutMain>
              <div className="flex flex-col gap-4">
                <ExtractionLegend />
                <SectionGroup
                  activeId={activeSectionId}
                  onActiveChange={handleActiveChange}
                >
                <PropertySection />
                <RentDatesSection />
                <TenantsSection />
                <ExpensesSection />
                <CpfSection />
                <BankSection />
              </SectionGroup>
              </div>
            </DetailPageLayoutMain>

            <DetailPageLayoutSidebar className="md:sticky md:top-6 md:self-start">
              <CheckoutSummary className="hidden md:flex" />
            </DetailPageLayoutSidebar>
          </DetailPageLayoutBody>
        </div>
      </div>

      <CheckoutMobileBar className="md:hidden" />
    </CheckoutContextProvider>
  )
}

'use client'

import { createContext, useContext } from 'react'

import type { SectionId } from '../../state/registry'

/**
 * Scroll registry shared between PropertyCheckoutShell and the per-section
 * components it composes. The shell owns:
 *
 *   - `headerRefs` — a map of section id to its trigger node, so the shell
 *     can scroll into view on transition. Each section registers its trigger
 *     via `registerHeaderRef(id)` (which returns a stable ref callback).
 *   - `shouldScrollOnNextActiveChange` — flipped to true by transition
 *     handlers (Continue / Back / Skip) inside a section, before the store
 *     action runs. The shell's effect on `activeSectionId` consults this flag
 *     to decide whether to scroll, then resets it. Direct header taps leave
 *     the flag false, so taps don't scroll.
 */
export interface CheckoutContextValue {
  registerHeaderRef: (id: SectionId) => (node: HTMLButtonElement | null) => void
  requestTransitionScroll: () => void
  /** Wizard-owned submit handler. The desktop summary button and the mobile
   *  sticky bar both consume this — the wizard composes the action call,
   *  success-screen hand-off, and error dispatch in one place. */
  onCreateProperty: () => void
  /** True while the submit action is in flight. Disables the CTAs and
   *  swaps in a loading affordance per design-system motion rules. */
  isSubmitting: boolean
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null)

export const CheckoutContextProvider = CheckoutContext.Provider

export function useCheckoutContext(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext)
  if (!ctx) {
    throw new Error('useCheckoutContext must be used inside a <CheckoutContextProvider>')
  }
  return ctx
}

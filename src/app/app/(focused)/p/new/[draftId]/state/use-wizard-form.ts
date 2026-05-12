'use client'

import { useCallback, useMemo } from 'react'
import { z, type ZodError } from 'zod'

import type { FieldErrors } from '@/lib/forms/use-form-validation'

import type { SectionId } from './registry'
import { usePropertyCreationActions } from './store-provider'

/** Structural shape of a Zod `safeParse` result. The hook only needs the
 *  discriminated success flag plus access to the error for flattening on
 *  the failure branch — broader than a specific schema's parse type. */
type WizardFormParseResult =
  | { success: true; data: unknown }
  | { success: false; error: ZodError }

interface UseWizardFormOptions {
  sectionId: SectionId
  /**
   * Raw `safeParse` result for this form's values, sourced from the
   * section's `validation.ts` cache. Forms subscribe via a Zustand selector
   * (e.g. `validateExpenses(slice).perRow.get(id)`) so the parse is shared
   * with row badges, section status, and Continue gating — one parse per
   * slice change regardless of how many consumers read it.
   *
   * `undefined` means transient (e.g. a row mid-removal); the hook treats
   * it as not-yet-valid with no visible errors.
   */
  parseResult: WizardFormParseResult | undefined
  /**
   * Field names this form considers "touched" — gates which schema errors
   * are visible. Forms read their own touched state from
   * `state.sectionTouched[sectionId]` (single-form sections) or
   * `state.sectionTouched[sectionId][rowId]` (row forms) and pass the
   * resulting `Set<string>` here. Pass `undefined` for "nothing touched
   * yet" — `errors` will be empty.
   */
  touched: ReadonlySet<string> | undefined
}

interface UseWizardFormReturn {
  /** Overall validity. Not gated by touched — drives "Continue" button
   *  enablement, not error visibility. */
  isValid: boolean
  /** Per-field errors, gated by `touched`. A field's error is omitted
   *  from the map until it's been touched, so freshly-mounted forms don't
   *  yell at the user. */
  errors: FieldErrors
  /** Section-bound `setTouched` — accepts an updater that operates on the
   *  section's own touched value. The store dispatches without inspecting
   *  the shape; the form / list / section primitive call site supplies the
   *  updater shape. */
  setTouched: <T>(updater: (prev: T) => T) => void
}

/**
 * Wizard-specific form hook. Reads a cached parse result from the section's
 * `validation.ts`, filters errors by touched, and binds `setTouched` to the
 * section. Replaces `useFormValidation` for wizard forms so touch state
 * lives in the persisted Zustand store and the parse is shared across all
 * consumers (form, row badge, section status, Continue gate).
 *
 * Two concerns:
 *  - `isValid`: parse success — drives Continue gating.
 *  - `errors`: parse errors FILTERED by `touched` — drives visible error
 *    rendering. A field stays out of `errors` until the user has touched it.
 *
 * Non-wizard forms (user-menu, profile) keep using `useFormValidation`.
 */
export function useWizardForm({
  sectionId,
  parseResult,
  touched,
}: UseWizardFormOptions): UseWizardFormReturn {
  const { setTouched: setTouchedAction } = usePropertyCreationActions()

  const errors = useMemo<FieldErrors>(() => {
    if (!parseResult || parseResult.success) return {}
    if (!touched || touched.size === 0) return {}
    const flattened = z.flattenError(parseResult.error).fieldErrors as FieldErrors
    const filtered: FieldErrors = {}
    for (const field of Object.keys(flattened)) {
      if (touched.has(field)) {
        filtered[field] = flattened[field]
      }
    }
    return filtered
  }, [parseResult, touched])

  const setTouched = useCallback(
    <T,>(updater: (prev: T) => T) => {
      setTouchedAction(sectionId, updater)
    },
    [sectionId, setTouchedAction],
  )

  return {
    isValid: parseResult?.success ?? false,
    errors,
    setTouched,
  }
}

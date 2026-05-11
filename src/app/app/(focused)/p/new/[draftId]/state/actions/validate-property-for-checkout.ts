'use server'

import {
  validateProperty,
  type ValidatePropertyState,
} from '@/data/properties/actions/validate-property'
import type { PropertyInput } from '@/schemas/property'

import type { ServerErrorsResponse } from '../server-errors-types'

/**
 * Continue action result for the property section. Adds the
 * `existingPropertyId` callback channel on top of the canonical
 * `ServerErrorsResponse` envelope so the section component can still surface
 * the "duplicate address" toast with a deep-link action — that's wizard-UI
 * concern, not part of the spec's wire format for the submit action.
 *
 * The `ServerErrorsResponse` shape itself is unchanged; the
 * `existingPropertyId` field is only consumed by the wizard call site.
 */
export type ValidatePropertyForCheckoutResult = ServerErrorsResponse & {
  existingPropertyId?: string
}

/**
 * Wizard-only adapter around `validateProperty`. The shared
 * `validateProperty` action (used by the non-wizard property editor and
 * `create-property`) continues to return the legacy `{ valid, errors? }`
 * shape; this wrapper reshapes its output into the property-creation
 * wizard's canonical `ServerErrorsResponse` envelope.
 *
 * The wire shape per section already matches what `validateProperty` emits
 * today (`Record<string, string[]>` from `zodIssuesToFieldErrors`), so this
 * is a thin envelope reshape — no logic change.
 */
export async function validatePropertyForCheckout(
  fields: PropertyInput,
): Promise<ValidatePropertyForCheckoutResult> {
  const result: ValidatePropertyState = await validateProperty(fields)
  if (result.valid) {
    return { ok: true }
  }
  return {
    ok: false,
    sectionErrors: {
      property: (result.errors ?? {}) as Record<string, string[]>,
    },
    ...(result.existingPropertyId
      ? { existingPropertyId: result.existingPropertyId }
      : {}),
  }
}

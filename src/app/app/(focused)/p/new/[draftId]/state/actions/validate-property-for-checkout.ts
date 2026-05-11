'use server'

import {
  validateProperty,
  type ValidatePropertyState,
} from '@/data/properties/actions/validate-property'
import type { PropertyInput } from '@/schemas/property'

import type { ServerErrorsResponse } from '../types'

/**
 * Adds the `existingPropertyId` callback channel on top of
 * `ServerErrorsResponse` so the section can surface the "duplicate address"
 * toast with a deep-link. Wizard-UI concern, not part of the submit wire.
 */
export type ValidatePropertyForCheckoutResult = ServerErrorsResponse & {
  existingPropertyId?: string
}

/**
 * Wizard-side adapter around `validateProperty` (which still returns
 * `{ valid, errors? }` for the shared property editor + `create-property`).
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

'use server'

import {
  validateProperty,
  type ValidatePropertyState,
} from '@/data/properties/actions/validate-property'
import type { PropertyInput } from '@/schemas/property'

import type { ServerErrorsResponse } from '../types'

/**
 * Adds the `existingPropertyId` callback channel on top of
 * `ServerErrorsResponse` so the section can surface the "view existing
 * property" deep-link alongside the wizard's `duplicate_address` toast.
 * Wizard-UI concern, not part of the submit wire.
 */
export type ValidatePropertyForCheckoutResult = ServerErrorsResponse & {
  existingPropertyId?: string
}

/**
 * Wizard-side adapter around `validateProperty` (which still returns
 * `{ valid, errors? }` for the shared property editor + `create-property`).
 *
 * Upstream emits a single `general: ['duplicateAddress']` entry to signal a
 * conflict against another property the viewer already owns — this is not
 * a per-field validation issue, so we lift it out of `sectionErrors.property`
 * (where it would render as a phantom field key) and surface it as a wizard-
 * level `duplicate_address` global error. The wizard subscribes to
 * `globalErrors` and renders a destructive toast.
 */
export async function validatePropertyForCheckout(
  fields: PropertyInput,
): Promise<ValidatePropertyForCheckoutResult> {
  const result: ValidatePropertyState = await validateProperty(fields)
  if (result.valid) {
    return { ok: true }
  }

  const errors = result.errors ?? {}
  const isDuplicate = errors.general?.includes('duplicateAddress') ?? false
  if (isDuplicate) {
    return {
      ok: false,
      globalErrors: [
        {
          code: 'duplicate_address',
          data: result.existingPropertyId
            ? { existingPropertyId: result.existingPropertyId }
            : undefined,
        },
      ],
      ...(result.existingPropertyId ? { existingPropertyId: result.existingPropertyId } : {}),
    }
  }

  return {
    ok: false,
    sectionErrors: {
      property: errors as Record<string, string[]>,
    },
    ...(result.existingPropertyId ? { existingPropertyId: result.existingPropertyId } : {}),
  }
}

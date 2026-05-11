'use server'

import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

import type { CheckoutPath } from '../registry'
import type { ServerErrorsResponse } from '../server-errors-types'
import {
  rentDatesSchemaFor,
  type RentDatesInput,
} from '../../steps/checkout/sections/rent-dates/schemas'

/**
 * Continue action for the rent-and-dates section. Returns the canonical
 * `ServerErrorsResponse` envelope so the section component can dispatch the
 * result through the store's `applyServerErrorsResponse` action without any
 * reshape at the call site.
 *
 * The wire shape per section already matches what `z.flattenError` produces,
 * so a failure projects the issues into `sectionErrors['rent-dates']`.
 */
export async function validateRentDatesCore(
  _supabase: TypedSupabaseClient,
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ServerErrorsResponse> {
  const schema = rentDatesSchemaFor(path)
  const result = schema.safeParse(fields)
  if (!result.success) {
    return {
      ok: false,
      sectionErrors: {
        'rent-dates': z.flattenError(result.error).fieldErrors as Record<
          string,
          string[]
        >,
      },
    }
  }

  return { ok: true }
}

export async function validateRentDates(
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ServerErrorsResponse> {
  const supabase = await createClient()
  return validateRentDatesCore(supabase, fields, path)
}

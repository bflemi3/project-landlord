'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import {
  zodIssuesToFieldErrors,
  type ValidateState,
} from '@/lib/validation'

import type { CheckoutPath } from '../registry'
import {
  rentDatesSchemaFor,
  type RentDatesInput,
} from '../rent-dates-schema'

export type ValidateRentDatesState = ValidateState<RentDatesInput>

export async function validateRentDatesCore(
  _supabase: TypedSupabaseClient,
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ValidateRentDatesState> {
  const schema = rentDatesSchemaFor(path)
  const result = schema.safeParse(fields)
  if (!result.success) {
    return {
      valid: false,
      errors: zodIssuesToFieldErrors<RentDatesInput>(result.error.issues),
    }
  }

  return { valid: true, fields: result.data }
}

export async function validateRentDates(
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ValidateRentDatesState> {
  const supabase = await createClient()
  return validateRentDatesCore(supabase, fields, path)
}

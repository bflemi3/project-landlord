'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import {
  zodIssuesToFieldErrors,
  type ValidateState,
} from '@/lib/validation'

import type { CheckoutPath } from '../registry'
import {
  rentDatesSchema,
  type RentDatesInput,
} from '../rent-dates-schema'

export type ValidateRentDatesState = ValidateState<RentDatesInput>

export async function validateRentDatesCore(
  _supabase: TypedSupabaseClient,
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ValidateRentDatesState> {
  const result = rentDatesSchema.safeParse(fields)
  if (!result.success) {
    return {
      valid: false,
      errors: zodIssuesToFieldErrors<RentDatesInput>(result.error.issues),
    }
  }

  const validatedFields = result.data
  const errors: ValidateRentDatesState['errors'] = {}

  if (path === 'contract') {
    if (validatedFields.amount_minor == null) {
      errors.amount_minor = ['required']
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, fields: validatedFields }
}

export async function validateRentDates(
  fields: RentDatesInput,
  path: CheckoutPath,
): Promise<ValidateRentDatesState> {
  const supabase = await createClient()
  return validateRentDatesCore(supabase, fields, path)
}

import { z } from 'zod'

import { Constants } from '@/lib/types/database'
import type { Database } from '@/lib/types/database'

type PropertyType = Database['public']['Enums']['property_type']
const PROPERTY_TYPES = Constants.public.Enums.property_type as readonly PropertyType[]

const POSTAL_CODE_RE = /^(?:\d{5}-\d{3}|\d{8})$/

const BR_STATE_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
])

export const propertySchema = z.object({
  name: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  postal_code: z.string().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    if (!POSTAL_CODE_RE.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidPostalCode' })
    }
  }),
  street: z
    .string()
    .min(1, { error: 'required' })
    .max(200, { error: 'tooLong' }),
  number: z
    .string()
    .min(1, { error: 'required' })
    .max(20, { error: 'tooLong' }),
  complement: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  neighborhood: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  city: z.string().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    if (value.length > 100) {
      ctx.addIssue({ code: 'custom', message: 'tooLong' })
      return
    }
    if (/\d/.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidCity' })
    }
  }),
  state: z.string().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    if (!BR_STATE_CODES.has(value.toUpperCase())) {
      ctx.addIssue({ code: 'custom', message: 'invalidState' })
    }
  }),
  country_code: z.string().default('BR'),
  property_type: z.enum(PROPERTY_TYPES).nullable().default(null),
})

export type PropertyInput = z.infer<typeof propertySchema>

export function defaultPropertyInput(): PropertyInput {
  return {
    name: '',
    postal_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country_code: 'BR',
    property_type: null,
  }
}

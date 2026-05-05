import { z } from 'zod'

import { stripHtml } from '@/lib/strip-html'
import { Constants } from '@/lib/types/database'
import type { Database } from '@/lib/types/database'

type PropertyType = Database['public']['Enums']['property_type']
const PROPERTY_TYPES = Constants.public.Enums
  .property_type as readonly PropertyType[]

export const propertyInputBaseSchema = z.object({
  name: z.string().max(100, { error: 'tooLong' }).default(''),
  country_code: z.string().default('BR'),
  property_type: z
    .enum(PROPERTY_TYPES, { error: 'invalidPropertyType' })
    .nullable()
    .default(null),
})

export const propertyAddressInputBaseSchema = z.object({
  postal_code: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(32, { error: 'tooLong' }),
  street: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(200, { error: 'tooLong' }),
  number: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(20, { error: 'tooLong' }),
  city: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(100, { error: 'tooLong' }),
  state: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(100, { error: 'tooLong' }),
  complement: z.string().max(100, { error: 'tooLong' }).default(''),
  neighborhood: z.string().max(100, { error: 'tooLong' }).default(''),
})

const BRAZILIAN_POSTAL_CODE_RE = /^(?:\d{5}-\d{3}|\d{8})$/
const BRAZILIAN_STATE_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
])

export const brazilAddressSchema = propertyAddressInputBaseSchema.extend({
  postal_code: propertyAddressInputBaseSchema.shape.postal_code.superRefine(
    (value, ctx) => {
      if (value.length === 0) return
      if (!BRAZILIAN_POSTAL_CODE_RE.test(value)) {
        ctx.addIssue({ code: 'custom', message: 'invalidPostalCode' })
      }
    },
  ),
  city: propertyAddressInputBaseSchema.shape.city.superRefine((value, ctx) => {
    if (value.length === 0 || value.length > 100) return
    if (/\d/.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidCity' })
    }
  }),
  state: propertyAddressInputBaseSchema.shape.state.superRefine(
    (value, ctx) => {
      if (value.length === 0 || value.length > 100) return
      if (!BRAZILIAN_STATE_CODES.has(value.toUpperCase())) {
        ctx.addIssue({ code: 'custom', message: 'invalidState' })
      }
    },
  ),
})

export const fallbackAddressSchema = propertyAddressInputBaseSchema.extend({
  postal_code: propertyAddressInputBaseSchema.shape.postal_code
    .optional()
    .default(''),
  number: propertyAddressInputBaseSchema.shape.number.optional().default(''),
  state: propertyAddressInputBaseSchema.shape.state.optional().default(''),
})

export const propertyInputSchema = propertyInputBaseSchema.extend(
  brazilAddressSchema.shape,
)

function preprocessPropertyFormData(value: unknown): unknown {
  if (!(value instanceof FormData)) return value

  const entries = Array.from(value.entries(), ([key, entry]) => [
    key,
    typeof entry === 'string' ? stripHtml(entry.trim()) : entry,
  ])
  const raw = Object.fromEntries(entries)

  if (raw.country_code === '') delete raw.country_code
  if (raw.property_type === '') delete raw.property_type

  return raw
}

const ADDRESS_SCHEMAS_BY_COUNTRY = {
  BR: brazilAddressSchema,
} satisfies Record<string, typeof propertyAddressInputBaseSchema>

export function getPropertyInputSchema(countryCode = 'BR') {
  const addressSchema =
    ADDRESS_SCHEMAS_BY_COUNTRY[countryCode as keyof typeof ADDRESS_SCHEMAS_BY_COUNTRY] ??
    fallbackAddressSchema
  return propertyInputBaseSchema.extend(addressSchema.shape)
}

export function getPropertyInputFormDataSchema(countryCode = 'BR') {
  return z.preprocess(preprocessPropertyFormData, getPropertyInputSchema(countryCode))
}

export const propertyInputFormDataSchema = getPropertyInputFormDataSchema('BR')

export type PropertyInput = z.infer<typeof propertyInputSchema>

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

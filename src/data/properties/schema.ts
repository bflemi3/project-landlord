import { z } from 'zod'

import { stripHtml } from '@/lib/strip-html'
import { Constants } from '@/lib/types/database'
import type { Database } from '@/lib/types/database'

type PropertyType = Database['public']['Enums']['property_type']
const PROPERTY_TYPES = Constants.public.Enums.property_type as readonly PropertyType[]

export const propertyBaseSchema = z.object({
  name: z.string().max(100, { error: 'tooLong' }).default(''),
  country_code: z.string().default('BR'),
  property_type: z.enum(PROPERTY_TYPES, { error: 'invalidPropertyType' }).nullable().default(null),
})

export const propertyAddressShapeSchema = z.object({
  postal_code: z.string({ error: 'required' }).min(1, { error: 'required' }).max(32, { error: 'tooLong' }),
  street: z.string({ error: 'required' }).min(1, { error: 'required' }).max(200, { error: 'tooLong' }),
  number: z.string({ error: 'required' }).min(1, { error: 'required' }).max(20, { error: 'tooLong' }),
  city: z.string({ error: 'required' }).min(1, { error: 'required' }).max(100, { error: 'tooLong' }),
  state: z.string({ error: 'required' }).min(1, { error: 'required' }).max(100, { error: 'tooLong' }),
  complement: z.string().max(100, { error: 'tooLong' }).default(''),
  neighborhood: z.string().max(100, { error: 'tooLong' }).default(''),
})

export const propertySchema = propertyBaseSchema.extend(propertyAddressShapeSchema.shape)

export const propertyInfoFormDataSchema = z.preprocess((value) => {
  if (!(value instanceof FormData)) return value

  const entries = Array.from(value.entries(), ([key, entry]) => [
    key,
    typeof entry === 'string' ? stripHtml(entry.trim()) : entry,
  ])
  const raw = Object.fromEntries(entries)

  if (raw.country_code === '') delete raw.country_code
  if (raw.property_type === '') delete raw.property_type

  return raw
}, propertySchema)

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

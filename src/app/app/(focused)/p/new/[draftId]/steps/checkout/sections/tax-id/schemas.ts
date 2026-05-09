import { z } from 'zod'

import {
  brazilCpfOrCnpjSchema,
  fallbackTaxIdSchema,
  taxIdBaseSchema,
} from '@/schemas/tax-id'

export const taxIdInputBaseSchema = z.object({
  tax_id: taxIdBaseSchema,
})

// BR variant accepts CPF OR CNPJ — the landlord may file as either an
// individual or a business. Tenants stay on `brazilTaxIdSchema` (CPF only)
// for the residential MVP; this section is the one that needs the looser
// variant.
//
// The wizard's tax-id section is required, so we layer a non-empty refinement
// on top of the field-level schema (which accepts empty as valid for optional
// consumers like tenant rows). Compose order: base superRefine fires first
// (early-returns on empty, no error); then refine catches the empty case with
// a `required` message. Non-empty + invalid surfaces `invalidTaxId` only.
export const taxIdInputSchema = taxIdInputBaseSchema.extend({
  tax_id: brazilCpfOrCnpjSchema.refine((v) => v.length > 0, {
    message: 'required',
  }),
})

export const fallbackTaxIdInputSchema = taxIdInputBaseSchema.extend({
  tax_id: fallbackTaxIdSchema.refine((v) => v.length > 0, {
    message: 'required',
  }),
})

const TAX_ID_INPUT_SCHEMAS_BY_COUNTRY = {
  BR: taxIdInputSchema,
} satisfies Record<string, typeof taxIdInputBaseSchema>

/**
 * Polymorphic dispatcher by country. Mirrors `getPropertyInputSchema` and
 * `getTenantInputSchema` — country-specific tax-id rules wrap the same
 * one-field object shape.
 */
export function getTaxIdInputSchema(countryCode = 'BR') {
  return (
    TAX_ID_INPUT_SCHEMAS_BY_COUNTRY[
      countryCode as keyof typeof TAX_ID_INPUT_SCHEMAS_BY_COUNTRY
    ] ?? fallbackTaxIdInputSchema
  )
}

export type TaxIdInput = z.infer<typeof taxIdInputSchema>

/** Field names derived from the schema's shape — single source of truth
 *  for the tax-id section's touched logic. */
export const TAX_ID_INPUT_FIELD_NAMES = Object.keys(
  taxIdInputBaseSchema.shape,
) as readonly (keyof TaxIdInput)[]

export function defaultTaxIdInput(): TaxIdInput {
  return { tax_id: '' }
}

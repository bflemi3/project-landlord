import { z } from 'zod'

import { isValidTaxIdBR } from '@/lib/tax-id/br'
import { isValidCpf } from '@/lib/tax-id/cpf/validate'

// =============================================================================
// Tax ID — polymorphic-by-country Zod schema for the `tax_id` column.
//
// Brazil → CPF (11 digits + check digits via `isValidCpf`).
// Fallback → length-only structural check (used by the tenant schema's base
// composition and for any country we haven't yet specialized).
//
// The base shape and every country-specific variant share the same input/
// output type (string), so callers can swap them by reference at runtime
// without rewriting consumer types. The tenant schema (and any future
// schemas that hold a tax_id) consume `getTaxIdSchema(countryCode)` to pull
// in the right validation per country.
// =============================================================================

export const taxIdBaseSchema = z.string().trim().max(64, { error: 'tooLong' })

export const brazilTaxIdSchema = taxIdBaseSchema.superRefine((value, ctx) => {
  if (value.length === 0) return // optional — empty is acceptable
  if (!isValidCpf(value)) {
    ctx.addIssue({ code: 'custom', message: 'invalidTaxId' })
  }
})

/**
 * Accepts either a valid CPF (individual) or a valid CNPJ (business). Used by
 * the landlord's own tax-id section, where the user may file under either.
 * Tenant rows stay on `brazilTaxIdSchema` (CPF-only) for the residential MVP.
 */
export const brazilCpfOrCnpjSchema = taxIdBaseSchema.superRefine((value, ctx) => {
  if (value.length === 0) return // optional — empty is acceptable
  if (!isValidTaxIdBR(value)) {
    ctx.addIssue({ code: 'custom', message: 'invalidTaxId' })
  }
})

export const fallbackTaxIdSchema = taxIdBaseSchema

const TAX_ID_SCHEMAS_BY_COUNTRY = {
  BR: brazilTaxIdSchema,
} satisfies Record<string, z.ZodType<string>>

/**
 * Returns the tax-id schema for the given country, falling back to the
 * looser `fallbackTaxIdSchema` for unsupported countries. Same dispatcher
 * pattern as `getPropertyInputSchema` in `./property.ts`.
 */
export function getTaxIdSchema(countryCode = 'BR'): z.ZodType<string> {
  return (
    TAX_ID_SCHEMAS_BY_COUNTRY[countryCode as keyof typeof TAX_ID_SCHEMAS_BY_COUNTRY] ??
    fallbackTaxIdSchema
  )
}

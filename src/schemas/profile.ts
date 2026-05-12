import { z } from 'zod'

import { brazilCpfOrCnpjSchema } from './tax-id'

// =============================================================================
// Profile field schemas
//
// Single source of truth for the validation shape of editable profile fields.
// Server actions in `src/data/profiles/actions/` parse with these; client
// mutation hooks and the settings UI consume the same definitions so layers
// can't drift.
//
// `taxIdInputSchema` is the optional variant — empty is valid (a user may
// clear their tax_id under LGPD data minimization). The wizard's create-
// property flow has its own required-non-empty extension at
// `src/app/.../checkout/sections/tax-id/schemas.ts` because in that flow a tax_id is
// always required to proceed.
// =============================================================================

export const nameInputSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .max(120, { error: 'tooLong' }),
})

export type NameInput = z.infer<typeof nameInputSchema>

export const taxIdInputSchema = z.object({
  tax_id: brazilCpfOrCnpjSchema,
})

export type TaxIdInput = z.infer<typeof taxIdInputSchema>

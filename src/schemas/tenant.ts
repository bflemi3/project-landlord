import { z } from 'zod'

import { brazilTaxIdSchema, getTaxIdSchema, taxIdBaseSchema } from './tax-id'

// Row-level extensions (e.g., the wizard's `tenantRowSchema`) compose
// `tenantInputBaseSchema` directly with their own `taxId` and `email`
// overrides — not `tenantInputSchema`, which locks taxId to the BR-specialized
// schema. The base is the common ground for any input-shaped composition.
export const tenantInputBaseSchema = z.object({
  name: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'tooLong' }),
  email: z.email({ error: 'invalidEmail' }),
  taxId: taxIdBaseSchema,
  inviteNow: z.boolean(),
})

export const tenantInputSchema = tenantInputBaseSchema.extend({
  taxId: brazilTaxIdSchema,
})

export function getTenantInputSchema(countryCode = 'BR') {
  return tenantInputBaseSchema.extend({ taxId: getTaxIdSchema(countryCode) })
}

export type TenantInput = z.infer<typeof tenantInputSchema>

import { z } from 'zod'

import type { ContractParty } from '@/lib/contract-extraction/types'
import { tenantInputBaseSchema } from '@/schemas/tenant'
import { brazilTaxIdSchema, getTaxIdSchema } from '@/schemas/tax-id'

const rowExtensions = {
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'invalidEmail' }).or(z.literal(''))),
  id: z.string().min(1, { error: 'required' }),
  isExtracted: z.boolean(),
}

function refineEmailByInviteNow(
  data: { email: string; inviteNow: boolean },
  ctx: z.RefinementCtx,
) {
  if (data.inviteNow && data.email.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'required' })
  }
}

export const tenantRowSchema = tenantInputBaseSchema
  .extend({ ...rowExtensions, taxId: brazilTaxIdSchema })
  .superRefine(refineEmailByInviteNow)

export function getTenantRowSchema(countryCode = 'BR') {
  return tenantInputBaseSchema
    .extend({ ...rowExtensions, taxId: getTaxIdSchema(countryCode) })
    .superRefine(refineEmailByInviteNow)
}

export type TenantRow = z.infer<typeof tenantRowSchema>

export function defaultTenantRow(): TenantRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    email: '',
    taxId: '',
    inviteNow: true,
    isExtracted: false,
  }
}

export function tenantRowFromContractParty(party: ContractParty): TenantRow {
  return {
    id: crypto.randomUUID(),
    name: party.name ?? '',
    email: party.email ?? '',
    taxId: party.taxId ?? '',
    inviteNow: true,
    isExtracted: true,
  }
}

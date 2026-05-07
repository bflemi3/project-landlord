import { z } from 'zod'

import type { ContractParty } from '@/lib/contract-extraction/types'
import { formatCpf } from '@/lib/tax-id/cpf/format'
import { isValidCpf } from '@/lib/tax-id/cpf/validate'
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

export function tenantRowFromContractParty(
  party: ContractParty,
  countryCode = 'BR',
): TenantRow {
  return {
    id: crypto.randomUUID(),
    name: normalizeExtractedName(party.name ?? ''),
    email: party.email ?? '',
    taxId: sanitizeExtractedTaxId(party.taxId ?? '', countryCode),
    inviteNow: true,
    isExtracted: true,
  }
}

// LLM extraction frequently hallucinates placeholders (e.g. "XXX") for missing
// CPFs. Drop anything that doesn't pass check-digit validation so the seeded
// row starts clean rather than landing the landlord on an inline error.
function sanitizeExtractedTaxId(raw: string, countryCode: string): string {
  if (countryCode !== 'BR') return raw
  return isValidCpf(raw) ? formatCpf(raw) : ''
}

// Always title-case extracted names so contract formatting variants ("BRANDON
// FLEMMING", "brandon flemming", "Maria silva") all land consistently. Trades
// off internal capitals like "McDonald" or "O'Brien", which become "Mcdonald"
// / "O'brien" — rare in Brazilian contracts and easy for the landlord to fix.
function normalizeExtractedName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

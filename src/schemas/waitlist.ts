import { z } from 'zod'

// Fixed token sets shared by the modal (option rendering), the schema
// (validation), and the DB CHECK constraints (migration
// 20260617120000_waitlist_progressive_fields). Single source of truth — keep
// these in lockstep with the SQL CHECKs.
export const ROLE_TOKENS = [
  'landlord',
  'tenant',
  'both',
  'imobiliaria',
  'other',
] as const

export const PROPERTY_COUNT_TOKENS = ['0', '1', '2-5', '6-10', '10+'] as const

export const WORKFLOW_TOKENS = [
  'whatsapp',
  'email',
  'spreadsheet',
  'bank_app',
  'imobiliaria',
  'marketplace',
  'dedicated_software',
  'accountant',
  'other',
] as const

export type WaitlistRoleToken = (typeof ROLE_TOKENS)[number]
export type PropertyCountToken = (typeof PROPERTY_COUNT_TOKENS)[number]
export type WorkflowToken = (typeof WORKFLOW_TOKENS)[number]

// The progressive-waitlist enrich step. Email + the three choice fields are
// required; the open-ended answer is optional (owner decision — capture the
// full lead profile, free text is a bonus). Error strings are message-file keys
// resolved by the form layer.
export const waitlistModalSchema = z.object({
  email: z.email({ error: 'invalidEmail' }),
  role: z.enum(ROLE_TOKENS, { error: 'required' }),
  propertyCount: z.enum(PROPERTY_COUNT_TOKENS, { error: 'required' }),
  // Multi-select — people manage with more than one tool (WhatsApp + a
  // spreadsheet + the bank app). At least one is required. The array-level
  // `error` covers a missing/undefined value; `min(1)` covers an empty array.
  workflow: z
    .array(z.enum(WORKFLOW_TOKENS), { error: 'required' })
    .min(1, { error: 'required' }),
  feedback: z.string().trim().max(1000, { error: 'tooLong' }).optional(),
})

export type WaitlistModalInput = z.infer<typeof waitlistModalSchema>

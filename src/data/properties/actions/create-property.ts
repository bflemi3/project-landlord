'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { generateInviteCode } from '@/data/invitations/generate-invite-code'
import { sendTenantInviteEmail } from '@/data/invitations/send-invite-emails'
import { formatAddress, formatAddressHtml } from '@/lib/address/format-address'
import { type EmailLocale } from '@/emails/i18n'
import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import { contractInputSchema } from '@/schemas/contract'
import { expenseRowSchema } from '@/schemas/expense'
import { getPropertyInputSchema, type PropertyInput } from '@/schemas/property'
import {
  propertyCreationSubmissionSchema,
  providerRequestDraftSchema,
  taxIdSubmissionSchema,
  tenantSubmissionRowSchema,
} from '@/schemas/property-creation-submission'
import { rentInputSchema } from '@/schemas/rent'

import {
  isRpcTaggedException,
  type SubmitGlobalErrorCode,
} from './create-property-errors'
import type {
  FlatFieldErrors,
  ServerErrorsResponse,
  SectionServerErrors,
  SubmitSummary,
  SubmitSummaryBillUpload,
  SubmitSummaryContract,
  SubmitSummaryProviderRequests,
  SubmitSummaryTenants,
} from './server-errors'
import type { SectionId } from '@/app/app/(focused)/p/new/[draftId]/state/registry'

// Types inferred from the canonical Zod schemas — single source of truth.
// Adding the wizard-only `id` (used for row-keyed error projection) and the
// extras (`draftId`, file Blobs) that don't fit the Zod parse boundary.
// `z.input<...>` (vs `z.infer`) honors `.default()` and `.optional()` on the
// caller side — wizard payloads omit defaulted fields like
// `provider_profile_id` and `bill_file`.
export type SubmitTenantInput = z.input<typeof tenantSubmissionRowSchema> & {
  id: string
}
export type SubmitExpenseInput = z.input<typeof expenseRowSchema> & {
  id: string
}
export type SubmitProviderRequestDraftInput = z.input<
  typeof providerRequestDraftSchema
>
export type SubmitRentInput = z.input<typeof rentInputSchema>
export type SubmitContractInput = z.input<typeof contractInputSchema>
export type SubmitTaxIdInput = z.input<typeof taxIdSubmissionSchema>

export interface SubmitInput {
  draftId: string
  path: 'contract' | 'no_contract'
  property: PropertyInput
  tax_id: SubmitTaxIdInput
  rent?: SubmitRentInput
  tenants?: SubmitTenantInput[]
  expenses?: SubmitExpenseInput[]
  provider_request_drafts?: SubmitProviderRequestDraftInput[]
  contract?: SubmitContractInput
  contractFile?: Blob | null
  /** Index-aligned with `provider_request_drafts` — one Blob per draft. */
  providerRequestBillFiles?: Array<Blob | null>
}

export async function createProperty(
  input: SubmitInput,
): Promise<ServerErrorsResponse> {
  const supabase = await createClient()
  return createPropertyCore(supabase, input)
}

/**
 * Testable wrapper per `testing` skill — accepts an externally-built Supabase
 * client. Integration tests pass an authed client; unit tests pass a stub.
 */
export async function createPropertyCore(
  supabase: TypedSupabaseClient,
  input: SubmitInput,
): Promise<ServerErrorsResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, globalErrors: [{ code: 'unauthenticated' }] }
  }

  const composedParse = propertyCreationSubmissionSchema.safeParse(input)
  if (!composedParse.success) {
    return projectValidationFailureToEnvelope(input)
  }

  const rpcArgs = buildRpcPayload(input)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'create_property',
    rpcArgs as never,
  )

  if (rpcError) return mapRpcErrorToResponse(rpcError.message)
  if (!rpcData) return { ok: false, globalErrors: [{ code: 'unknown' }] }

  const rpcSummary = rpcData as unknown as SubmitSummary

  let contractUploadFailed = false
  if (rpcSummary.contract && input.contractFile) {
    contractUploadFailed = await uploadContract(
      supabase,
      rpcSummary.contract,
      input.contractFile,
      input.contract?.mime_type ?? 'application/octet-stream',
    )
  }

  // Bill blobs are index-aligned with `provider_request_drafts`; the RPC's
  // returned `bill_uploads` only contains pending rows. Walk both in order
  // and consume the next non-null blob for each pending upload.
  let billUploadFailedCount = 0
  const billBlobs = input.providerRequestBillFiles ?? []
  let billBlobCursor = 0
  for (const billUpload of rpcSummary.provider_requests.bill_uploads ?? []) {
    let blob: Blob | null = null
    while (billBlobCursor < billBlobs.length) {
      const candidate = billBlobs[billBlobCursor]
      billBlobCursor += 1
      if (candidate) {
        blob = candidate
        break
      }
    }
    if (!blob) continue
    const failed = await uploadBill(supabase, billUpload, blob)
    if (failed) billUploadFailedCount += 1
  }

  const emailFailedCount = await sendPendingInviteEmails(
    supabase,
    user.id,
    rpcSummary.property_id,
    rpcSummary.tenants.invitations_to_email ?? [],
  )

  revalidatePath('/app')
  revalidatePath(`/app/p/${rpcSummary.property_id}`)

  const summary: SubmitSummary = {
    ...rpcSummary,
    contract: rpcSummary.contract
      ? {
          ...rpcSummary.contract,
          upload_failed: contractUploadFailed || undefined,
        }
      : null,
    tenants: {
      ...rpcSummary.tenants,
      email_failed_count: emailFailedCount || undefined,
    } as SubmitSummaryTenants,
    provider_requests: {
      ...rpcSummary.provider_requests,
      bill_upload_failed_count: billUploadFailedCount || undefined,
    } as SubmitSummaryProviderRequests,
  }

  return { ok: true, summary }
}

// ---------------------------------------------------------------------------
// Validation projection — per-form `flattenError` per spec § Server-side
// projection. Contract isn't an accordion section, so its failures emit a
// `contract_validation_failed` global instead of landing in a section slot.
// ---------------------------------------------------------------------------

function projectValidationFailureToEnvelope(
  input: SubmitInput,
): ServerErrorsResponse {
  const sectionErrors: Partial<Record<SectionId, SectionServerErrors>> = {}
  const globalErrors: NonNullable<
    Extract<ServerErrorsResponse, { ok: false }>['globalErrors']
  > = []

  const propertyParse = getPropertyInputSchema(
    input.property?.country_code ?? 'BR',
  ).safeParse(input.property)
  if (!propertyParse.success) {
    sectionErrors.property = z.flattenError(propertyParse.error).fieldErrors
  }

  const taxIdParse = taxIdSubmissionSchema.safeParse(input.tax_id)
  if (!taxIdParse.success) {
    sectionErrors['tax-id'] = z.flattenError(taxIdParse.error).fieldErrors
  }

  if (input.rent !== undefined) {
    const rentParse = rentInputSchema.safeParse(input.rent)
    if (!rentParse.success) {
      sectionErrors['rent-dates'] = z.flattenError(rentParse.error).fieldErrors
    }
  }

  if (input.tenants !== undefined) {
    const rowErrors: Record<string, FlatFieldErrors> = {}
    for (const row of input.tenants) {
      const parsed = tenantSubmissionRowSchema.safeParse({
        name: row.name,
        email: row.email,
        taxId: row.taxId,
        inviteNow: row.inviteNow,
      })
      if (!parsed.success) {
        rowErrors[row.id] = z.flattenError(parsed.error).fieldErrors
      }
    }
    if (Object.keys(rowErrors).length > 0) sectionErrors.tenants = rowErrors
  }

  if (input.expenses !== undefined) {
    const rowErrors: Record<string, FlatFieldErrors> = {}
    for (const row of input.expenses) {
      const parsed = expenseRowSchema.safeParse(row)
      if (!parsed.success) {
        rowErrors[row.id] = z.flattenError(parsed.error).fieldErrors
      }
    }
    if (Object.keys(rowErrors).length > 0) sectionErrors.expenses = rowErrors
  }

  if (input.contract !== undefined) {
    const parsed = contractInputSchema.safeParse(input.contract)
    if (!parsed.success) {
      globalErrors.push({ code: 'contract_validation_failed' })
    }
  }

  const hasSectionErrors = Object.keys(sectionErrors).length > 0
  const hasGlobalErrors = globalErrors.length > 0
  if (!hasSectionErrors && !hasGlobalErrors) {
    // Composed schema rejected the input but no per-form parse caught it —
    // this is a cross-section invariant violation (path↔contract, etc.).
    // Surface as a generic global so the user isn't stuck on a quiet failure.
    return {
      ok: false,
      globalErrors: [{ code: 'rpc_constraint_violation' }],
    }
  }

  const response: Extract<ServerErrorsResponse, { ok: false }> = { ok: false }
  if (hasSectionErrors) response.sectionErrors = sectionErrors
  if (hasGlobalErrors) response.globalErrors = globalErrors
  return response
}

// ---------------------------------------------------------------------------
// RPC payload builder
// ---------------------------------------------------------------------------

interface RpcPayload {
  p_property_id: string
  p_property: Record<string, unknown>
  p_unit: Record<string, unknown>
  p_contract?: Record<string, unknown> | null
  p_rent?: Record<string, unknown> | null
  p_tenants?: Array<Record<string, unknown>> | null
  p_expenses?: Array<Record<string, unknown>> | null
  p_provider_request_drafts?: Array<Record<string, unknown>> | null
  p_tax_id?: string | null
}

function buildRpcPayload(input: SubmitInput): RpcPayload {
  const property = input.property
  const propertyJson: Record<string, unknown> = {
    name: property.name || '',
    country_code: property.country_code || 'BR',
    property_type: property.property_type ?? null,
    street: property.street,
    number: property.number,
    complement: property.complement || null,
    neighborhood: property.neighborhood || null,
    city: property.city,
    state: property.state,
    postal_code: property.postal_code,
  }

  const unitJson: Record<string, unknown> = {
    name: property.name || '',
    currency: input.rent?.currency || 'BRL',
  }

  const contractJson: Record<string, unknown> | null =
    input.path === 'contract' && input.contract
      ? buildContractJson(input.contract)
      : null

  const rentJson: Record<string, unknown> | null = input.rent
    ? {
        amount_minor: input.rent.amount_minor,
        currency: input.rent.currency,
        due_day_of_month: input.rent.due_day_of_month,
        start_date: input.rent.start_date,
        end_date: input.rent.end_date,
        adjustment_frequency: input.rent.adjustment_frequency,
        adjustment_method: input.rent.adjustment_method,
        adjustment_index: input.rent.adjustment_index,
        adjustment_amount_minor: input.rent.adjustment_amount_minor,
        adjustment_basis_points: input.rent.adjustment_basis_points,
        includes: input.rent.includes,
      }
    : null

  const tenantsJson: Array<Record<string, unknown>> | null = input.tenants
    ? input.tenants.map((t) => ({
        name: t.name,
        email: t.email.trim().toLowerCase(),
        tax_id: t.taxId || null,
        invite_now: t.inviteNow,
        // Invite code generated TS-side per spec so the helper stays
        // canonical and tests can stub it.
        code: generateInviteCode(),
      }))
    : null

  const expensesJson: Array<Record<string, unknown>> | null = input.expenses
    ? input.expenses.map((e) => ({
        name: e.name,
        expense_type: e.expense_type,
        amount_behavior: e.amount_behavior,
        amount_minor: e.amount_minor,
        currency: e.currency,
        provider_profile_id: e.provider_profile_id ?? null,
        provider_request_draft_index: e.provider_request_draft_index ?? null,
      }))
    : null

  const providerRequestDraftsJson:
    | Array<Record<string, unknown>>
    | null = input.provider_request_drafts
    ? input.provider_request_drafts.map((d) => ({
        requested_provider_name: d.requested_provider_name,
        requested_provider_tax_id: d.requested_provider_tax_id,
        expense_type: d.expense_type,
        bill_file: d.bill_file,
      }))
    : null

  return {
    p_property_id: input.draftId,
    p_property: propertyJson,
    p_unit: unitJson,
    p_contract: contractJson,
    p_rent: rentJson,
    p_tenants: tenantsJson,
    p_expenses: expensesJson,
    p_provider_request_drafts: providerRequestDraftsJson,
    p_tax_id: input.tax_id?.tax_id || null,
  }
}

// Maps the wizard's flat `extraction_*` keys to the RPC's nested expectation.
function buildContractJson(contract: SubmitContractInput): Record<string, unknown> {
  const extraction = contract.extraction as unknown as
    | {
        extraction_data?: unknown
        extraction_language?: string
        extraction_model?: string
        extraction_schema_version?: number
        raw_text?: string
        extracted_at?: string
      }
    | null
  return {
    mime_type: contract.mime_type,
    bytes: contract.bytes,
    original_filename: contract.original_filename,
    extension: contract.extension,
    extraction: extraction
      ? {
          data: extraction.extraction_data ?? null,
          language: extraction.extraction_language ?? null,
          model: extraction.extraction_model ?? null,
          schema_version: extraction.extraction_schema_version ?? null,
          raw_text: extraction.raw_text ?? null,
          extracted_at: extraction.extracted_at ?? null,
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// RPC error mapping. Tagged exceptions land in either `sectionErrors` or
// `globalErrors`; anything untagged becomes `rpc_constraint_violation`.
// ---------------------------------------------------------------------------

function mapRpcErrorToResponse(message: string): ServerErrorsResponse {
  const code = message.trim()

  if (!isRpcTaggedException(code)) {
    return { ok: false, globalErrors: [{ code: 'rpc_constraint_violation' }] }
  }

  switch (code) {
    case 'unauthenticated':
      return { ok: false, globalErrors: [{ code: 'unauthenticated' }] }
    case 'idempotency_owner_mismatch':
      return {
        ok: false,
        globalErrors: [{ code: 'idempotency_owner_mismatch' }],
      }
    case 'tax_id_conflict':
      return {
        ok: false,
        sectionErrors: {
          'tax-id': { tax_id: ['tax_id_conflict'] } satisfies FlatFieldErrors,
        },
      }
    case 'expense_bundle_invalid_reference':
      // Defense-in-depth — the wizard payload doesn't carry bundling fields
      // today, and the composed Zod gate catches realistic violations. The
      // RPC message doesn't tell us which row tripped the rule, so a
      // section-scoped error can't be placed reliably.
      return {
        ok: false,
        globalErrors: [{ code: 'rpc_constraint_violation' }],
      }
    default: {
      const _exhaustive: never = code
      void _exhaustive
      return { ok: false, globalErrors: [{ code: 'unknown' }] }
    }
  }
}

// ---------------------------------------------------------------------------
// Storage uploads — non-fatal; `upsert: true` makes retries idempotent.
// ---------------------------------------------------------------------------

async function uploadContract(
  supabase: TypedSupabaseClient,
  contractRow: SubmitSummaryContract,
  blob: Blob,
  mimeType: string,
): Promise<boolean> {
  try {
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(contractRow.storage_path, blob, {
        contentType: mimeType,
        upsert: true,
      })

    const nextStatus = uploadError ? 'failed' : 'uploaded'
    await supabase
      .from('contracts')
      .update({ upload_status: nextStatus })
      .eq('id', contractRow.contract_id)
    return Boolean(uploadError)
  } catch {
    try {
      await supabase
        .from('contracts')
        .update({ upload_status: 'failed' })
        .eq('id', contractRow.contract_id)
    } catch {
      // Status flip is best-effort; the in-memory flag still surfaces.
    }
    return true
  }
}

async function uploadBill(
  supabase: TypedSupabaseClient,
  billRow: SubmitSummaryBillUpload,
  blob: Blob,
): Promise<boolean> {
  try {
    const { error: uploadError } = await supabase.storage
      .from('test-bills')
      .upload(billRow.storage_path, blob, {
        contentType: billRow.mime_type,
        upsert: true,
      })

    const nextStatus = uploadError ? 'failed' : 'uploaded'
    await supabase
      .from('provider_test_bills')
      .update({ upload_status: nextStatus })
      .eq('id', billRow.test_bill_id)
    return Boolean(uploadError)
  } catch {
    try {
      await supabase
        .from('provider_test_bills')
        .update({ upload_status: 'failed' })
        .eq('id', billRow.test_bill_id)
    } catch {
      // best-effort
    }
    return true
  }
}

// ---------------------------------------------------------------------------
// Tenant invite emails — call the shared `sendTenantInviteEmail` helper so
// the email template and Resend call shape stay single-source. The RPC has
// already inserted the invitation rows; this step only sends the email and
// stamps `last_emailed_at`. The 5-minute debounce + status check protects
// replays from double-sending.
// ---------------------------------------------------------------------------

async function sendPendingInviteEmails(
  supabase: TypedSupabaseClient,
  userId: string,
  propertyId: string,
  invitationIds: string[],
): Promise<number> {
  if (invitationIds.length === 0) return 0

  const [{ data: profile }, { data: property }] = await Promise.all([
    supabase
      .from('profiles')
      .select('preferred_locale, full_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('properties')
      .select(
        'name, street, number, complement, neighborhood, city, state, country_code',
      )
      .eq('id', propertyId)
      .single(),
  ])

  const locale = (profile?.preferred_locale as EmailLocale) ?? 'en'
  const landlordName = profile?.full_name ?? ''
  const addressOneLine = property ? formatAddress(property) : ''
  const addressHtml = property ? formatAddressHtml(property) : ''
  const propertyName = addressOneLine || property?.name || ''

  let failedCount = 0
  const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  for (const invitationId of invitationIds) {
    const { data: invitation } = await supabase
      .from('invitations')
      .select(
        'id, invited_email, invited_name, code, expires_at, status, last_emailed_at',
      )
      .eq('id', invitationId)
      .single()

    if (!invitation) continue
    if (invitation.status !== 'pending') continue
    if (
      invitation.last_emailed_at &&
      invitation.last_emailed_at > fiveMinutesAgoIso
    ) {
      continue
    }

    const sendResult = await sendTenantInviteEmail({
      to: invitation.invited_email,
      tenantName: invitation.invited_name,
      landlordName,
      propertyName,
      addressHtml,
      code: invitation.code ?? '',
      expiresAt:
        invitation.expires_at ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      locale,
    })

    if (!sendResult.success) {
      failedCount += 1
      continue
    }

    await supabase
      .from('invitations')
      .update({ last_emailed_at: new Date().toISOString() })
      .eq('id', invitationId)
  }

  return failedCount
}

export type { ServerErrorsResponse } from './server-errors'
export type SubmitErrorCode = SubmitGlobalErrorCode

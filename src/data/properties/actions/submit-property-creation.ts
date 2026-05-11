'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { generateInviteCode } from '@/data/invitations/generate-invite-code'
import { formatAddress, formatAddressHtml } from '@/lib/address/format-address'
import { getEmailTranslations, type EmailLocale } from '@/emails/i18n'
import { resend, RESEND_FROM } from '@/lib/resend/client'
import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'
import { getPropertyInputSchema, type PropertyInput } from '@/schemas/property'
import { propertyCreationSubmissionSchema } from '@/schemas/property-creation-submission'
import { expenseRowSchema as canonicalExpenseRowSchema } from '@/schemas/expense'
import { rentInputSchema } from '@/schemas/rent'
import { tenantInputBaseSchema } from '@/schemas/tenant'
import { taxIdBaseSchema } from '@/schemas/tax-id'
import { contractInputSchema } from '@/schemas/contract'

import {
  isRpcTaggedException,
  type SubmitGlobalErrorCode,
} from './submit-property-creation-errors'
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

// ---------------------------------------------------------------------------
// Wire shapes — what the wizard hands the action.
// ---------------------------------------------------------------------------

/**
 * Per-row tenant data the wizard sends. `id` is wizard-local (used for
 * row-keyed error projection) and gets stripped before the RPC payload is
 * built. Field names match the wizard's `tenantRowSchema` slice (camelCase
 * `taxId` / `inviteNow`) so the composed Zod schema parses without an
 * intermediate transform. The RPC payload builder snake-cases on the way
 * to `create_property`.
 */
export interface SubmitTenantInput {
  /** Stable wizard row id used to key row-level server errors. */
  id: string
  name: string
  email: string
  taxId: string
  inviteNow: boolean
}

/**
 * Per-row expense data the wizard sends. `id` and `isExtracted` are wizard-
 * local; everything else maps to `charge_definitions` columns or the
 * provider-attachment slots the RPC understands.
 */
export interface SubmitExpenseInput {
  id: string
  name: string
  expense_type: string
  amount_behavior: string
  amount_minor: number | null
  currency: string
  provider_profile_id?: string | null
  provider_request_draft_index?: number | null
  bundled_into_rent?: boolean
  bundled_into_expense_index?: number | null
}

export interface SubmitProviderRequestDraftInput {
  requested_provider_name: string
  requested_provider_tax_id: string | null
  expense_type: string | null
  bill_file: {
    mime_type: string
    original_filename: string
    extension: string
    bytes: number
  } | null
}

export interface SubmitRentInput {
  amount_minor: number
  currency: string
  due_day_of_month: number
  start_date: string | null
  end_date: string | null
  adjustment_frequency: string | null
  adjustment_method: string | null
  adjustment_index: string | null
  adjustment_amount_minor: number | null
  adjustment_basis_points: number | null
  includes: string[] | null
}

export interface SubmitContractInput {
  mime_type: string
  bytes: number
  original_filename: string
  extension: string
  extraction: ContractExtractionResult | null
}

/**
 * Final wizard payload. Keys for skipped sections are omitted entirely so
 * the server treats absence as "section was skipped." The composed Zod
 * schema makes every optional key actually optional, so omission is well-
 * typed all the way through.
 */
export interface SubmitInput {
  draftId: string
  path: 'contract' | 'no_contract'
  property: PropertyInput
  /**
   * Wraps the tax id in an object to mirror the wizard's `tax-id` section
   * slice and the composed schema's expectation (`taxIdSubmissionSchema =
   * z.object({ tax_id })`). Empty string is acceptable — the RPC decides
   * whether to write it based on whether `profiles.tax_id` is already set.
   */
  tax_id: { tax_id: string }
  rent?: SubmitRentInput
  tenants?: SubmitTenantInput[]
  expenses?: SubmitExpenseInput[]
  provider_request_drafts?: SubmitProviderRequestDraftInput[]
  contract?: SubmitContractInput
  /** The actual contract bytes, only sent on `path === 'contract'`. */
  contractFile?: Blob | null
  /**
   * The contract bill files, indexed by provider_request_drafts position.
   * Carry the same payload the RPC's `bill_file` field describes; the
   * action uploads after the RPC commits. Index 0 binds to draft 0, etc.
   */
  providerRequestBillFiles?: Array<Blob | null>
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Server-action entry point. Lives at the frozen identifier
 * `src/data/properties/actions/submit-property-creation.ts` per spec §
 * Implementation contract.
 *
 * Always returns a `ServerErrorsResponse` envelope — never throws to the
 * form. Phase 4 wires the wizard's Create-property button to this function;
 * this file owns the contract, not the wiring.
 */
export async function submitPropertyCreation(
  input: SubmitInput,
): Promise<ServerErrorsResponse> {
  const supabase = await createClient()
  return submitPropertyCreationCore(supabase, input)
}

/**
 * Testable wrapper per `testing` skill. Accepts an externally-built Supabase
 * client (so integration tests can pass a `createTestUser()`-authed client
 * and unit tests can pass a stub). The `submitPropertyCreation` public
 * action constructs the cookie-bound server client; everything else lives
 * here.
 */
export async function submitPropertyCreationCore(
  supabase: TypedSupabaseClient,
  input: SubmitInput,
): Promise<ServerErrorsResponse> {
  // -------------------------------------------------------------------------
  // 1. Auth gate. Never throw; return the envelope.
  // -------------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, globalErrors: [{ code: 'unauthenticated' }] }
  }

  // -------------------------------------------------------------------------
  // 2. Validate via the composed schema. The composed schema enforces
  //    cross-section invariants (path↔contract↔rent, provider_request_draft
  //    index range). On failure, re-run per-form parses to project errors
  //    in the per-form `flattenError` shape — this guarantees the wire
  //    shape mirrors what each client form parses (spec § Server-side
  //    projection).
  // -------------------------------------------------------------------------
  const composedParse = propertyCreationSubmissionSchema.safeParse(input)
  if (!composedParse.success) {
    const sectionErrors = projectComposedErrors(input)
    return { ok: false, sectionErrors }
  }

  // -------------------------------------------------------------------------
  // 3. Build the RPC payload. Strip wizard-only fields (`id`, `isExtracted`);
  //    generate invite codes TS-side; pass through provider-request drafts
  //    by index. The RPC re-validates the bundle graph as its own trust
  //    boundary.
  // -------------------------------------------------------------------------
  const rpcArgs = buildRpcPayload(input)

  // -------------------------------------------------------------------------
  // 4. Call the RPC. Map tagged exceptions to the envelope. Anything not
  //    tagged → `globalErrors: [{ code: 'rpc_constraint_violation' }]` so
  //    the user sees a destructive toast rather than a swallowed failure.
  // -------------------------------------------------------------------------
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'create_property',
    rpcArgs as never,
  )

  if (rpcError) {
    return mapRpcErrorToResponse(rpcError.message)
  }
  if (!rpcData) {
    return { ok: false, globalErrors: [{ code: 'unknown' }] }
  }

  // RPC returns a JSONB object that conforms to `SubmitSummary` minus the
  // three non-fatal extension flags layered on below. The DB-side
  // `coalesce(...)` defaults guarantee every required field is populated.
  const rpcSummary = rpcData as unknown as SubmitSummary

  // -------------------------------------------------------------------------
  // 5. Post-RPC contract upload (non-fatal).
  // -------------------------------------------------------------------------
  let contractUploadFailed = false
  if (rpcSummary.contract && input.contractFile) {
    contractUploadFailed = await uploadContract(
      supabase,
      rpcSummary.contract,
      input.contractFile,
      input.contract?.mime_type ?? 'application/octet-stream',
    )
  }

  // -------------------------------------------------------------------------
  // 6. Post-RPC bill uploads (non-fatal). The RPC returns one entry per
  //    `'pending'` bill row in `provider_requests.bill_uploads`. The wizard
  //    sends the corresponding blobs in `providerRequestBillFiles`, index-
  //    aligned with the order it submitted drafts. We walk the bill_uploads
  //    list and consume blobs from a cursor — on replay the RPC may filter
  //    out already-uploaded bills, but the relative order across the
  //    remaining set stays stable.
  // -------------------------------------------------------------------------
  let billUploadFailedCount = 0
  const billBlobs = input.providerRequestBillFiles ?? []
  let billBlobCursor = 0
  for (const billUpload of rpcSummary.provider_requests.bill_uploads ?? []) {
    // Advance the cursor to the next non-null blob; null entries mean the
    // draft had no bill (those drafts also don't appear in `bill_uploads`,
    // so this is defense against a wizard contract drift).
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

  // -------------------------------------------------------------------------
  // 7. Tenant invite emails (non-fatal). The RPC inserted the invitation
  //    rows; we send the email inline (NOT `sendInvite`/`inviteTenantCore`,
  //    which would insert a fresh row). The 5-minute `last_emailed_at`
  //    debounce protects against double-sending on replay; the RPC's
  //    replay path already filters out recent sends so the action only
  //    sees rows that are due.
  // -------------------------------------------------------------------------
  const emailFailedCount = await sendInviteEmails(
    supabase,
    user.id,
    rpcSummary.property_id,
    rpcSummary.tenants.invitations_to_email ?? [],
  )

  // -------------------------------------------------------------------------
  // 8. Revalidate cached app shell + the new property's page. Phase 4 may
  //    redirect the user to a different route post-success; revalidating
  //    `/app` keeps the home property list fresh either way.
  // -------------------------------------------------------------------------
  revalidatePath('/app')
  revalidatePath(`/app/p/${rpcSummary.property_id}`)

  // -------------------------------------------------------------------------
  // 9. Assemble the extended summary and return.
  // -------------------------------------------------------------------------
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
// Projection helpers
// ---------------------------------------------------------------------------

/**
 * Run each section's canonical schema once to produce the wire output. The
 * composed schema runs cross-section invariants; this projection step
 * guarantees the per-section/per-row wire shape matches what each client
 * form parses (spec § Server-side projection).
 */
function projectComposedErrors(
  input: SubmitInput,
): Partial<Record<SectionId, SectionServerErrors>> {
  const sectionErrors: Partial<Record<SectionId, SectionServerErrors>> = {}

  // Property — country-specific schema (BR by default).
  const propertyParse = getPropertyInputSchema(
    input.property?.country_code ?? 'BR',
  ).safeParse(input.property)
  if (!propertyParse.success) {
    sectionErrors.property = z.flattenError(propertyParse.error).fieldErrors
  }

  // Tax id — single-field flat slice; the composed schema and the wizard
  // hand the same `{ tax_id: string }` shape.
  const taxIdParse = z
    .object({ tax_id: taxIdBaseSchema })
    .safeParse(input.tax_id)
  if (!taxIdParse.success) {
    sectionErrors['tax-id'] = z.flattenError(taxIdParse.error).fieldErrors
  }

  // Rent — flat slice; only when sent.
  if (input.rent !== undefined) {
    const rentParse = rentInputSchema.safeParse(input.rent)
    if (!rentParse.success) {
      sectionErrors['rent-dates'] = z.flattenError(rentParse.error).fieldErrors
    }
  }

  // Tenants — per-row projection keyed by stable row id. The composed
  // schema uses `taxId`/`inviteNow` (camelCase to match the wizard's
  // `tenantRowSchema`); strip the wizard-only `id` before parsing.
  if (input.tenants !== undefined) {
    const tenantRowSchema = tenantInputBaseSchema.extend({
      taxId: taxIdBaseSchema,
    })
    const rowErrors: Record<string, FlatFieldErrors> = {}
    for (const row of input.tenants) {
      const parsed = tenantRowSchema.safeParse({
        name: row.name,
        email: row.email,
        taxId: row.taxId,
        inviteNow: row.inviteNow,
      })
      if (!parsed.success) {
        rowErrors[row.id] = z.flattenError(parsed.error).fieldErrors
      }
    }
    if (Object.keys(rowErrors).length > 0) {
      sectionErrors.tenants = rowErrors
    }
  }

  // Expenses — per-row projection keyed by stable row id.
  if (input.expenses !== undefined) {
    const rowErrors: Record<string, FlatFieldErrors> = {}
    for (const row of input.expenses) {
      const parsed = canonicalExpenseRowSchema.safeParse(row)
      if (!parsed.success) {
        rowErrors[row.id] = z.flattenError(parsed.error).fieldErrors
      }
    }
    if (Object.keys(rowErrors).length > 0) {
      sectionErrors.expenses = rowErrors
    }
  }

  // Contract — landed at the section-id slot? Contract isn't an accordion
  // section; spec routes contract-only errors via the step-1 surface or
  // globalErrors. We still surface validation problems by re-parsing here
  // when present — the wizard binds those at step-1, not at a checkout
  // section, so the projection just ensures we don't drop the issue.
  if (input.contract !== undefined) {
    const parsed = contractInputSchema.safeParse(input.contract)
    if (!parsed.success) {
      // No accordion section for the contract file; fall back to an empty
      // map under the property section so the user at least re-enters the
      // wizard at the top. (Phase 4 may relocate this to a step-1 toast.)
      const fields = z.flattenError(parsed.error).fieldErrors
      sectionErrors.property = {
        ...((sectionErrors.property as FlatFieldErrors | undefined) ?? {}),
        ...fields,
      }
    }
  }

  return sectionErrors
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

  // Default the unit currency to rent's currency when present, falling
  // through to BRL. The single-unit MVP doesn't ask for a unit name.
  const unitCurrency = input.rent?.currency || 'BRL'
  const unitJson: Record<string, unknown> = {
    name: property.name || '',
    currency: unitCurrency,
  }

  // Contract — only when path=contract AND wizard collected metadata. The
  // RPC's `p_contract` is the metadata blob; the file Blob is uploaded
  // separately AFTER the RPC commits.
  const contractJson: Record<string, unknown> | null =
    input.path === 'contract' && input.contract
      ? {
          mime_type: input.contract.mime_type,
          bytes: input.contract.bytes,
          original_filename: input.contract.original_filename,
          extension: input.contract.extension,
          extraction: input.contract.extraction
            ? {
                // The RPC reads `extraction -> 'data'`, `language`, `model`,
                // `schema_version`, `raw_text`, `extracted_at`. Map the
                // wizard's `extraction_*` flat keys to the RPC's nested
                // expectation.
                data:
                  (input.contract.extraction as unknown as {
                    extraction_data?: unknown
                  }).extraction_data ?? null,
                language:
                  (input.contract.extraction as unknown as {
                    extraction_language?: string
                  }).extraction_language ?? null,
                model:
                  (input.contract.extraction as unknown as {
                    extraction_model?: string
                  }).extraction_model ?? null,
                schema_version:
                  (input.contract.extraction as unknown as {
                    extraction_schema_version?: number
                  }).extraction_schema_version ?? null,
                raw_text:
                  (input.contract.extraction as unknown as {
                    raw_text?: string
                  }).raw_text ?? null,
                extracted_at:
                  (input.contract.extraction as unknown as {
                    extracted_at?: string
                  }).extracted_at ?? null,
              }
            : null,
        }
      : null

  // Rent — pass-through; the RPC handles nullable rows.
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

  // Tenants — strip wizard `id`; the RPC keys by its own UUID. Generate
  // invite codes TS-side per the spec so `generateInviteCode()` stays the
  // canonical helper (tests can stub it).
  const tenantsJson: Array<Record<string, unknown>> | null = input.tenants
    ? input.tenants.map((t) => ({
        name: t.name,
        email: t.email.trim().toLowerCase(),
        tax_id: t.taxId || null,
        invite_now: t.inviteNow,
        code: generateInviteCode(),
      }))
    : null

  // Expenses — strip wizard `id`/`isExtracted`. The RPC uses array position
  // for bundle-graph references and provider-request-draft references; the
  // order we send here is the order the RPC validates against.
  const expensesJson: Array<Record<string, unknown>> | null = input.expenses
    ? input.expenses.map((e) => ({
        name: e.name,
        expense_type: e.expense_type,
        amount_behavior: e.amount_behavior,
        amount_minor: e.amount_minor,
        currency: e.currency,
        provider_profile_id: e.provider_profile_id ?? null,
        provider_request_draft_index: e.provider_request_draft_index ?? null,
        bundled_into_rent: e.bundled_into_rent ?? false,
        bundled_into_expense_index: e.bundled_into_expense_index ?? null,
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

// ---------------------------------------------------------------------------
// RPC error → response mapping
// ---------------------------------------------------------------------------

function mapRpcErrorToResponse(message: string): ServerErrorsResponse {
  // `message` for tagged exceptions is a bare code string thanks to the
  // RPC's `raise exception '<code>'` pattern. Postgres prefixes nothing
  // when the message is the only payload; verified against the migration.
  const code = message.trim()

  if (!isRpcTaggedException(code)) {
    return {
      ok: false,
      globalErrors: [{ code: 'rpc_constraint_violation' }],
    }
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
      // Defense-in-depth — the wizard payload doesn't currently carry
      // bundling fields, and the composed Zod schema gates this earlier
      // for the day bundling lands in the UI. The RPC's exception message
      // doesn't tell us which row tripped the rule, so we can't surface
      // a row-scoped error reliably; promote to a global toast so the
      // user knows something didn't line up rather than silent-failing.
      // When bundling ships in the UI, the composed Zod will catch every
      // realistic case before the RPC sees it.
      return {
        ok: false,
        globalErrors: [{ code: 'rpc_constraint_violation' }],
      }
    default: {
      // Exhaustive guard — adding a new RpcTaggedException without
      // mapping it here is a type error.
      const _exhaustive: never = code
      void _exhaustive
      return { ok: false, globalErrors: [{ code: 'unknown' }] }
    }
  }
}

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------

/**
 * Upload contract bytes to the `contracts` bucket. `upsert: true` makes
 * retries idempotent (deterministic path = `{unit_id}/{contract_id}.<ext>`).
 * Updates `contracts.upload_status` based on outcome.
 *
 * Returns `true` when the upload failed.
 */
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

    if (uploadError) {
      await supabase
        .from('contracts')
        .update({ upload_status: 'failed' })
        .eq('id', contractRow.contract_id)
      return true
    }

    await supabase
      .from('contracts')
      .update({ upload_status: 'uploaded' })
      .eq('id', contractRow.contract_id)
    return false
  } catch {
    try {
      await supabase
        .from('contracts')
        .update({ upload_status: 'failed' })
        .eq('id', contractRow.contract_id)
    } catch {
      // Swallow — upload failure is non-fatal by spec.
    }
    return true
  }
}

/**
 * Upload a provider-request test-bill to the `test-bills` bucket. Same
 * idempotent retry posture as `uploadContract`.
 *
 * Returns `true` when the upload failed.
 */
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

    if (uploadError) {
      await supabase
        .from('provider_test_bills')
        .update({ upload_status: 'failed' })
        .eq('id', billRow.test_bill_id)
      return true
    }

    await supabase
      .from('provider_test_bills')
      .update({ upload_status: 'uploaded' })
      .eq('id', billRow.test_bill_id)
    return false
  } catch {
    try {
      await supabase
        .from('provider_test_bills')
        .update({ upload_status: 'failed' })
        .eq('id', billRow.test_bill_id)
    } catch {
      // Swallow.
    }
    return true
  }
}

// ---------------------------------------------------------------------------
// Email pipeline
// ---------------------------------------------------------------------------

/**
 * Send invite-code emails for every invitation the RPC flagged as needing
 * one. Non-fatal: failures log and increment the returned count, leaving
 * `invitations.status = 'pending'` so the landlord can retry from the
 * property page.
 *
 * DO NOT call `sendInvite` / `inviteTenantCore` — those insert a fresh
 * `invitations` row. The RPC already inserted the rows; we only send the
 * email and stamp `last_emailed_at`.
 */
async function sendInviteEmails(
  supabase: TypedSupabaseClient,
  userId: string,
  propertyId: string,
  invitationIds: string[],
): Promise<number> {
  if (invitationIds.length === 0) return 0

  // Single-trip landlord + property reads — reused across every send.
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
  const t = getEmailTranslations(locale)

  let failedCount = 0
  const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  for (const invitationId of invitationIds) {
    // Re-read the invitation row before sending: the 5-minute debounce
    // protects against double-sends from a tight replay loop, and the
    // status check skips rows the user already redeemed in another tab.
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, invited_email, invited_name, code, expires_at, status, last_emailed_at')
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

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: invitation.invited_email,
        replyTo: 'hello@mabenn.com',
        subject: t.tenantInvite.subject(propertyName),
        html: buildTenantInviteEmailHtml({
          tenantName: invitation.invited_name,
          landlordName,
          propertyName,
          addressHtml,
          locale,
          code: invitation.code ?? '',
          expiresAt:
            invitation.expires_at ??
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      await supabase
        .from('invitations')
        .update({ last_emailed_at: new Date().toISOString() })
        .eq('id', invitationId)
    } catch {
      // Non-fatal. The row stays `pending`; landlord retries from the
      // property page.
      failedCount += 1
    }
  }

  return failedCount
}

interface TenantInviteEmailParams {
  tenantName: string | null
  landlordName: string
  propertyName: string
  addressHtml: string
  locale: EmailLocale
  code: string
  expiresAt: string
}

function buildTenantInviteEmailHtml(params: TenantInviteEmailParams): string {
  const {
    tenantName,
    landlordName,
    propertyName,
    addressHtml,
    locale,
    code,
    expiresAt,
  } = params
  const t = getEmailTranslations(locale)
  const greeting = t.tenantInvite.greeting(tenantName)
  const intro = t.tenantInvite.intro(landlordName)
  const signUpUrl = `https://mabenn.com/auth/sign-up?code=${encodeURIComponent(code)}`
  const expiresDate = new Date(expiresAt).toLocaleDateString(
    locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' },
  )
  const displayAddress = addressHtml || propertyName

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;padding:0 24px">
    <tr><td>
      <img src="https://mabenn.com/brand/wordmark-light.png" alt="mabenn" height="28" style="display:block;margin:0 auto 32px" />
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;border-radius:16px">
        <tr><td style="padding:32px">
          <p style="font-size:16px;color:#52525b;line-height:1.5;margin:0 0 20px">${greeting} ${intro}</p>
          ${displayAddress ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
            <td style="width:3px;background:#14b8a6;border-radius:2px"></td>
            <td style="padding:8px 0 8px 16px"><p style="font-size:15px;font-weight:600;color:#18181b;margin:0;line-height:1.5">${displayAddress}</p></td>
          </tr></table>` : ''}
          <p style="font-size:15px;color:#71717a;line-height:1.5;margin:0 0 24px">${t.tenantInvite.valueProp}</p>
          <a href="${signUpUrl}" style="display:block;background:#14b8a6;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none">${t.tenantInvite.button}</a>
          <p style="font-size:13px;color:#a1a1aa;margin:12px 0 0;text-align:center">${t.tenantInvite.manualCode(code)}</p>
          <p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;text-align:center">${t.tenantInvite.expiresOn(expiresDate)}</p>
        </td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0" />
      <p style="font-size:14px;color:#a1a1aa;text-align:center;margin:0">${t.footer}</p>
    </td></tr>
  </table>
</body>
</html>`
}

// Re-export so callers in tests / Phase 4 have one import path.
export type { ServerErrorsResponse } from './server-errors'
export type SubmitErrorCode = SubmitGlobalErrorCode

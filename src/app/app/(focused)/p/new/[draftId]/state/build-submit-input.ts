/**
 * Projects the wizard's `PropertyCreationStateShape` into the
 * `SubmitInput` shape that `createProperty` expects. Drops wizard-only UI
 * fields (`id`, `isExtracted`, accordion / touched state), translates the
 * rent-dates `due_day → due_day_of_month` rename, normalizes `undefined`
 * sentinels to `null`, synthesizes the expense `name` / `currency` columns
 * from `expense_type` and the rent slice respectively, and omits sections
 * whose `sectionStates[id] === 'skipped'` per the action contract (skipped
 * sections are absent on the wire — see spec § Section Persistence Rules,
 * Rule 1).
 *
 * Lives in `state/` (not next to the action) because the projection is
 * tightly coupled to the wizard's slice shapes — section schemas and the
 * accordion's per-section UI types. The action keeps its eye on the wire
 * shape; this file owns the wizard → wire translation.
 */

import type { SubmitInput } from '@/data/properties/actions/create-property'
import { CONTRACT_MIME_TYPES } from '@/schemas/contract'
import type { ContractExtractionResult } from '@/lib/contract-extraction/types'

import type { ExpenseRow } from '../steps/checkout/sections/expenses/schemas'
import type { TaxIdInput } from '../steps/checkout/sections/tax-id/schemas'
import type { RentDatesInput } from '../steps/checkout/sections/rent-dates/schemas'
import type { TenantRow } from '../steps/checkout/sections/tenants/schemas'
import type { PropertyInput } from '@/schemas/property'
import type { PropertyCreationStateShape } from './store'

// Internal: synthesize a wizard-row currency from rent or the country
// default. Mirrors the same choice the action's `buildRpcPayload` makes for
// the `unit.currency` column — single fallback rule keeps unit currency
// and per-row expense currency aligned.
function rentOrDefaultCurrency(state: PropertyCreationStateShape): string {
  const rent = state.sectionData['rent-dates'] as RentDatesInput | undefined
  if (rent?.currency) return rent.currency
  const property = state.sectionData.property as PropertyInput | undefined
  return property?.country_code === 'US' ? 'USD' : 'BRL'
}

// Wizard tracks the file type as a closed union; map to its mime once.
// The extension is the same string as the union literal, so no parallel
// table is needed — inline `state.contractFileType ?? ''` at the call site.
const MIME_BY_CONTRACT_FILE_TYPE: Record<
  'pdf' | 'docx',
  (typeof CONTRACT_MIME_TYPES)[number]
> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function buildContractPayload(
  state: PropertyCreationStateShape,
): { contract: SubmitInput['contract']; contractFile: Blob | null } | null {
  if (state.path !== 'contract') return null
  const file = state.contractFile
  if (!file) return null
  const fileType = state.contractFileType
  const mime_type = fileType ? MIME_BY_CONTRACT_FILE_TYPE[fileType] : ''
  const extension = fileType ?? ''
  // The action's contract Zod schema needs flat `extraction_*` keys. The
  // wizard stores the engine's `ContractExtractionResult` shape (camelCase
  // fields). Translate here so the action sees the canonical wire shape.
  const extraction = state.extractionResult
    ? toFlatExtraction(state.extractionResult)
    : null
  return {
    contract: {
      mime_type: mime_type as (typeof CONTRACT_MIME_TYPES)[number],
      bytes: file.size,
      original_filename: state.contractFileName ?? '',
      extension,
      extraction,
    },
    contractFile: file,
  }
}

function toFlatExtraction(extraction: ContractExtractionResult) {
  return {
    extraction_data: extraction,
    extraction_language: extraction.languageDetected,
    extraction_model: extraction.modelId,
    extraction_schema_version: extraction.schemaVersion,
    raw_text: extraction.rawExtractedText,
    extracted_at: new Date().toISOString(),
  }
}

function buildRentPayload(
  state: PropertyCreationStateShape,
): SubmitInput['rent'] | undefined {
  if (state.sectionStates['rent-dates'] === 'skipped') return undefined
  const rent = state.sectionData['rent-dates'] as RentDatesInput | undefined
  if (!rent) return undefined
  // The action's rent schema requires `amount_minor`, `currency`, and
  // `due_day_of_month`. If any of the three is missing the caller is on
  // the no-contract path and the section is optional — only send rent
  // when the user filled the three required fields.
  if (
    rent.amount_minor === undefined ||
    rent.amount_minor === null ||
    rent.due_day === undefined ||
    rent.due_day === null
  ) {
    return undefined
  }
  return {
    amount_minor: rent.amount_minor,
    currency: rent.currency,
    due_day_of_month: rent.due_day,
    start_date: rent.start_date ?? null,
    end_date: rent.end_date ?? null,
    adjustment_frequency: null,
    adjustment_method: null,
    adjustment_index: null,
    adjustment_amount_minor: null,
    adjustment_basis_points: null,
    includes: null,
  }
}

function buildTenantsPayload(
  state: PropertyCreationStateShape,
): SubmitInput['tenants'] | undefined {
  if (state.sectionStates.tenants === 'skipped') return undefined
  const rows = (state.sectionData.tenants as TenantRow[] | undefined) ?? []
  if (rows.length === 0) return undefined
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    taxId: row.taxId,
    inviteNow: row.inviteNow,
  }))
}

function buildExpensesPayload(
  state: PropertyCreationStateShape,
): SubmitInput['expenses'] | undefined {
  if (state.sectionStates.expenses === 'skipped') return undefined
  const rows = (state.sectionData.expenses as ExpenseRow[] | undefined) ?? []
  if (rows.length === 0) return undefined
  const currency = rentOrDefaultCurrency(state)
  return rows.map((row) => {
    if (row.expense_type === null || row.amount_behavior === null) {
      // The row is intentionally invalid — preserve its id so the action's
      // per-form parse projects errors back to the same row the user was
      // editing. Both `expense_type` and `name` will surface as errors
      // against this row's id (`name` because the synthesized fallback
      // below is `''` when `expense_type` is null).
      return {
        id: row.id,
        name: row.expense_type ?? '',
        expense_type: row.expense_type as never,
        amount_behavior: row.amount_behavior as never,
        amount_minor: row.amount_minor ?? null,
        currency,
        provider_profile_id: null,
        provider_request_draft_index: null,
      }
    }
    return {
      id: row.id,
      // The wizard doesn't surface a "name" field today — derive it from
      // the canonical expense_type. The success summary surfaces the
      // type, not the name, so this is purely a persistence detail.
      name: row.expense_type,
      expense_type: row.expense_type,
      amount_behavior: row.amount_behavior,
      amount_minor: row.amount_minor ?? null,
      currency,
      provider_profile_id: null,
      provider_request_draft_index: null,
    }
  })
}

/**
 * Maps the wizard's persisted state to the action's `SubmitInput`.
 *
 * Per spec § Section Persistence Rules:
 *   - `property` and `tax_id` are always sent (required sections).
 *   - `rent`, `tenants`, `expenses` are omitted entirely when the
 *     corresponding section is in `'skipped'` state.
 *   - `bank` is never persisted (coming-soon).
 *   - `contract` is sent only on the contract path.
 */
export function buildSubmitInputFromStore(
  state: PropertyCreationStateShape,
  draftId: string,
): SubmitInput {
  const property = state.sectionData.property as PropertyInput | undefined
  const taxIdSlice = state.sectionData['tax-id'] as TaxIdInput | undefined

  const path = state.path ?? 'no_contract'

  const contractParts = buildContractPayload(state)

  const input: SubmitInput = {
    draftId,
    path,
    property: property ?? ({} as PropertyInput),
    tax_id: { tax_id: taxIdSlice?.tax_id ?? '' },
  }

  const rent = buildRentPayload(state)
  if (rent) input.rent = rent

  const tenants = buildTenantsPayload(state)
  if (tenants) input.tenants = tenants

  const expenses = buildExpensesPayload(state)
  if (expenses) input.expenses = expenses

  if (contractParts) {
    input.contract = contractParts.contract
    input.contractFile = contractParts.contractFile
  }

  // Wizard doesn't yet collect missing-provider drafts (the UI for that
  // hasn't shipped); the corresponding payload keys stay absent until that
  // section's row-level "I can't find my provider" flow lands. When that
  // ships, populate `provider_request_drafts` and `providerRequestBillFiles`
  // here from the section's row slices.

  return input
}

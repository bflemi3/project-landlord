import { anthropic } from '@ai-sdk/anthropic'
import { APICallError, generateObject } from 'ai'
import type { z } from 'zod'
import { detectLanguage } from './language-detection'
import { extractText, ExtractTextError, type ExtractTextErrorCode } from './extract-text'
import { getLanguagePrompt, systemPrompt } from './prompts'
import { contractExtractionLlmSchema } from './schema'
import type {
  ContractAddress,
  ContractExpense,
  ContractExtractionErrorCode,
  ContractExtractionInput,
  ContractExtractionLlmResult,
  ContractExtractionOptions,
  ContractExtractionResponse,
  ContractParty,
  ContractRent,
  ContractRentAdjustment,
  ExpenseBundledInto,
} from './types'

type LlmRaw = z.infer<typeof contractExtractionLlmSchema>

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_TIMEOUT_MS = 120_000

/**
 * Map extract-text's typed error codes onto the public extraction error set.
 * Currently 1:1 — kept explicit so drift in ExtractTextErrorCode fails loudly.
 */
const EXTRACT_TEXT_ERROR_MAP: Record<ExtractTextErrorCode, ContractExtractionErrorCode> = {
  empty_file: 'empty_file',
  unsupported_format: 'unsupported_format',
  corrupt_file: 'corrupt_file',
  password_protected: 'password_protected',
  no_text_extractable: 'no_text_extractable',
}

function errorResponse(code: ContractExtractionErrorCode): ContractExtractionResponse {
  return { success: false, error: { code } }
}

/**
 * Detect Anthropic-side rate limiting. The AI SDK surfaces it either as an
 * `APICallError` with statusCode 429, or any error whose status/message
 * indicates 429 (some fetch-layer errors don't round-trip through APICallError).
 */
function isRateLimitError(error: unknown): boolean {
  if (APICallError.isInstance(error) && error.statusCode === 429) return true
  if (error instanceof Error) {
    const maybeStatus = (error as { status?: unknown; statusCode?: unknown }).status
    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode
    if (maybeStatus === 429 || maybeStatusCode === 429) return true
    if (/\b429\b|rate[_-]?limit/i.test(error.message)) return true
  }
  return false
}

/**
 * Detect an abort (timeout). Both user-signaled aborts and the SDK's
 * AbortError land here — `AbortError` name or a DOMException with `ABORT_ERR`.
 */
function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'AbortError') return true
  if (error.name === 'TimeoutError') return true
  return false
}

// ---------------------------------------------------------------------------
// LLM output normalization
//
// The LLM-facing schema uses sentinel values ("" for absent strings, [] for
// absent arrays, "none" for a non-bundled expense) to stay under Anthropic's
// 16-parameter cap on union types. These helpers convert the sentinels back
// to null so callers see the documented `ContractExtractionLlmResult` shape.
// ---------------------------------------------------------------------------

function strOrNull(s: string): string | null {
  return s === '' ? null : s
}

function arrOrNull<T>(a: T[]): T[] | null {
  return a.length === 0 ? null : a
}

function normalizeAddress(raw: LlmRaw['address']): ContractAddress | null {
  const street = strOrNull(raw.street)
  const number = strOrNull(raw.number)
  const complement = strOrNull(raw.complement)
  const neighborhood = strOrNull(raw.neighborhood)
  const city = strOrNull(raw.city)
  const state = strOrNull(raw.state)
  const postalCode = strOrNull(raw.postalCode)
  const country = strOrNull(raw.country)
  const anyPopulated =
    street || number || complement || neighborhood || city || state || postalCode || country
  if (!anyPopulated) return null
  return { street, number, complement, neighborhood, city, state, postalCode, country }
}

function normalizeRent(raw: LlmRaw['rent']): ContractRent | null {
  const currency = strOrNull(raw.currency)
  // No amount AND no currency AND nothing else populated → treat as "LLM
  // couldn't find rent details at all" and return null.
  if (raw.amount === 0 && !currency && raw.dueDay == null && raw.includes.length === 0) {
    return null
  }
  return {
    amount: raw.amount,
    currency: currency ?? '',
    dueDay: raw.dueDay,
    includes: arrOrNull(raw.includes),
  }
}

function normalizeContractDates(raw: LlmRaw['contractDates']): { start: string; end: string } | null {
  const start = strOrNull(raw.start)
  const end = strOrNull(raw.end)
  if (!start && !end) return null
  return { start: start ?? '', end: end ?? '' }
}

function normalizeRentAdjustment(
  raw: LlmRaw['rentAdjustment'],
): ContractRentAdjustment | null {
  if (raw == null) return null
  return {
    date: strOrNull(raw.date),
    frequency: raw.frequency,
    method: raw.method,
    indexName: strOrNull(raw.indexName),
    value: raw.value,
  }
}

function normalizeParty(raw: LlmRaw['landlords'][number]): ContractParty | null {
  const name = strOrNull(raw.name)
  const taxId = strOrNull(raw.taxId)
  const email = strOrNull(raw.email)
  if (!name && !taxId && !email) return null
  return { name, taxId, email }
}

function normalizeParties(raw: LlmRaw['landlords']): ContractParty[] | null {
  const parties = raw.map(normalizeParty).filter((p): p is ContractParty => p != null)
  return arrOrNull(parties)
}

function normalizeExpense(raw: LlmRaw['expenses'][number]): ContractExpense | null {
  const providerName = strOrNull(raw.providerName)
  const providerTaxId = strOrNull(raw.providerTaxId)
  // "none" is the sentinel for "expense has its own dedicated bill".
  const bundledInto: ExpenseBundledInto = raw.bundledInto === 'none' ? null : raw.bundledInto
  if (raw.type == null && bundledInto == null && !providerName && !providerTaxId) {
    return null
  }
  return {
    type: raw.type,
    bundledInto,
    providerName,
    providerTaxId,
  }
}

function normalizeExpenses(raw: LlmRaw['expenses']): ContractExpense[] | null {
  const expenses = raw.map(normalizeExpense).filter((e): e is ContractExpense => e != null)
  return arrOrNull(expenses)
}

function normalizeLlmOutput(raw: LlmRaw): ContractExtractionLlmResult {
  // Non-contract short-circuit: every downstream field is discarded anyway,
  // but we normalize to null so the shape stays consistent.
  if (raw.isRentalContract === false) {
    return {
      isRentalContract: false,
      propertyType: null,
      address: null,
      rent: null,
      contractDates: null,
      rentAdjustment: null,
      landlords: null,
      tenants: null,
      expenses: null,
    }
  }
  return {
    isRentalContract: true,
    propertyType: raw.propertyType,
    address: normalizeAddress(raw.address),
    rent: normalizeRent(raw.rent),
    contractDates: normalizeContractDates(raw.contractDates),
    rentAdjustment: normalizeRentAdjustment(raw.rentAdjustment),
    landlords: normalizeParties(raw.landlords),
    tenants: normalizeParties(raw.tenants),
    expenses: normalizeExpenses(raw.expenses),
  }
}

/**
 * Extract structured data from a rental contract PDF/DOCX.
 *
 * Never throws. Every failure path returns a discriminated `{ success: false,
 * error: { code } }` response with one of `ContractExtractionErrorCode`.
 */
export async function extractContract(
  input: ContractExtractionInput,
  options?: ContractExtractionOptions,
): Promise<ContractExtractionResponse> {
  // Size guard runs before any parsing — never load a 500MB upload into pdf.js.
  if (input?.fileBuffer != null && input.fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return errorResponse('file_too_large')
  }

  // Empty/missing buffer — caught here so we don't confuse it with other
  // extractText failures (extractText also emits `empty_file`, but this short
  // circuits before the call).
  if (input?.fileBuffer == null || input.fileBuffer.byteLength === 0) {
    return errorResponse('empty_file')
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return errorResponse('api_key_missing')
  }

  // ------------------------------------------------------------------ text
  let rawText: string
  try {
    rawText = await extractText(input.fileBuffer)
  } catch (err) {
    if (err instanceof ExtractTextError) {
      return errorResponse(EXTRACT_TEXT_ERROR_MAP[err.code])
    }
    return errorResponse('extraction_failed')
  }

  // ------------------------------------------------------------------ lang
  const language = detectLanguage(rawText)
  if (language == null) {
    return errorResponse('unsupported_language')
  }

  // ------------------------------------------------------------------ prompt
  const languagePrompt = getLanguagePrompt(language)
  const combinedSystem = `${systemPrompt}\n\n${languagePrompt}`

  // ------------------------------------------------------------------ LLM
  const modelId = process.env.CONTRACT_EXTRACTION_MODEL || DEFAULT_MODEL
  const abortController = new AbortController()
  const timeoutHandle = setTimeout(() => abortController.abort(), DEFAULT_TIMEOUT_MS)

  let llmResult: ContractExtractionLlmResult
  let usage: Awaited<ReturnType<typeof generateObject>>['usage'] | undefined
  const startedAt = Date.now()
  try {
    const result = await generateObject({
      model: anthropic(modelId),
      schema: contractExtractionLlmSchema,
      // System as a SystemModelMessage so the anthropic ephemeral cache marker
      // attaches at message level — top-level `providerOptions` only sets
      // call-level flags, not per-message cache breakpoints.
      system: [
        {
          role: 'system',
          content: combinedSystem,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
      ],
      prompt: rawText,
      abortSignal: abortController.signal,
    })
    llmResult = normalizeLlmOutput(result.object)
    usage = result.usage
  } catch (err) {
    clearTimeout(timeoutHandle)
    if (isAbortError(err)) return errorResponse('extraction_timeout')
    if (isRateLimitError(err)) return errorResponse('rate_limited')
    return errorResponse('extraction_failed')
  }
  clearTimeout(timeoutHandle)

  if (options?.onTelemetry) {
    // Swallow callback errors — telemetry must never break extraction.
    try {
      options.onTelemetry({
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        cacheWriteTokens: usage?.inputTokenDetails?.cacheWriteTokens ?? 0,
        cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        modelId,
        language,
        durationMs: Date.now() - startedAt,
      })
    } catch {
      // intentionally ignored
    }
  }

  if (llmResult.isRentalContract === false) {
    return errorResponse('not_a_contract')
  }

  return {
    success: true,
    data: {
      ...llmResult,
      languageDetected: language,
      rawExtractedText: rawText,
    },
  }
}

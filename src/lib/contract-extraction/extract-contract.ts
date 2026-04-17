import { anthropic } from '@ai-sdk/anthropic'
import { APICallError, generateObject } from 'ai'
import { detectLanguage } from './language-detection'
import { extractText, ExtractTextError, type ExtractTextErrorCode } from './extract-text'
import { getLanguagePrompt, systemPrompt } from './prompts'
import { contractExtractionLlmSchema } from './schema'
import type {
  ContractExtractionErrorCode,
  ContractExtractionInput,
  ContractExtractionLlmResult,
  ContractExtractionResponse,
} from './types'

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

/**
 * Extract structured data from a rental contract PDF/DOCX.
 *
 * Never throws. Every failure path returns a discriminated `{ success: false,
 * error: { code } }` response with one of `ContractExtractionErrorCode`.
 */
export async function extractContract(
  input: ContractExtractionInput,
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
    llmResult = result.object
  } catch (err) {
    clearTimeout(timeoutHandle)
    if (isAbortError(err)) return errorResponse('extraction_timeout')
    if (isRateLimitError(err)) return errorResponse('rate_limited')
    return errorResponse('extraction_failed')
  }
  clearTimeout(timeoutHandle)

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

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — `vi.mock` is hoisted to the top of the file, so the mock functions
// themselves must be declared with `vi.hoisted` to be reachable from the
// factory bodies.
//
// We intercept generateObject so unit tests never hit the LLM, and mock
// extractText / detectLanguage so failure-path mapping can be driven directly
// (avoids needing fixture buffers for every error code).
// ---------------------------------------------------------------------------

const { generateObjectMock, extractTextMock, detectLanguageMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  extractTextMock: vi.fn<(buf: unknown) => Promise<string>>(),
  detectLanguageMock: vi.fn<(text: string | null | undefined) => 'pt-br' | 'en' | 'es' | null>(),
}))

// Re-export the real APICallError so tests can construct a typed 429 that the
// engine's isRateLimitError recognizes.
vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai')
  return {
    ...actual,
    generateObject: generateObjectMock,
  }
})

vi.mock('../extract-text', async () => {
  const actual = await vi.importActual<typeof import('../extract-text')>('../extract-text')
  return {
    ...actual,
    extractText: extractTextMock,
  }
})

vi.mock('../language-detection', () => ({
  detectLanguage: detectLanguageMock,
}))

// Import AFTER mocks so the SUT resolves against them.
import type { z } from 'zod'
import { APICallError } from 'ai'
import { extractContract } from '../extract-contract'
import { ExtractTextError } from '../extract-text'
import { enPrompt, esPrompt, ptBrPrompt, systemPrompt } from '../prompts'
import { contractExtractionLlmSchema } from '../schema'

// ---------------------------------------------------------------------------
// Helpers
//
// `validLlmRawOutput` produces a fixture matching the LLM-facing schema —
// sentinel values ("" for absent strings, [] for absent arrays, "none" for a
// non-bundled expense) rather than nulls. The engine normalizes sentinels
// back to null before returning, which the assertions below reflect.
// ---------------------------------------------------------------------------

type LlmRawOutput = z.infer<typeof contractExtractionLlmSchema>

function validLlmRawOutput(overrides: Partial<LlmRawOutput> = {}): LlmRawOutput {
  return {
    isRentalContract: true,
    propertyType: 'apartment',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: '',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01001-000',
      country: 'BR',
    },
    rent: { amount: 250000, currency: 'BRL', dueDay: 5, includes: [] },
    contractDates: { start: '2026-01-01', end: '2027-01-01' },
    rentAdjustment: {
      date: '2027-01-01',
      frequency: 'annual',
      method: 'index',
      indexName: 'IPCA',
      value: null,
    },
    landlords: [{ name: 'Maria Silva', taxId: '', email: '' }],
    tenants: [{ name: 'Joao Santos', taxId: '', email: '' }],
    expenses: [],
    ...overrides,
  }
}

/**
 * All-empty-sentinel version of a raw output — used to simulate the LLM
 * finding nothing for a particular top-level section. The engine collapses
 * these to null on the way out.
 */
const emptyAddress: LlmRawOutput['address'] = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}
const emptyRent: LlmRawOutput['rent'] = {
  amount: 0,
  currency: '',
  dueDay: null,
  includes: [],
}
const emptyContractDates: LlmRawOutput['contractDates'] = { start: '', end: '' }

/**
 * A minimal valid PDF buffer — `extractText` is mocked so the bytes don't
 * need to parse, but they must be non-empty so the pre-extractText empty
 * guard doesn't fire.
 */
function validBuffer(): Buffer {
  return Buffer.from('pdf-ish bytes that pass the empty check')
}

const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY
const ORIGINAL_MODEL = process.env.CONTRACT_EXTRACTION_MODEL

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  delete process.env.CONTRACT_EXTRACTION_MODEL
  // Default mocks — happy path. Individual tests override.
  extractTextMock.mockResolvedValue('Full extracted contract text goes here.')
  detectLanguageMock.mockReturnValue('pt-br')
  generateObjectMock.mockResolvedValue({ object: validLlmRawOutput() })
})

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY
  if (ORIGINAL_MODEL === undefined) {
    delete process.env.CONTRACT_EXTRACTION_MODEL
  } else {
    process.env.CONTRACT_EXTRACTION_MODEL = ORIGINAL_MODEL
  }
})

// ---------------------------------------------------------------------------
// Pipeline flow
// ---------------------------------------------------------------------------

describe('extractContract — pipeline', () => {
  it('extracts text, detects language, picks the prompt, calls generateObject, returns typed result', async () => {
    extractTextMock.mockResolvedValue('Some extracted contract text')
    detectLanguageMock.mockReturnValue('pt-br')

    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })

    expect(response.success).toBe(true)
    if (!response.success) return

    expect(extractTextMock).toHaveBeenCalledTimes(1)
    expect(detectLanguageMock).toHaveBeenCalledWith('Some extracted contract text')
    expect(generateObjectMock).toHaveBeenCalledTimes(1)

    const args = generateObjectMock.mock.calls[0][0] as {
      system: Array<{ role: string; content: string; providerOptions?: unknown }>
      prompt: string
      schema: unknown
      abortSignal?: AbortSignal
    }

    // Prompt = extracted text (unique per call — this is the uncached part).
    expect(args.prompt).toBe('Some extracted contract text')
    // System is a SystemModelMessage array with both the shared + language prompts.
    expect(Array.isArray(args.system)).toBe(true)
    expect(args.system[0].role).toBe('system')
    expect(args.system[0].content).toContain(systemPrompt)
    expect(args.system[0].content).toContain(ptBrPrompt)
    // Schema is wired through.
    expect(args.schema).toBeDefined()

    // Engine-produced fields are populated on the way back.
    expect(response.data.languageDetected).toBe('pt-br')
    expect(response.data.rawExtractedText).toBe('Some extracted contract text')
    expect(response.data.isRentalContract).toBe(true)
  })

  it('attaches Anthropic cacheControl on the system message for prompt caching', async () => {
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })

    const args = generateObjectMock.mock.calls[0][0] as {
      system: Array<{ providerOptions?: { anthropic?: { cacheControl?: { type: string } } } }>
    }
    expect(args.system[0].providerOptions?.anthropic?.cacheControl).toEqual({ type: 'ephemeral' })
  })

  it('passes an abort signal for timeout handling', async () => {
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    const args = generateObjectMock.mock.calls[0][0] as { abortSignal?: AbortSignal }
    expect(args.abortSignal).toBeInstanceOf(AbortSignal)
  })
})

// ---------------------------------------------------------------------------
// Prompt selection by language
// ---------------------------------------------------------------------------

describe('extractContract — prompt selection', () => {
  it.each([
    ['pt-br', ptBrPrompt],
    ['en', enPrompt],
    ['es', esPrompt],
  ] as const)('uses the %s prompt when language is %s', async (language, expectedPrompt) => {
    detectLanguageMock.mockReturnValue(language)
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    const args = generateObjectMock.mock.calls[0][0] as {
      system: Array<{ content: string }>
    }
    expect(args.system[0].content).toContain(expectedPrompt)
  })
})

// ---------------------------------------------------------------------------
// Happy-path output shape (partial results, bundled rent, rawText)
// ---------------------------------------------------------------------------

describe('extractContract — result shape', () => {
  it('collapses all-sentinel LLM output back to null fields', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput({
        address: emptyAddress,
        rent: emptyRent,
        contractDates: emptyContractDates,
        rentAdjustment: null,
        landlords: [],
        tenants: [],
        expenses: [],
      }),
    })

    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response.success).toBe(true)
    if (!response.success) return
    expect(response.data.address).toBeNull()
    expect(response.data.rent).toBeNull()
    expect(response.data.contractDates).toBeNull()
    expect(response.data.rentAdjustment).toBeNull()
    expect(response.data.landlords).toBeNull()
    expect(response.data.tenants).toBeNull()
    expect(response.data.expenses).toBeNull()
  })

  it('round-trips bundled rent `includes` array', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput({
        rent: { amount: 630000, currency: 'BRL', dueDay: 5, includes: ['rent', 'condo', 'IPTU'] },
      }),
    })

    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response.success).toBe(true)
    if (!response.success) return
    expect(response.data.rent?.includes).toEqual(['rent', 'condo', 'IPTU'])
    expect(response.data.rent?.amount).toBe(630000)
  })

  it('populates rawExtractedText with the full extracted document text', async () => {
    const fullText = 'A'.repeat(5_000) + ' some phrase in the middle ' + 'B'.repeat(5_000)
    extractTextMock.mockResolvedValue(fullText)

    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response.success).toBe(true)
    if (!response.success) return
    expect(response.data.rawExtractedText).toBe(fullText)
    expect(response.data.rawExtractedText).toContain('some phrase in the middle')
  })

  it('returns success response shape with data', async () => {
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toMatchObject({ success: true, data: expect.any(Object) })
  })

  it('uses CONTRACT_EXTRACTION_MODEL env var when set', async () => {
    process.env.CONTRACT_EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    // The anthropic provider constructs a model from the id; the call's
    // `model` field is a LanguageModel instance, so verify modelId on it.
    const args = generateObjectMock.mock.calls[0][0] as { model: { modelId?: string } }
    expect(args.model.modelId).toBe('claude-haiku-4-5-20251001')
  })

  it('defaults to claude-sonnet-4-6 when the env var is unset', async () => {
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    const args = generateObjectMock.mock.calls[0][0] as { model: { modelId?: string } }
    expect(args.model.modelId).toBe('claude-sonnet-4-6')
  })
})

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

describe('extractContract — telemetry', () => {
  it('invokes onTelemetry with the usage breakdown on success', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput(),
      usage: {
        inputTokens: 4200,
        outputTokens: 550,
        inputTokenDetails: {
          noCacheTokens: 400,
          cacheWriteTokens: 3800,
          cacheReadTokens: 0,
        },
      },
    })
    const calls: unknown[] = []
    await extractContract(
      { fileBuffer: validBuffer(), fileType: 'pdf' },
      { onTelemetry: (t) => calls.push(t) },
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      inputTokens: 4200,
      outputTokens: 550,
      cacheWriteTokens: 3800,
      cacheReadTokens: 0,
      modelId: 'claude-sonnet-4-6',
      language: 'pt-br',
    })
    // durationMs is time-sensitive — just assert it's a finite non-negative number.
    expect((calls[0] as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0)
  })

  it('does not fire onTelemetry on error paths', async () => {
    generateObjectMock.mockRejectedValue(new Error('boom'))
    const calls: unknown[] = []
    const response = await extractContract(
      { fileBuffer: validBuffer(), fileType: 'pdf' },
      { onTelemetry: (t) => calls.push(t) },
    )
    expect(response.success).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('swallows onTelemetry callback errors so they cannot break extraction', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput(),
      usage: { inputTokens: 100, outputTokens: 50, inputTokenDetails: {} },
    })
    const response = await extractContract(
      { fileBuffer: validBuffer(), fileType: 'pdf' },
      {
        onTelemetry: () => {
          throw new Error('telemetry sink is down')
        },
      },
    )
    expect(response.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

describe('extractContract — telemetry', () => {
  it('invokes onTelemetry with usage, cache breakdown, model, language, and duration on success', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput(),
      usage: {
        inputTokens: 3800,
        outputTokens: 450,
        inputTokenDetails: {
          noCacheTokens: 200,
          cacheReadTokens: 0,
          cacheWriteTokens: 3600,
        },
      },
    })
    detectLanguageMock.mockReturnValue('pt-br')

    const onTelemetry = vi.fn()
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' }, { onTelemetry })

    expect(onTelemetry).toHaveBeenCalledTimes(1)
    const payload = onTelemetry.mock.calls[0][0]
    expect(payload).toMatchObject({
      inputTokens: 3800,
      outputTokens: 450,
      cacheWriteTokens: 3600,
      cacheReadTokens: 0,
      modelId: 'claude-sonnet-4-6',
      language: 'pt-br',
    })
    expect(typeof payload.durationMs).toBe('number')
    expect(payload.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('does not throw if the callback throws', async () => {
    const onTelemetry = vi.fn(() => {
      throw new Error('boom')
    })
    const response = await extractContract(
      { fileBuffer: validBuffer(), fileType: 'pdf' },
      { onTelemetry },
    )
    expect(response.success).toBe(true)
  })

  it('does not invoke onTelemetry on error paths', async () => {
    extractTextMock.mockRejectedValue(new ExtractTextError('corrupt_file'))
    const onTelemetry = vi.fn()
    await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' }, { onTelemetry })
    expect(onTelemetry).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Error-code mapping
// ---------------------------------------------------------------------------

describe('extractContract — error mapping', () => {
  it('returns file_too_large for buffers > 10MB before any parsing', async () => {
    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1)
    const response = await extractContract({ fileBuffer: tooLarge, fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'file_too_large' } })
    // No downstream calls when the size guard trips.
    expect(extractTextMock).not.toHaveBeenCalled()
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('returns empty_file for a zero-byte buffer', async () => {
    const response = await extractContract({ fileBuffer: Buffer.alloc(0), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'empty_file' } })
    expect(extractTextMock).not.toHaveBeenCalled()
  })

  it('returns empty_file for a null buffer', async () => {
    const response = await extractContract({
      fileBuffer: null as unknown as Buffer,
      fileType: 'pdf',
    })
    expect(response).toEqual({ success: false, error: { code: 'empty_file' } })
  })

  it('returns api_key_missing when ANTHROPIC_API_KEY is empty', async () => {
    process.env.ANTHROPIC_API_KEY = ''
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'api_key_missing' } })
    expect(extractTextMock).not.toHaveBeenCalled()
  })

  it('returns api_key_missing when ANTHROPIC_API_KEY is whitespace', async () => {
    process.env.ANTHROPIC_API_KEY = '   '
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'api_key_missing' } })
  })

  it('returns api_key_missing when ANTHROPIC_API_KEY is unset', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'api_key_missing' } })
  })

  it.each([
    'unsupported_format',
    'corrupt_file',
    'no_text_extractable',
    'password_protected',
    'empty_file',
  ] as const)('maps extractText %s error to the same error code', async (code) => {
    extractTextMock.mockRejectedValue(new ExtractTextError(code))
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code } })
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('returns unsupported_language when detectLanguage returns null', async () => {
    detectLanguageMock.mockReturnValue(null)
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'unsupported_language' } })
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('returns not_a_contract when the LLM returns isRentalContract: false', async () => {
    generateObjectMock.mockResolvedValue({
      object: validLlmRawOutput({
        isRentalContract: false,
        propertyType: null,
        address: emptyAddress,
        rent: emptyRent,
        contractDates: emptyContractDates,
        rentAdjustment: null,
        landlords: [],
        tenants: [],
        expenses: [],
      }),
    })
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'not_a_contract' } })
  })

  it('returns extraction_failed when generateObject throws a generic Error', async () => {
    generateObjectMock.mockRejectedValue(new Error('network blew up'))
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'extraction_failed' } })
  })

  it('returns extraction_timeout when the call is aborted', async () => {
    generateObjectMock.mockImplementation(() => {
      const abortErr = new Error('aborted')
      abortErr.name = 'AbortError'
      return Promise.reject(abortErr)
    })
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'extraction_timeout' } })
  })

  it('returns rate_limited when generateObject throws an APICallError with 429', async () => {
    generateObjectMock.mockRejectedValue(
      new APICallError({
        message: 'rate limit exceeded',
        url: 'https://api.anthropic.com/v1/messages',
        requestBodyValues: {},
        statusCode: 429,
        isRetryable: false,
      }),
    )
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'rate_limited' } })
  })

  it('returns rate_limited when error message signals rate limiting', async () => {
    const err = new Error('Request failed: rate_limit_error (429)')
    generateObjectMock.mockRejectedValue(err)
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response).toEqual({ success: false, error: { code: 'rate_limited' } })
  })
})

// ---------------------------------------------------------------------------
// Response shape invariants
// ---------------------------------------------------------------------------

describe('extractContract — response shape invariants', () => {
  it('success response is exactly { success: true, data }', async () => {
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response.success).toBe(true)
    if (!response.success) return
    expect(Object.keys(response).sort()).toEqual(['data', 'success'])
  })

  it('error response is exactly { success: false, error: { code } }', async () => {
    process.env.ANTHROPIC_API_KEY = ''
    const response = await extractContract({ fileBuffer: validBuffer(), fileType: 'pdf' })
    expect(response.success).toBe(false)
    if (response.success) return
    expect(Object.keys(response).sort()).toEqual(['error', 'success'])
    expect(Object.keys(response.error)).toEqual(['code'])
    expect(typeof response.error.code).toBe('string')
  })
})

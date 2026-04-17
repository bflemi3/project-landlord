# Billing Intelligence Foundation — Plan 1b: Utilities

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared utility layer — normalization, external dependency monitoring, PDF extraction, and confidence scoring.

**Architecture:** Pure functions with tests. No DB dependencies. No provider-specific logic. These utilities are consumed by providers (Plan 1c) and the orchestration layer.

**Tech Stack:** TypeScript, Vitest, pdf-parse

**Part of:** Billing Intelligence Foundation (Plan 1)
**Depends on:** Plan 1a (shared types in `src/lib/billing-intelligence/types.ts`)
**Blocks:** Plan 1c (provider system uses these utilities)

**Key files from Plan 1a that this plan imports:**
- `src/lib/billing-intelligence/types.ts` — `BillExtractionConfidence`, `BillExtractionSource`, `FieldConfidence`, `FieldStatus`

---
## Task 6: Date and money normalization utilities

**Files:**
- Create: `src/lib/billing-intelligence/normalize.ts`
- Create: `src/lib/billing-intelligence/__tests__/normalize.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/billing-intelligence/__tests__/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  normalizeDate,
  normalizeMonth,
  normalizeBarcode,
  parseBRL,
  toMinorUnits,
} from '../normalize'

describe('normalizeDate', () => {
  it('normalizes BR format DD/MM/YYYY', () => {
    expect(normalizeDate('24/04/2026')).toBe('2026-04-24')
  })

  it('normalizes ISO with time', () => {
    expect(normalizeDate('2026-04-24T19:33:21.923Z')).toBe('2026-04-24')
  })

  it('passes through YYYY-MM-DD', () => {
    expect(normalizeDate('2026-04-24')).toBe('2026-04-24')
  })
})

describe('normalizeMonth', () => {
  it('normalizes MAR/2026 to YYYY-MM', () => {
    expect(normalizeMonth('MAR/2026')).toBe('2026-03')
  })

  it('normalizes ABR/2026', () => {
    expect(normalizeMonth('ABR/2026')).toBe('2026-04')
  })

  it('normalizes JAN/2026', () => {
    expect(normalizeMonth('JAN/2026')).toBe('2026-01')
  })

  it('normalizes DEZ/2026', () => {
    expect(normalizeMonth('DEZ/2026')).toBe('2026-12')
  })

  it('passes through YYYY-MM', () => {
    expect(normalizeMonth('2026-03')).toBe('2026-03')
  })

  // English
  it('normalizes FEB/2026 (English)', () => {
    expect(normalizeMonth('FEB/2026')).toBe('2026-02')
  })

  it('normalizes APR/2026 (English)', () => {
    expect(normalizeMonth('APR/2026')).toBe('2026-04')
  })

  it('normalizes SEP/2026 (English)', () => {
    expect(normalizeMonth('SEP/2026')).toBe('2026-09')
  })

  it('normalizes DEC/2026 (English)', () => {
    expect(normalizeMonth('DEC/2026')).toBe('2026-12')
  })

  // Spanish
  it('normalizes ENE/2026 (Spanish)', () => {
    expect(normalizeMonth('ENE/2026')).toBe('2026-01')
  })

  it('normalizes DIC/2026 (Spanish)', () => {
    expect(normalizeMonth('DIC/2026')).toBe('2026-12')
  })

  // Shared across languages
  it('normalizes JAN/2026 (shared PT/EN)', () => {
    expect(normalizeMonth('JAN/2026')).toBe('2026-01')
  })

  it('normalizes MAR/2026 (shared PT/EN/ES)', () => {
    expect(normalizeMonth('MAR/2026')).toBe('2026-03')
  })
})

describe('normalizeBarcode', () => {
  it('strips spaces, dots, and dashes', () => {
    expect(normalizeBarcode('74891.16009 06660.307304 32263.871033 5 14260000021847'))
      .toBe('74891160090666030730432263871033514260000021847')
  })
})

describe('parseBRL', () => {
  it('parses simple amount', () => {
    expect(parseBRL('218,47')).toBe(218.47)
  })

  it('parses amount with thousands separator', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56)
  })

  it('parses zero', () => {
    expect(parseBRL('0,00')).toBe(0)
  })
})

describe('toMinorUnits', () => {
  it('converts BRL to centavos', () => {
    expect(toMinorUnits(218.47)).toBe(21847)
  })

  it('handles round numbers', () => {
    expect(toMinorUnits(100)).toBe(10000)
  })

  it('rounds floating point correctly', () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/lib/billing-intelligence/__tests__/normalize.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/billing-intelligence/normalize.ts`:

```typescript
export function normalizeDate(date: string): string {
  if (date.includes('T')) return date.split('T')[0]
  const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  return date
}

/**
 * Month abbreviation → number mapping.
 * Supports Portuguese (PT-BR), English (EN), and Spanish (ES).
 * Duplicate abbreviations (JAN, MAR, JUL, etc.) are shared across languages.
 */
const MONTH_ABBREVS: Record<string, string> = {
  // Portuguese
  JAN: '01', FEV: '02', MAR: '03', ABR: '04',
  MAI: '05', JUN: '06', JUL: '07', AGO: '08',
  SET: '09', OUT: '10', NOV: '11', DEZ: '12',
  // English (unique ones not already covered by PT)
  FEB: '02', APR: '04', MAY: '05', AUG: '08',
  SEP: '09', OCT: '10', DEC: '12',
  // Spanish (unique ones not already covered by PT or EN)
  ENE: '01', DIC: '12',
}

export function normalizeMonth(month: string): string {
  const match = month.match(/^([A-Z]{3})\/(\d{4})$/)
  if (match) {
    const monthNum = MONTH_ABBREVS[match[1]]
    if (monthNum) return `${match[2]}-${monthNum}`
  }
  return month
}

export function normalizeBarcode(barcode: string): string {
  return barcode.replace(/[\s.\-]/g, '')
}

export function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'))
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test src/lib/billing-intelligence/__tests__/normalize.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/normalize.ts src/lib/billing-intelligence/__tests__/normalize.test.ts
git commit -m "feat: add date, month, barcode, and money normalization utilities"
```

---

## Task 7: External dependency monitor

**Files:**
- Create: `src/lib/external/types.ts`
- Create: `src/lib/external/call.ts`
- Create: `src/lib/external/__tests__/call.test.ts`

This is a cross-cutting concern. Every external network call (APIs, web scrapes, any dependency) goes through this wrapper. It monitors, captures errors, normalizes them, and reports — so the rest of the codebase doesn't need to handle external failure detection individually.

**Prerequisites:** Verify that `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local`. This env var is needed by `logCall` to write to the `external_call_log` table via service role. Check with: `grep SUPABASE_SERVICE_ROLE_KEY .env.local`. If missing, get the value from the Supabase dashboard (Project Settings → API → service_role key) and add it.

- [ ] **Step 1: Create types**

Create `src/lib/external/types.ts`:

```typescript
/**
 * Normalized result from any external dependency call.
 * Every external call returns this shape, regardless of the service.
 */
export interface ExternalCallResult<T> {
  success: boolean
  data?: T
  error?: ExternalCallError
  /** Time taken in milliseconds */
  duration: number
  service: string
  operation: string
  timestamp: string           // ISO 8601
}

export interface ExternalCallError {
  /** Normalized error category */
  category: 'timeout' | 'network' | 'client_error' | 'server_error' | 'unexpected_shape' | 'unknown'
  /** HTTP status code if applicable */
  statusCode?: number
  /** Original error message */
  message: string
  /** The service and operation that failed */
  service: string
  operation: string
}

export interface ExternalCallOptions {
  /** Which external service (e.g., 'brasilapi', 'receitaws', 'enliv-api') */
  service: string
  /** What operation (e.g., 'cnpj-lookup', 'fetch-debitos') */
  operation: string
  /** The async function to execute */
  fn: () => Promise<unknown>
}

export interface ExternalFetchOptions {
  /** Which external service (e.g., 'brasilapi', 'receitaws', 'enliv-api') */
  service: string
  /** What operation (e.g., 'cnpj-lookup', 'fetch-debitos') */
  operation: string
  /** The URL to fetch */
  url: string
  /** Optional fetch init (method, headers, body, etc.) */
  init?: RequestInit
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number
  /** Optional: validate the response shape. Return true if valid. */
  validateShape?: (data: unknown) => boolean
}
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/external/__tests__/call.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { externalCall, externalFetch } from '../call'

// Mock Supabase so logCall doesn't require a real DB connection in tests
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

describe('externalCall', () => {
  it('returns success with data and duration', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => ({ value: 42 }),
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ value: 42 })
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.service).toBe('test-service')
    expect(result.operation).toBe('test-op')
    expect(result.timestamp).toBeDefined()
  })

  it('captures and normalizes errors', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => { throw new Error('connection refused') },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error!.category).toBe('unknown')
    expect(result.error!.message).toBe('connection refused')
    expect(result.error!.service).toBe('test-service')
    expect(result.error!.operation).toBe('test-op')
  })

  it('tracks duration even on failure', async () => {
    const result = await externalCall({
      service: 'test-service',
      operation: 'test-op',
      fn: async () => { throw new Error('fail') },
    })

    expect(result.duration).toBeGreaterThanOrEqual(0)
  })
})

describe('externalFetch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns parsed JSON on 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'test' }), { status: 200 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'test' })
  })

  it('categorizes 4xx as client_error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not found', { status: 404 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('client_error')
    expect(result.error!.statusCode).toBe(404)
  })

  it('categorizes 5xx as server_error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal error', { status: 500 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('server_error')
    expect(result.error!.statusCode).toBe(500)
  })

  it('categorizes network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('fetch failed'),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('network')
  })

  it('detects unexpected response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    )

    const result = await externalFetch({
      service: 'test-api',
      operation: 'get-data',
      url: 'https://example.com/api',
      validateShape: (data: unknown) => {
        const d = data as Record<string, unknown>
        return 'name' in d
      },
    })

    expect(result.success).toBe(false)
    expect(result.error!.category).toBe('unexpected_shape')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test src/lib/external/__tests__/call.test.ts
```

- [ ] **Step 4: Implement**

Create `src/lib/external/call.ts`:

```typescript
import type { ExternalCallResult, ExternalCallError, ExternalCallOptions, ExternalFetchOptions } from './types'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Wrap any async function as a monitored external call.
 * Captures duration, normalizes errors, logs to DB, and provides a uniform result shape.
 *
 * Usage:
 *   const result = await externalCall({
 *     service: 'brasilapi',
 *     operation: 'cnpj-lookup',
 *     fn: async () => fetchSomething(),
 *   })
 */
export async function externalCall<T>(options: ExternalCallOptions & { fn: () => Promise<T> }): Promise<ExternalCallResult<T>> {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const data = await options.fn()
    const duration = Date.now() - start
    logCall({ service: options.service, operation: options.operation, success: true, duration })
    return {
      success: true,
      data,
      duration,
      service: options.service,
      operation: options.operation,
      timestamp,
    }
  } catch (err) {
    const duration = Date.now() - start
    const error = normalizeError(err, options.service, options.operation)
    logCall({ service: options.service, operation: options.operation, success: false, duration, error })
    return {
      success: false,
      error,
      duration,
      service: options.service,
      operation: options.operation,
      timestamp,
    }
  }
}

/**
 * Convenience wrapper for external fetch calls.
 * Handles HTTP status categorization, JSON parsing, and optional shape validation.
 */
export async function externalFetch<T = unknown>(options: ExternalFetchOptions): Promise<ExternalCallResult<T>> {
  return externalCall<T>({
    service: options.service,
    operation: options.operation,
    fn: async () => {
      const controller = new AbortController()
      const timeoutMs = options.timeout ?? 10000
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(options.url, {
          ...options.init,
          signal: controller.signal,
        })

        if (!response.ok) {
          const category = response.status >= 500 ? 'server_error' : 'client_error'
          const error: ExternalCallError = {
            category,
            statusCode: response.status,
            message: `${options.service} returned ${response.status}`,
            service: options.service,
            operation: options.operation,
          }
          throw Object.assign(new Error(error.message), { __externalError: error })
        }

        const data = await response.json()

        if (options.validateShape && !options.validateShape(data)) {
          const error: ExternalCallError = {
            category: 'unexpected_shape',
            message: `${options.service} returned an unexpected response shape`,
            service: options.service,
            operation: options.operation,
          }
          throw Object.assign(new Error(error.message), { __externalError: error })
        }

        return data as T
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}

function normalizeError(err: unknown, service: string, operation: string): ExternalCallError {
  // If it's already a normalized error from externalFetch
  if (err && typeof err === 'object' && '__externalError' in err) {
    return (err as { __externalError: ExternalCallError }).__externalError
  }

  // Abort errors (timeout)
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { category: 'timeout', message: `${service} request timed out`, service, operation }
  }

  // Network errors (TypeError: fetch failed)
  if (err instanceof TypeError) {
    return { category: 'network', message: err.message, service, operation }
  }

  // Generic errors
  if (err instanceof Error) {
    return { category: 'unknown', message: err.message, service, operation }
  }

  return { category: 'unknown', message: String(err), service, operation }
}

/**
 * Log an external call (success or failure) to the external_call_log table.
 * Fire-and-forget — logging failures should not break the calling code.
 */
function logCall(entry: {
  service: string
  operation: string
  success: boolean
  duration: number
  error?: ExternalCallError
}): void {
  const supabase = getServiceClient()
  supabase
    .from('external_call_log')
    .insert({
      service: entry.service,
      operation: entry.operation,
      success: entry.success,
      duration_ms: entry.duration,
      error_category: entry.error?.category ?? null,
      error_message: entry.error?.message ?? null,
      status_code: entry.error?.statusCode ?? null,
    })
    .then(({ error }) => {
      if (error) console.error('[external_call_log] Failed to log:', error.message)
    })
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test src/lib/external/__tests__/call.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/external/
git commit -m "feat: add external dependency monitor with error normalization"
```

---

## Task 8: PDF text extraction utility

**Files:**
- Create: `src/lib/billing-intelligence/extraction/pdf.ts`
- Create: `src/lib/billing-intelligence/extraction/__tests__/pdf.test.ts`

- [ ] **Step 1: Create the utility**

Create `src/lib/billing-intelligence/extraction/pdf.ts`:

```typescript
import { PDFParse } from 'pdf-parse'

/**
 * Extract raw text from a PDF buffer.
 * Returns concatenated text from all pages.
 * Provider parsers receive text, not PDF buffers.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(buffer)
  const parser = new PDFParse(uint8)
  const result = await parser.getText()
  return result.pages.map((p: { text: string }) => p.text).join('\n')
}
```

- [ ] **Step 2: Write test**

Create `src/lib/billing-intelligence/extraction/__tests__/pdf.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { extractTextFromPdf } from '../pdf'

// Mock pdf-parse since we can't load real PDFs in unit tests
vi.mock('pdf-parse', () => ({
  PDFParse: class {
    constructor(_data: Uint8Array) {}
    async getText() {
      return {
        pages: [
          { text: 'Page 1 content' },
          { text: 'Page 2 content' },
        ],
      }
    }
  },
}))

describe('extractTextFromPdf', () => {
  it('returns concatenated text from all pages', async () => {
    const buffer = new ArrayBuffer(8)
    const result = await extractTextFromPdf(buffer)
    expect(result).toBe('Page 1 content\nPage 2 content')
  })

  it('returns string type', async () => {
    const buffer = new ArrayBuffer(8)
    const result = await extractTextFromPdf(buffer)
    expect(typeof result).toBe('string')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/lib/billing-intelligence/extraction/__tests__/pdf.test.ts
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing-intelligence/extraction/
git commit -m "feat: add PDF text extraction utility with tests"
```

---

## Task 9: Extraction confidence utility

**Files:**
- Create: `src/lib/billing-intelligence/confidence.ts`
- Create: `src/lib/billing-intelligence/__tests__/confidence.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/billing-intelligence/__tests__/confidence.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  computeFieldStatus,
  getSourceMethodScore,
  buildBillExtractionConfidence,
} from '../confidence'

describe('getSourceMethodScore', () => {
  it('scores API highest', () => {
    expect(getSourceMethodScore('api')).toBe(0.95)
  })

  it('scores DDA high', () => {
    expect(getSourceMethodScore('dda')).toBe(0.90)
  })

  it('scores PDF at 0.80', () => {
    expect(getSourceMethodScore('pdf')).toBe(0.80)
  })

  it('scores web-scrape at 0.70', () => {
    expect(getSourceMethodScore('web-scrape')).toBe(0.70)
  })

  it('scores email at 0.65', () => {
    expect(getSourceMethodScore('email')).toBe(0.65)
  })

  it('scores OCR lowest', () => {
    expect(getSourceMethodScore('ocr')).toBe(0.50)
  })

  it('defaults unknown source to 0.50', () => {
    expect(getSourceMethodScore('unknown' as any)).toBe(0.50)
  })
})

describe('computeFieldStatus', () => {
  it('confirmed: high extraction + validated', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: 1.0 }))
      .toBe('confirmed')
  })

  it('high: high extraction, no validation', () => {
    expect(computeFieldStatus({ extraction: 0.95 }))
      .toBe('high')
  })

  it('needs-review: medium extraction', () => {
    expect(computeFieldStatus({ extraction: 0.7 }))
      .toBe('needs-review')
  })

  it('needs-review: high extraction but validation discrepancy', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: 0.0 }))
      .toBe('needs-review')
  })

  it('needs-review: validated but extraction is medium', () => {
    expect(computeFieldStatus({ extraction: 0.7, validation: 1.0 }))
      .toBe('needs-review')
  })

  it('failed: low extraction', () => {
    expect(computeFieldStatus({ extraction: 0.3 }))
      .toBe('failed')
  })

  it('failed: field not found (extraction = 0)', () => {
    expect(computeFieldStatus({ extraction: 0 }))
      .toBe('failed')
  })

  // Boundary tests
  it('boundary: extraction exactly 0.9 is high (no validation)', () => {
    expect(computeFieldStatus({ extraction: 0.9 }))
      .toBe('high')
  })

  it('boundary: extraction exactly 0.5 is needs-review', () => {
    expect(computeFieldStatus({ extraction: 0.5 }))
      .toBe('needs-review')
  })

  it('boundary: extraction 0.49 is failed', () => {
    expect(computeFieldStatus({ extraction: 0.49 }))
      .toBe('failed')
  })

  it('boundary: validation exactly 0.9 + high extraction is confirmed', () => {
    expect(computeFieldStatus({ extraction: 0.9, validation: 0.9 }))
      .toBe('confirmed')
  })

  it('boundary: validation 0.5 + high extraction is high (not discrepancy)', () => {
    // validation >= 0.5 does not trigger discrepancy, but < 0.9 so not confirmed → high
    expect(computeFieldStatus({ extraction: 0.95, validation: 0.5 }))
      .toBe('high')
  })

  it('boundary: validation 0.49 forces needs-review regardless of extraction', () => {
    expect(computeFieldStatus({ extraction: 0.99, validation: 0.49 }))
      .toBe('needs-review')
  })

  it('validation undefined treated same as omitted', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: undefined }))
      .toBe('high')
  })

  it('medium extraction + medium validation is needs-review', () => {
    // extraction < 0.9 → needs-review regardless of validation
    expect(computeFieldStatus({ extraction: 0.7, validation: 0.7 }))
      .toBe('needs-review')
  })
})

describe('buildBillExtractionConfidence', () => {
  it('builds confidence with all fields found via PDF', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true },
        dueDate: { found: true },
        accountNumber: { found: true },
      },
    })

    expect(result.source.method).toBe('pdf')
    expect(result.source.methodScore).toBe(0.80)
    expect(result.fields.amountDue.extraction).toBe(0.80)
    expect(result.fields.amountDue.status).toBe('high')
    expect(result.summary.totalFields).toBe(3)
    expect(result.summary.high).toBe(3)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('builds confidence with missing fields', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true },
        dueDate: { found: false },
      },
    })

    expect(result.fields.amountDue.status).toBe('high')
    expect(result.fields.dueDate.extraction).toBe(0)
    expect(result.fields.dueDate.status).toBe('failed')
    expect(result.summary.failed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('builds confidence with validation results', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'api' },
        dueDate: { found: true, validation: 0.0, validationSource: 'api' },
      },
    })

    expect(result.fields.amountDue.status).toBe('confirmed')
    expect(result.fields.amountDue.validationSource).toBe('api')
    expect(result.fields.dueDate.status).toBe('needs-review')
    expect(result.summary.confirmed).toBe(1)
    expect(result.summary.needsReview).toBe(1)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('API source produces higher extraction confidence', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true },
      },
    })

    expect(result.fields.amountDue.extraction).toBe(0.95)
    expect(result.fields.amountDue.status).toBe('high')
  })

  it('OCR source produces lower extraction confidence', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'ocr',
      fields: {
        amountDue: { found: true },
      },
    })

    expect(result.fields.amountDue.extraction).toBe(0.50)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })

  it('handles empty fields input', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {},
    })

    expect(result.summary.totalFields).toBe(0)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('handles all fields missing', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: false },
        dueDate: { found: false },
        accountNumber: { found: false },
      },
    })

    expect(result.summary.totalFields).toBe(3)
    expect(result.summary.failed).toBe(3)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('PDF source: all found fields are needs-review (0.80 < 0.9 threshold)', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'api' },  // extraction=0.80 < 0.9 → needs-review despite validation
        accountNumber: { found: true },                                          // extraction=0.80 < 0.9 → needs-review
        referenceMonth: { found: false },                                        // extraction=0 → failed
      },
    })

    expect(result.fields.amountDue.status).toBe('needs-review')
    expect(result.fields.accountNumber.status).toBe('needs-review')
    expect(result.fields.referenceMonth.status).toBe('failed')
    expect(result.summary.needsReview).toBe(2)
    expect(result.summary.failed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('API source with validation achieves confirmed status', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'web' },
      },
    })

    // API extraction=0.95 >= 0.9, validation=1.0 >= 0.9 → confirmed
    expect(result.fields.amountDue.status).toBe('confirmed')
    expect(result.summary.confirmed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('validation without validationSource omits the field', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0 },
      },
    })

    expect(result.fields.amountDue.validation).toBe(1.0)
    expect(result.fields.amountDue.validationSource).toBeUndefined()
  })

  it('field with found=false ignores validation', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: false, validation: 1.0, validationSource: 'api' },
      },
    })

    // extraction=0 → failed, regardless of validation
    expect(result.fields.amountDue.extraction).toBe(0)
    expect(result.fields.amountDue.status).toBe('failed')
  })

  it('autoAcceptable true when all fields confirmed', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'web' },
        dueDate: { found: true, validation: 0.95, validationSource: 'web' },
      },
    })

    expect(result.summary.confirmed).toBe(2)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('DDA source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'dda',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.method).toBe('dda')
    expect(result.source.methodScore).toBe(0.90)
    expect(result.fields.amountDue.extraction).toBe(0.90)
    expect(result.fields.amountDue.status).toBe('high')
  })

  it('web-scrape source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'web-scrape',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.methodScore).toBe(0.70)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })

  it('email source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'email',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.methodScore).toBe(0.65)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/lib/billing-intelligence/__tests__/confidence.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/billing-intelligence/confidence.ts`:

```typescript
import type {
  BillExtractionConfidence,
  BillExtractionSource,
  FieldConfidence,
  FieldStatus,
} from './types'

/**
 * Base reliability scores by source method.
 * These are initial values subject to calibration as we collect real accuracy data.
 * When a field is found, its extraction confidence is set to the source method score.
 * When a field is not found, its extraction confidence is 0.
 */
const SOURCE_METHOD_SCORES: Record<string, number> = {
  api: 0.95,
  dda: 0.90,
  pdf: 0.80,
  'web-scrape': 0.70,
  email: 0.65,
  ocr: 0.50,
}

/** Get the base reliability score for a source method. */
export function getSourceMethodScore(method: BillExtractionSource): number {
  return SOURCE_METHOD_SCORES[method] ?? 0.50
}

/**
 * Compute the routing status for a single field based on its
 * extraction and validation confidence.
 *
 * Extraction confidence: "did we read it correctly?" (0-1)
 * Validation confidence: "does it match another source?" (0-1, optional)
 *
 * Status routing:
 * - confirmed:    extraction >= 0.9 AND validated >= 0.9
 * - high:         extraction >= 0.9, no validation or not yet validated
 * - needs-review: extraction 0.5-0.9, or validation found discrepancy
 * - failed:       extraction < 0.5 or field not found
 */
export function computeFieldStatus(input: {
  extraction: number
  validation?: number
}): FieldStatus {
  const { extraction, validation } = input

  // Validation discrepancy always forces review
  if (validation !== undefined && validation < 0.5) return 'needs-review'

  // Validated and extraction is good
  if (validation !== undefined && validation >= 0.9 && extraction >= 0.9) return 'confirmed'

  // Good extraction, no validation (or validation not yet run)
  if (extraction >= 0.9) return 'high'

  // Medium extraction
  if (extraction >= 0.5) return 'needs-review'

  // Low extraction or not found
  return 'failed'
}

interface FieldInput {
  found: boolean
  validation?: number
  validationSource?: string
}

interface ConfidenceInput {
  sourceMethod: BillExtractionSource
  fields: Record<string, FieldInput>
}

/**
 * Build the full BillExtractionConfidence object for an extraction result.
 * Called by providers after parsing to produce a uniform confidence structure.
 *
 * Each field's extraction confidence = source method score if found, 0 if not.
 * Validation is an independent dimension set per field if a second source is available.
 * Status routing is computed per field from both dimensions.
 */
export function buildBillExtractionConfidence(
  input: ConfidenceInput,
): BillExtractionConfidence {
  const methodScore = getSourceMethodScore(input.sourceMethod)

  const fields: Record<string, FieldConfidence> = {}
  let confirmed = 0
  let high = 0
  let needsReview = 0
  let failed = 0

  for (const [name, field] of Object.entries(input.fields)) {
    const extraction = field.found ? methodScore : 0
    const status = computeFieldStatus({
      extraction,
      validation: field.validation,
    })

    fields[name] = {
      extraction,
      status,
      ...(field.validation !== undefined && { validation: field.validation }),
      ...(field.validationSource && { validationSource: field.validationSource }),
    }

    switch (status) {
      case 'confirmed': confirmed++; break
      case 'high': high++; break
      case 'needs-review': needsReview++; break
      case 'failed': failed++; break
    }
  }

  const totalFields = Object.keys(fields).length

  return {
    fields,
    source: {
      method: input.sourceMethod,
      methodScore,
    },
    summary: {
      totalFields,
      confirmed,
      high,
      needsReview,
      failed,
      autoAcceptable: needsReview === 0 && failed === 0,
    },
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test src/lib/billing-intelligence/__tests__/confidence.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-intelligence/confidence.ts src/lib/billing-intelligence/__tests__/confidence.test.ts
git commit -m "feat: add uniform extraction confidence scoring utility"
```

---


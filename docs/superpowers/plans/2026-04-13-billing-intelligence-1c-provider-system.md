# Billing Intelligence Foundation — Plan 1c: Provider System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the provider registry, CNPJ identification pipeline, Enliv Campeche provider module, and bill identification orchestration.

**Architecture:** CNPJ extraction identifies providers from bill text. The provider registry maps profile UUIDs to code modules. Enliv Campeche is the first provider implementation. Bill identification orchestrates the full pipeline: PDF text → CNPJ → registry → provider → extraction.

**Tech Stack:** TypeScript, Vitest, Supabase (for CNPJ cache)

**Part of:** Billing Intelligence Foundation (Plan 1)
**Depends on:** Plan 1a (types, Provider interface) and Plan 1b (normalization, confidence, external monitor, PDF extraction)
**Blocks:** Plan 1d (cleanup)

**Key files from earlier plans that this plan imports:**
- `src/lib/billing-intelligence/types.ts` — `ExtractionResult`, `ValidationResult`, `PaymentStatus`, etc.
- `src/lib/billing-intelligence/providers/types.ts` — `Provider` interface
- `src/lib/billing-intelligence/normalize.ts` — `normalizeDate`, `normalizeMonth`, `parseBRL`, `toMinorUnits`, `normalizeBarcode`
- `src/lib/billing-intelligence/confidence.ts` — `buildExtractionConfidence`
- `src/lib/billing-intelligence/extraction/pdf.ts` — `extractTextFromPdf`
- `src/lib/external/call.ts` — `externalFetch` (for Enliv API calls and CNPJ lookups)
- `src/lib/cnpj/validate.ts` — `isValidCnpj`

---
## Task 10: CNPJ identification — move and enhance with DB cache

**Files:**
- Create: `src/lib/billing-intelligence/identification/cnpj-extract.ts`
- Create: `src/lib/billing-intelligence/identification/cnpj-lookup.ts`
- Create: `src/lib/billing-intelligence/identification/__tests__/cnpj-extract.test.ts`
- Create: `src/lib/billing-intelligence/identification/__tests__/cnpj-lookup.test.ts`

- [ ] **Step 1: Create cnpj-extract.ts**

Create `src/lib/billing-intelligence/identification/cnpj-extract.ts`:

```typescript
import { isValidCnpj } from '@/lib/cnpj/validate'

/**
 * Extract all valid CNPJs from raw text.
 * Matches both formatted (XX.XXX.XXX/XXXX-XX) and unformatted (14-digit) patterns.
 * Validates each candidate using check digit algorithm.
 */
export function extractCnpjsFromText(text: string): string[] {
  const formatted = text.matchAll(
    /(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/g,
  )
  const unformatted = text.matchAll(/(?<!\d)(\d{14})(?!\d)/g)

  const candidates = new Set<string>()

  for (const match of formatted) {
    candidates.add(`${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`)
  }
  for (const match of unformatted) {
    candidates.add(match[1])
  }

  return Array.from(candidates).filter(isValidCnpj)
}
```

- [ ] **Step 2: Create cnpj-extract tests**

Create `src/lib/billing-intelligence/identification/__tests__/cnpj-extract.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractCnpjsFromText } from '../cnpj-extract'

describe('extractCnpjsFromText', () => {
  it('extracts formatted CNPJ', () => {
    expect(extractCnpjsFromText('CNPJ: 49.449.868/0001-62')).toEqual(['49449868000162'])
  })

  it('extracts unformatted CNPJ', () => {
    expect(extractCnpjsFromText('CNPJ 49449868000162')).toEqual(['49449868000162'])
  })

  it('extracts multiple CNPJs', () => {
    const result = extractCnpjsFromText('CNPJ: 49.449.868/0001-62 and 33.000.167/0001-01')
    expect(result).toHaveLength(2)
  })

  it('returns empty for no CNPJ', () => {
    expect(extractCnpjsFromText('CPF 040.032.329-09')).toEqual([])
  })

  it('deduplicates', () => {
    expect(extractCnpjsFromText('49.449.868/0001-62 repeated 49.449.868/0001-62')).toEqual(['49449868000162'])
  })

  it('filters invalid check digits', () => {
    const result = extractCnpjsFromText('CNPJ: 48.581.571/0001-93 barcode 14120000098598')
    expect(result).toEqual(['48581571000193'])
  })
})
```

- [ ] **Step 3: Create cnpj-lookup.ts with DB cache**

Create `src/lib/billing-intelligence/identification/cnpj-lookup.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { externalFetch } from '@/lib/external/call'

export interface CompanyInfo {
  cnpj: string
  companyName: string
  legalName: string
  activityCode: number
  activityDescription: string
  city: string
  state: string
  source: 'brasilapi' | 'receitaws' | 'cache'
  /** When this data was last updated (from cache or freshly fetched) */
  lastUpdated: string         // ISO 8601 timestamp
}

const CACHE_MAX_AGE_DAYS = 30

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function lookupFromCache(taxId: string): Promise<CompanyInfo | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('company_cache')
    .select('*')
    .eq('tax_id', taxId)
    .single()

  if (!data) return null

  const ageInDays = (Date.now() - new Date(data.fetched_at).getTime()) / (1000 * 60 * 60 * 24)
  if (ageInDays > CACHE_MAX_AGE_DAYS) return null

  return {
    cnpj: data.tax_id,
    companyName: data.trade_name || data.legal_name,
    legalName: data.legal_name,
    activityCode: data.activity_code,
    activityDescription: data.activity_description,
    city: data.city,
    state: data.state,
    source: 'cache',
    lastUpdated: data.updated_at,
  }
}

/**
 * Save CompanyInfo to the DB cache. Handles the mapping from
 * CompanyInfo fields to DB column names internally.
 * Tracks field changes in company_cache_history.
 */
async function saveToCache(info: CompanyInfo): Promise<void> {
  const supabase = getServiceClient()
  const now = new Date().toISOString()

  const dbRow = {
    legal_name: info.legalName,
    trade_name: info.companyName !== info.legalName ? info.companyName : null,
    activity_code: info.activityCode,
    activity_description: info.activityDescription,
    city: info.city,
    state: info.state,
    source: info.source,
    fetched_at: now,
    updated_at: now,
  }

  const existing = await supabase
    .from('company_cache')
    .select('id, legal_name, trade_name, activity_description, city, state')
    .eq('tax_id', info.cnpj)
    .single()

  if (existing.data) {
    // Track changes
    const trackFields = ['legal_name', 'trade_name', 'activity_description', 'city', 'state'] as const
    for (const field of trackFields) {
      const oldVal = String(existing.data[field] ?? '')
      const newVal = String(dbRow[field] ?? '')
      if (oldVal !== newVal) {
        await supabase.from('company_cache_history').insert({
          company_cache_id: existing.data.id,
          field_changed: field,
          old_value: oldVal,
          new_value: newVal,
        })
      }
    }

    await supabase
      .from('company_cache')
      .update(dbRow)
      .eq('id', existing.data.id)
  } else {
    await supabase.from('company_cache').insert({
      tax_id: info.cnpj,
      country_code: 'BR',
      ...dbRow,
    })
  }
}

/** Fetch company info from BrasilAPI using the external dependency monitor. */
async function fetchFromBrasilApi(cnpj: string): Promise<CompanyInfo> {
  const result = await externalFetch<Record<string, unknown>>({
    service: 'brasilapi',
    operation: 'cnpj-lookup',
    url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'BrasilAPI lookup failed')
  }

  const data = result.data
  return {
    cnpj: String(data.cnpj),
    companyName: String(data.nome_fantasia || data.razao_social),
    legalName: String(data.razao_social),
    activityCode: Number(data.cnae_fiscal),
    activityDescription: String(data.cnae_fiscal_descricao),
    city: String(data.municipio),
    state: String(data.uf),
    source: 'brasilapi',
    lastUpdated: new Date().toISOString(),
  }
}

/** Fetch company info from ReceitaWS using the external dependency monitor. */
async function fetchFromReceitaWs(cnpj: string): Promise<CompanyInfo> {
  const result = await externalFetch<Record<string, unknown>>({
    service: 'receitaws',
    operation: 'cnpj-lookup',
    url: `https://receitaws.com.br/v1/cnpj/${cnpj}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'ReceitaWS lookup failed')
  }

  const data = result.data
  const atividades = data.atividade_principal as Array<{ code: string; text: string }> | undefined
  return {
    cnpj: String(data.cnpj ?? '').replace(/[.\-/]/g, '') || cnpj,
    companyName: String(data.fantasia || data.nome),
    legalName: String(data.nome),
    activityCode: atividades?.[0]?.code
      ? parseInt(atividades[0].code.replace(/[.\-]/g, ''), 10)
      : 0,
    activityDescription: atividades?.[0]?.text ?? 'Unknown',
    city: String(data.municipio),
    state: String(data.uf),
    source: 'receitaws',
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Look up company info by tax ID.
 * DB cache (30 days) → BrasilAPI → ReceitaWS.
 * Caches results and tracks changes.
 */
export async function lookupCnpj(cnpj: string): Promise<CompanyInfo> {
  const clean = cnpj.replace(/[.\-/]/g, '')

  const cached = await lookupFromCache(clean)
  if (cached) return cached

  try {
    const result = await fetchFromBrasilApi(clean)
    await saveToCache(result)
    return result
  } catch { /* fallthrough */ }

  try {
    const result = await fetchFromReceitaWs(clean)
    await saveToCache(result)
    return result
  } catch { /* fallthrough */ }

  throw new Error('CNPJ lookup failed: cache miss and both BrasilAPI and ReceitaWS returned errors')
}
```

- [ ] **Step 4: Create cnpj-lookup tests**

Create `src/lib/billing-intelligence/identification/__tests__/cnpj-lookup.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupCnpj } from '../cnpj-lookup'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}))

describe('lookupCnpj', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns data from BrasilAPI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        cnpj: '49449868000162',
        razao_social: 'ENLIV ENERGIA LTDA',
        nome_fantasia: 'ENLIV',
        cnae_fiscal: 3514000,
        cnae_fiscal_descricao: 'Distribuição de energia elétrica',
        municipio: 'CURITIBA',
        uf: 'PR',
      }), { status: 200 }),
    )

    const result = await lookupCnpj('49449868000162')
    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('brasilapi')
  })

  it('falls back to ReceitaWS', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        cnpj: '49449868000162',
        nome: 'ENLIV ENERGIA LTDA',
        fantasia: 'ENLIV',
        atividade_principal: [{ code: '35.14-0-00', text: 'Distribuição de energia elétrica' }],
        municipio: 'CURITIBA',
        uf: 'PR',
      }), { status: 200 }))

    const result = await lookupCnpj('49449868000162')
    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('receitaws')
  })

  it('throws when all sources fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))

    await expect(lookupCnpj('00000000000000')).rejects.toThrow('CNPJ lookup failed')
  })
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm test src/lib/billing-intelligence/identification/
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing-intelligence/identification/
git commit -m "feat: add CNPJ extraction and cached lookup to billing intelligence"
```

---

## Task 11: Provider registry

**Files:**
- Create: `src/lib/billing-intelligence/providers/registry.ts`
- Create: `src/lib/billing-intelligence/providers/__tests__/registry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/billing-intelligence/providers/__tests__/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getProviderByProfileId, getProvidersByTaxId, getAllProviders } from '../registry'

describe('provider registry', () => {
  it('finds provider by profile ID', () => {
    const provider = getProviderByProfileId('a1b2c3d4-0002-0002-0002-000000000001')
    expect(provider).toBeDefined()
    expect(provider?.meta.companyTaxId).toBe('49449868000162')
  })

  it('finds providers by CNPJ', () => {
    const providers = getProvidersByTaxId('49449868000162')
    expect(providers.length).toBeGreaterThanOrEqual(1)
    expect(providers[0].profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
  })

  it('returns empty for unknown CNPJ', () => {
    expect(getProvidersByTaxId('00000000000000')).toEqual([])
  })

  it('returns undefined for unknown profile ID', () => {
    expect(getProviderByProfileId('nonexistent')).toBeUndefined()
  })

  it('lists all providers', () => {
    expect(getAllProviders().length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Implement**

Create `src/lib/billing-intelligence/providers/registry.ts`:

```typescript
import type { Provider } from './types'
import { enlivCampeche } from './enliv-campeche'

/**
 * All registered provider code modules.
 * To add a new provider: create the module, import it, add to this array.
 */
const providers: Provider[] = [
  enlivCampeche,
]

/** Find a provider by its profile UUID (provider_invoice_profiles.id) */
export function getProviderByProfileId(profileId: string): Provider | undefined {
  return providers.find((p) => p.profileId === profileId)
}

/** Find providers by company tax ID. Returns all matching (multiple if different regions). */
export function getProvidersByTaxId(taxId: string): Provider[] {
  const clean = taxId.replace(/[.\-/]/g, '')
  return providers.filter((p) => p.meta.companyTaxId === clean)
}

/** List all registered providers. */
export function getAllProviders(): Provider[] {
  return [...providers]
}
```

- [ ] **Step 3: Tests will fail until Task 11 creates enliv-campeche. Commit anyway.**

```bash
git add src/lib/billing-intelligence/providers/registry.ts src/lib/billing-intelligence/providers/__tests__/registry.test.ts
git commit -m "feat: add provider registry mapping profile IDs to code modules"
```

---

## Task 12: Enliv Campeche provider module

**IMPORTANT:**
- The code samples below use the field names from the `ExtractionResult` type defined in Plan 1a Task 5. When implementing, read `src/lib/billing-intelligence/types.ts` first and ensure all field names match (e.g., `provider.taxId` not `provider.cnpj`, `customer.taxId` not `customer.document`, `customer.taxIdType` not `customer.documentType`).
- The extraction should also include `consumption` data (kWh for electricity).
- Use `buildExtractionConfidence` from Plan 1b Task 9 instead of building confidence objects manually.
- The `api-client.ts` must use `externalFetch` from `@/lib/external/call` (not raw `fetch`) so all API calls are monitored and logged to `external_call_log`.

**Files:**
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/index.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/parser.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/api-client.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/validate.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/parser.test.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/api-client.test.ts`
- Create: `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/validate.test.ts`

This migrates the Phase 0 Enliv code into the new structure, adapting to use `Provider` interface, `ExtractionResult` type, normalized dates/money, and the profile UUID.

- [ ] **Step 1: Create parser.ts**

Create `src/lib/billing-intelligence/providers/enliv-campeche/parser.ts`:

```typescript
import type { ExtractionResult } from '../../types'
import { normalizeDate, normalizeMonth, parseBRL, toMinorUnits, normalizeBarcode } from '../../normalize'
import { buildExtractionConfidence } from '../../confidence'

// Placeholder — will be replaced with the real provider_invoice_profiles.id
// when Enliv Campeche is created through the engineering playground
const PROFILE_ID = 'a1b2c3d4-0002-0002-0002-000000000001'

export function parseEnlivBillText(text: string): ExtractionResult | null {
  const providerTaxId = extractField(text, /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
  if (!providerTaxId) return null

  const customerName = extractField(text, /Cliente:\s*\n(.+)/) ?? ''
  const customerTaxId = extractField(text, /CNPJ\/CPF:\s*\n([\d.\-\/]+)/) ?? ''
  const installationNumber = extractField(text, /Número da Instalação:\s*\n(\d+)/) ?? ''
  const referenceMonth = extractField(text, /Mês de Referência:\s*\n(\S+)/) ?? ''
  const dueDate = extractField(text, /Vencimento:\s*\n(\d{2}\/\d{2}\/\d{4})/) ?? ''

  const consumptionMatch = text.match(/Consumo Total do Mês:\s*(\d+)\s*kWh/)
  const consumptionKwh = consumptionMatch ? parseInt(consumptionMatch[1], 10) : 0

  const amountMatch = text.match(/Valor a pagar:\s*\nR\$\s*([\d.,]+)/)
  const amountBrl = amountMatch ? parseBRL(amountMatch[1]) : 0

  const linhaDigitavel = extractField(
    text, /(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})/,
  ) ?? ''

  const cleanDoc = customerTaxId.replace(/[.\-/]/g, '')
  const taxIdType = cleanDoc.length === 14 ? 'cnpj' as const : 'cpf' as const

  const confidence = buildExtractionConfidence({
    sourceMethod: 'pdf',
    fields: {
      customerName: { found: !!customerName },
      customerTaxId: { found: !!customerTaxId },
      accountNumber: { found: !!installationNumber },
      referenceMonth: { found: !!referenceMonth },
      dueDate: { found: !!dueDate },
      amountDue: { found: !!amountMatch },
      linhaDigitavel: { found: !!linhaDigitavel },
      consumption: { found: !!consumptionMatch },
    },
  })

  return {
    provider: {
      profileId: PROFILE_ID,
      companyName: 'Enliv',
      taxId: providerTaxId.replace(/[.\-/]/g, ''),
      category: 'electricity',
    },
    customer: {
      name: customerName,
      taxId: customerTaxId,
      taxIdType,
      countryCode: 'BR',
      accountNumber: installationNumber,
    },
    billing: {
      referenceMonth: normalizeMonth(referenceMonth),
      dueDate: normalizeDate(dueDate),
      amountDue: toMinorUnits(amountBrl),
      currency: 'BRL',
    },
    consumption: consumptionKwh > 0 ? { value: consumptionKwh, unit: 'kWh' } : undefined,
    payment: {
      linhaDigitavel: normalizeBarcode(linhaDigitavel),
    },
    confidence,
    rawSource: 'pdf',
  }
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern)
  return match ? match[1].trim() : null
}
```

- [ ] **Step 2: Create api-client.ts**

Create `src/lib/billing-intelligence/providers/enliv-campeche/api-client.ts`:

```typescript
import { externalFetch } from '@/lib/external/call'

const ENLIV_API_BASE = 'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com'

export interface EnlivDebito {
  id: string
  cadastroDistribuidora: string
  cadastroAuxDistribuidora: string | null
  endereco: string
  vencimento: string
  status: string
  valor: number
  link: string
  linha_digitavel: string
  emv_pix: string
}

export interface EnlivResumoDebitos {
  nome_cliente: string
  debitos: EnlivDebito[]
}

function stripFormatting(doc: string): string {
  return doc.replace(/[.\-/]/g, '')
}

export async function fetchEnlivDebitos(document: string): Promise<EnlivResumoDebitos> {
  const clean = stripFormatting(document)
  const result = await externalFetch<EnlivResumoDebitos>({
    service: 'enliv-api',
    operation: 'fetch-debitos',
    url: `${ENLIV_API_BASE}/v1/cobrancas/cliente/${clean}/resumo-debitos`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Enliv API fetch-debitos failed')
  }

  return result.data
}

export async function fetchEnlivPagas(document: string, page = 1): Promise<EnlivResumoDebitos> {
  const clean = stripFormatting(document)
  const result = await externalFetch<EnlivResumoDebitos>({
    service: 'enliv-api',
    operation: 'fetch-pagas',
    url: `${ENLIV_API_BASE}/v1/cobrancas/cliente/${clean}/resumo-pagas?page=${page}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Enliv API fetch-pagas failed')
  }

  return result.data
}
```

- [ ] **Step 3: Create validate.ts**

Create `src/lib/billing-intelligence/providers/enliv-campeche/validate.ts`:

```typescript
import type { ExtractionResult, ValidationResult } from '../../types'
import { normalizeBarcode, normalizeDate } from '../../normalize'
import { fetchEnlivDebitos } from './api-client'

export async function validateEnlivExtraction(
  extraction: ExtractionResult,
): Promise<ValidationResult | null> {
  try {
    const apiData = await fetchEnlivDebitos(extraction.customer.taxId)
    const discrepancies: ValidationResult['discrepancies'] = []

    const extractedBarcode = normalizeBarcode(extraction.payment.linhaDigitavel ?? '')
    const matchingDebito = apiData.debitos.find(
      (d) => normalizeBarcode(d.linha_digitavel) === extractedBarcode,
    )

    if (!matchingDebito) {
      return {
        valid: false,
        source: 'api',
        discrepancies: [{ field: 'barcode', extracted: extractedBarcode, expected: 'no matching debito found' }],
      }
    }

    const apiAmountMinor = Math.round(matchingDebito.valor * 100)
    if (apiAmountMinor !== extraction.billing.amountDue) {
      discrepancies.push({ field: 'amountDue', extracted: extraction.billing.amountDue, expected: apiAmountMinor })
    }

    const apiDate = normalizeDate(matchingDebito.vencimento)
    if (apiDate !== extraction.billing.dueDate) {
      discrepancies.push({ field: 'dueDate', extracted: extraction.billing.dueDate, expected: apiDate })
    }

    return { valid: discrepancies.length === 0, source: 'api', discrepancies }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Create index.ts — the Provider implementation**

Create `src/lib/billing-intelligence/providers/enliv-campeche/index.ts`:

```typescript
import type { Provider } from '../types'
import type { ExtractionResult, PaymentStatus, ValidationResult } from '../../types'
import { parseEnlivBillText } from './parser'
import { fetchEnlivDebitos, fetchEnlivPagas } from './api-client'
import { validateEnlivExtraction } from './validate'
import { normalizeDate, toMinorUnits, normalizeBarcode } from '../../normalize'
import { buildExtractionConfidence } from '../../confidence'

// Placeholder — will be replaced with the real provider_invoice_profiles.id
// when Enliv Campeche is created through the engineering playground
const PROFILE_ID = 'a1b2c3d4-0002-0002-0002-000000000001'

export const enlivCampeche: Provider = {
  profileId: PROFILE_ID,

  meta: {
    companyName: 'Enliv',
    companyTaxId: '49449868000162',
    countryCode: 'BR',
    displayName: 'Enliv (Campeche)',
    category: 'electricity',
    region: 'SC-florianopolis-campeche',
    status: 'active',
    capabilities: {
      extraction: true,
      apiLookup: true,
      validation: true,
      paymentStatus: true,
    },
  },

  identify(text: string): number | null {
    if (text.includes('49.449.868/0001-62') || text.includes('49449868000162')) {
      if (/[Cc]ampeche/.test(text)) return 0.95
      return 0.7
    }
    return null
  },

  extractBill(text: string): ExtractionResult | null {
    return parseEnlivBillText(text)
  },

  async lookupBills(taxId: string): Promise<ExtractionResult[] | null> {
    try {
      const data = await fetchEnlivDebitos(taxId)
      return data.debitos.map((d) => ({
        provider: { profileId: PROFILE_ID, companyName: 'Enliv', taxId: '49449868000162', category: 'electricity' as const },
        customer: { name: data.nome_cliente, taxId, taxIdType: 'cpf' as const, countryCode: 'BR', accountNumber: d.cadastroDistribuidora },
        billing: { referenceMonth: '', dueDate: normalizeDate(d.vencimento), amountDue: toMinorUnits(d.valor), currency: 'BRL' },
        payment: { linhaDigitavel: normalizeBarcode(d.linha_digitavel), pixPayload: d.emv_pix },
        confidence: buildExtractionConfidence({
          sourceMethod: 'api',
          fields: {
            customerName: { found: !!data.nome_cliente },
            accountNumber: { found: !!d.cadastroDistribuidora },
            dueDate: { found: !!d.vencimento },
            amountDue: { found: true },
            linhaDigitavel: { found: !!d.linha_digitavel },
          },
        }),
        rawSource: 'api' as const,
      }))
    } catch { return null }
  },

  async checkPaymentStatus(taxId: string): Promise<PaymentStatus[] | null> {
    try {
      const data = await fetchEnlivPagas(taxId)
      return data.debitos.map((d) => ({
        paid: true,
        paidDate: normalizeDate(d.vencimento),
        paidAmount: toMinorUnits(d.valor),
        source: 'provider-api' as const,
      }))
    } catch { return null }
  },

  async validateExtraction(extraction: ExtractionResult): Promise<ValidationResult | null> {
    return validateEnlivExtraction(extraction)
  },
}
```

- [ ] **Step 5: Create parser tests**

Create `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseEnlivBillText } from '../parser'

const sampleText = `www.enliv.com.br
Suporte:
E-mail: atendimento@enliv.com.br
Whatsapp: (41) 99197-7364
Sobre a Enliv:
R. Heitor Stockler de França, 396. Centro Cívico, Curitiba - PR Ed. Neo Corporate - Sala 501. CEP: 800030-030
CNPJ: 49.449.868/0001-62
Cliente:
Alex Amorim Anton
Endereço:
Avenida Campeche, 533,
Campeche 88063-300 -
Florianópolis / SC
CNPJ/CPF:
040.032.329-09
Número da Instalação:
59069412
Mês de Referência:
MAR/2026
Data de Emissão:
22/03/2026
Vencimento:
24/04/2026
Consumo Total do Mês: 269 kWh
Valor a pagar:
R$ 218,47
74891.16009 06660.307304 32263.871033 5 14260000021847`

describe('parseEnlivBillText', () => {
  it('returns ExtractionResult with profile ID', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result).not.toBeNull()
    expect(result!.provider.profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
    expect(result!.provider.taxId).toBe('49449868000162')
    expect(result!.provider.category).toBe('electricity')
  })

  it('extracts customer info', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.customer.name).toBe('Alex Amorim Anton')
    expect(result.customer.taxId).toBe('040.032.329-09')
    expect(result.customer.taxIdType).toBe('cpf')
    expect(result.customer.countryCode).toBe('BR')
    expect(result.customer.accountNumber).toBe('59069412')
  })

  it('normalizes dates and amounts', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.billing.referenceMonth).toBe('2026-03')
    expect(result.billing.dueDate).toBe('2026-04-24')
    expect(result.billing.amountDue).toBe(21847)
    expect(result.billing.currency).toBe('BRL')
  })

  it('extracts consumption', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.consumption).toEqual({ value: 269, unit: 'kWh' })
  })

  it('normalizes barcode', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.payment.linhaDigitavel).toBe('74891160090666030730432263871033514260000021847')
  })

  it('uses buildExtractionConfidence for uniform scoring', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.confidence.source.method).toBe('pdf')
    expect(result.confidence.source.methodScore).toBe(0.80)
    expect(result.confidence.fields.amountDue.extraction).toBe(0.80)
    expect(result.confidence.fields.amountDue.status).toBe('needs-review')
    expect(result.confidence.summary.totalFields).toBe(8)
    expect(result.rawSource).toBe('pdf')
  })

  it('returns null for non-Enliv text', () => {
    expect(parseEnlivBillText('random text')).toBeNull()
  })
})
```

- [ ] **Step 6: Create api-client tests**

Create `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/api-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEnlivDebitos, fetchEnlivPagas } from '../api-client'

describe('fetchEnlivDebitos', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches debitos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: 'Test', debitos: [{ id: '1', valor: 218.47 }] }), { status: 200 }),
    )
    const result = await fetchEnlivDebitos('04003232909')
    expect(result.debitos[0].valor).toBe(218.47)
  })

  it('strips formatting', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: '', debitos: [] }), { status: 200 }),
    )
    await fetchEnlivDebitos('040.032.329-09')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/04003232909/'), expect.anything())
  })

  it('throws on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not found', { status: 404 }))
    await expect(fetchEnlivDebitos('000')).rejects.toThrow('404')
  })
})

describe('fetchEnlivPagas', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches paid invoices', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: 'Test', debitos: [] }), { status: 200 }),
    )
    await fetchEnlivPagas('04003232909')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/resumo-pagas?page=1'), expect.anything())
  })
})
```

- [ ] **Step 7: Create validate tests**

Create `src/lib/billing-intelligence/providers/enliv-campeche/__tests__/validate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateEnlivExtraction } from '../validate'
import type { ExtractionResult } from '../../../types'
import { buildExtractionConfidence } from '../../../confidence'

function makeExtraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    provider: { profileId: 'test', companyName: 'Enliv', taxId: '49449868000162', category: 'electricity' },
    customer: { name: 'Test', taxId: '04003232909', taxIdType: 'cpf', countryCode: 'BR', accountNumber: '59069412' },
    billing: { referenceMonth: '2026-03', dueDate: '2026-04-24', amountDue: 21847, currency: 'BRL' },
    payment: { linhaDigitavel: '74891160090666030730432263871033514260000021847' },
    confidence: buildExtractionConfidence({ sourceMethod: 'pdf', fields: { amountDue: { found: true } } }),
    rawSource: 'pdf',
    ...overrides,
  }
}

describe('validateEnlivExtraction', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns valid when API data matches extraction', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 218.47,
          linha_digitavel: '74891160090666030730432263871033514260000021847',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result).not.toBeNull()
    expect(result!.valid).toBe(true)
    expect(result!.discrepancies).toHaveLength(0)
  })

  it('returns discrepancy when amount differs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 250.00,
          linha_digitavel: '74891160090666030730432263871033514260000021847',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result!.valid).toBe(false)
    expect(result!.discrepancies).toContainEqual(
      expect.objectContaining({ field: 'amountDue' }),
    )
  })

  it('returns invalid when no matching barcode found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 218.47,
          linha_digitavel: '00000000000000000000000000000000000000000000000',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result!.valid).toBe(false)
    expect(result!.discrepancies).toContainEqual(
      expect.objectContaining({ field: 'barcode' }),
    )
  })

  it('returns null when API call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 8: Run all billing intelligence tests**

```bash
pnpm test src/lib/billing-intelligence/
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/billing-intelligence/providers/enliv-campeche/ src/lib/billing-intelligence/providers/registry.ts
git commit -m "feat: add enliv-campeche provider module and wire into registry"
```

---

## Task 13: Bill identification orchestration

**Files:**
- Create: `src/lib/billing-intelligence/identification/identify.ts`
- Create: `src/lib/billing-intelligence/identification/__tests__/identify.test.ts`

- [ ] **Step 1: Write tests**

Create `src/lib/billing-intelligence/identification/__tests__/identify.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { identifyProvider } from '../identify'

const enlivText = `CNPJ: 49.449.868/0001-62
Cliente:
Alex Amorim Anton
Avenida Campeche, 533`

describe('identifyProvider', () => {
  it('identifies Enliv Campeche', () => {
    const result = identifyProvider(enlivText)
    expect(result).not.toBeNull()
    expect(result!.provider.profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
    expect(result!.confidence).toBeGreaterThan(0.8)
  })

  it('returns null for unknown provider', () => {
    expect(identifyProvider('no CNPJ here')).toBeNull()
  })
})
```

- [ ] **Step 2: Implement**

Create `src/lib/billing-intelligence/identification/identify.ts`:

```typescript
import { extractCnpjsFromText } from './cnpj-extract'
import { getProvidersByTaxId } from '../providers/registry'
import type { Provider } from '../providers/types'

export interface IdentificationResult {
  provider: Provider
  cnpj: string
  confidence: number
}

/**
 * Identify which provider issued a bill from its text content.
 * Extracts CNPJs → looks up in registry → picks highest confidence.
 */
export function identifyProvider(text: string): IdentificationResult | null {
  const cnpjs = extractCnpjsFromText(text)

  for (const cnpj of cnpjs) {
    const providers = getProvidersByTaxId(cnpj)
    if (providers.length === 0) continue

    if (providers.length === 1) {
      const confidence = providers[0].identify(text) ?? 0.5
      return { provider: providers[0], cnpj, confidence }
    }

    let best: { provider: Provider; confidence: number } | null = null
    for (const provider of providers) {
      const confidence = provider.identify(text)
      if (confidence !== null && (best === null || confidence > best.confidence)) {
        best = { provider, confidence }
      }
    }

    if (best) return { provider: best.provider, cnpj, confidence: best.confidence }
  }

  return null
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/lib/billing-intelligence/identification/__tests__/identify.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing-intelligence/identification/identify.ts src/lib/billing-intelligence/identification/__tests__/identify.test.ts
git commit -m "feat: add bill identification orchestration"
```

---


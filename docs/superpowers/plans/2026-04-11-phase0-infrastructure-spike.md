# Phase 0: Infrastructure Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only dev utility to prove out core integrations end-to-end: CNPJ-based bill identification, Enliv bill lookup/extraction, and Pluggy Open Finance bank account connection + transaction reading.

**Architecture:** Dev-only route at `/app/dev/phase0` (not deployed, local only). Four independent integration modules: (1) CNPJ lookup service for identifying providers from bill PDFs, (2) Enliv API client for bill lookup by CPF, (3) Enliv PDF parser for extracting bill fields, (4) Pluggy integration for bank account connection and transaction feed. Each module has its own server-side logic and a simple UI for testing.

**Tech Stack:** Next.js App Router, TypeScript, `pluggy-sdk`, `react-pluggy-connect`, `pdf-parse` (for PDF text extraction), Vitest for tests.

---

## File Structure

```
src/
  lib/
    cnpj/
      lookup.ts                # CNPJ lookup with BrasilAPI primary + ReceitaWS fallback
      types.ts                 # CNPJ lookup types
      __tests__/
        lookup.test.ts
    providers/
      enliv/
        api-client.ts          # Enliv public API client (fetch debts by CPF)
        pdf-parser.ts          # Extract structured fields from Enliv PDF text
        types.ts               # Enliv-specific types
        __tests__/
          api-client.test.ts
          pdf-parser.test.ts
    pluggy/
      client.ts                # Server-side Pluggy client wrapper
      types.ts                 # Pluggy-specific types
  app/
    api/
      pluggy/
        connect-token/
          route.ts             # POST — create Pluggy Connect token
        webhooks/
          route.ts             # POST — receive Pluggy webhook events
    app/
      (main)/
        dev/
          phase0/
            page.tsx           # Dev-only page with test panels
            enliv-lookup.tsx   # Enliv API lookup panel (enter CPF, see debts)
            enliv-upload.tsx   # Enliv PDF upload panel (upload PDF, see extracted fields)
            cnpj-identify.tsx  # CNPJ identification panel (upload any bill, identify provider)
            pluggy-connect.tsx # Pluggy bank connection panel
    actions/
      phase0/
        cnpj-identify.ts       # Server action: extract CNPJ from PDF, lookup via BrasilAPI
        enliv-lookup.ts        # Server action: call Enliv API by CPF
        enliv-extract.ts       # Server action: extract fields from uploaded PDF
        pluggy-transactions.ts # Server action: fetch transactions for connected item
```

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install packages**

```bash
pnpm add pluggy-sdk react-pluggy-connect pdf-parse
pnpm add -D @types/pdf-parse
```

- [ ] **Step 2: Add Pluggy env vars to `.env.local`**

Add these lines to the existing `.env.local`:

```
# Pluggy (sandbox)
PLUGGY_CLIENT_ID=6b1d3a0b-7de9-46c2-aec6-ba749c85574d
PLUGGY_CLIENT_SECRET=ab25c3c2-35bc-4d30-b21d-d2d0bd0f5fbe
```

- [ ] **Step 3: Add `.env.local` entries to `.env.example` (without values)**

Check if `.env.example` exists. If so, add placeholder lines:

```
# Pluggy (sandbox)
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "feat: add pluggy-sdk, react-pluggy-connect, pdf-parse dependencies"
```

Do NOT commit `.env.local`.

---

## Task 2: CNPJ lookup service with fallback

**Files:**
- Create: `src/lib/cnpj/types.ts`
- Create: `src/lib/cnpj/lookup.ts`
- Create: `src/lib/cnpj/__tests__/lookup.test.ts`

- [ ] **Step 1: Write CNPJ types**

Create `src/lib/cnpj/types.ts`:

```typescript
export interface CnpjLookupResult {
  cnpj: string
  razao_social: string // Legal name
  nome_fantasia: string | null // Trade/brand name
  situacao_cadastral: string // e.g. "ATIVA"
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  cnae_fiscal: number // Primary activity code
  cnae_fiscal_descricao: string // e.g. "Distribuição de energia elétrica"
  telefone: string
  email: string | null
}

export interface CnpjIdentification {
  cnpj: string
  companyName: string // nome_fantasia || razao_social
  legalName: string
  activityCode: number
  activityDescription: string
  city: string
  state: string
  source: 'brasilapi' | 'receitaws'
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/cnpj/__tests__/lookup.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupCnpj, extractCnpjsFromText } from '../lookup'

describe('extractCnpjsFromText', () => {
  it('extracts formatted CNPJ from text', () => {
    const text = 'CNPJ: 49.449.868/0001-62 some other text'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })

  it('extracts unformatted CNPJ from text', () => {
    const text = 'Company CNPJ 49449868000162 details'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })

  it('extracts multiple CNPJs', () => {
    const text = 'CNPJ: 49.449.868/0001-62 and also 33.000.167/0001-01'
    const result = extractCnpjsFromText(text)
    expect(result).toHaveLength(2)
    expect(result).toContain('49449868000162')
    expect(result).toContain('33000167000101')
  })

  it('returns empty array when no CNPJ found', () => {
    const text = 'No CNPJ here, just CPF 040.032.329-09'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual([])
  })

  it('deduplicates CNPJs', () => {
    const text = 'CNPJ: 49.449.868/0001-62 repeated 49.449.868/0001-62'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })
})

describe('lookupCnpj', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data from BrasilAPI on success', async () => {
    const mockData = {
      cnpj: '49449868000162',
      razao_social: 'ENLIV ENERGIA LTDA',
      nome_fantasia: 'ENLIV',
      situacao_cadastral: 'ATIVA',
      logradouro: 'R Heitor Stockler',
      numero: '396',
      complemento: 'Sala 501',
      bairro: 'Centro Civico',
      municipio: 'CURITIBA',
      uf: 'PR',
      cep: '80030030',
      cnae_fiscal: 3514000,
      cnae_fiscal_descricao: 'Distribuição de energia elétrica',
      telefone: '4199197-7364',
      email: 'atendimento@enliv.com.br',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 }),
    )

    const result = await lookupCnpj('49449868000162')

    expect(result.companyName).toBe('ENLIV')
    expect(result.activityDescription).toBe('Distribuição de energia elétrica')
    expect(result.source).toBe('brasilapi')
  })

  it('falls back to ReceitaWS when BrasilAPI fails', async () => {
    const mockReceitaData = {
      cnpj: '49449868000162',
      nome: 'ENLIV ENERGIA LTDA',
      fantasia: 'ENLIV',
      situacao: 'ATIVA',
      logradouro: 'R Heitor Stockler',
      numero: '396',
      complemento: 'Sala 501',
      bairro: 'Centro Civico',
      municipio: 'CURITIBA',
      uf: 'PR',
      cep: '80030030',
      atividade_principal: [
        { code: '35.14-0-00', text: 'Distribuição de energia elétrica' },
      ],
      telefone: '4199197-7364',
      email: 'atendimento@enliv.com.br',
    }

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockReceitaData), { status: 200 }),
      )

    const result = await lookupCnpj('49449868000162')

    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('receitaws')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws when both APIs fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))

    await expect(lookupCnpj('00000000000000')).rejects.toThrow(
      'CNPJ lookup failed: both BrasilAPI and ReceitaWS returned errors',
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test src/lib/cnpj/__tests__/lookup.test.ts
```

Expected: FAIL — `lookupCnpj` and `extractCnpjsFromText` not found.

- [ ] **Step 4: Implement the CNPJ lookup service**

Create `src/lib/cnpj/lookup.ts`:

```typescript
import type { CnpjIdentification } from './types'

/**
 * Extract all CNPJs from raw text (PDF text, bill text, etc.).
 * Returns deduplicated array of unformatted CNPJ strings (digits only).
 */
export function extractCnpjsFromText(text: string): string[] {
  // Match formatted (XX.XXX.XXX/XXXX-XX) or unformatted (14 digits) CNPJs
  const formatted = text.matchAll(
    /(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/g,
  )
  const unformatted = text.matchAll(/(?<!\d)(\d{14})(?!\d)/g)

  const cnpjs = new Set<string>()

  for (const match of formatted) {
    cnpjs.add(`${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`)
  }
  for (const match of unformatted) {
    cnpjs.add(match[1])
  }

  return Array.from(cnpjs)
}

async function lookupViaBrasilApi(
  cnpj: string,
): Promise<CnpjIdentification> {
  const response = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error(`BrasilAPI returned ${response.status}`)
  }

  const data = await response.json()

  return {
    cnpj: data.cnpj,
    companyName: data.nome_fantasia || data.razao_social,
    legalName: data.razao_social,
    activityCode: data.cnae_fiscal,
    activityDescription: data.cnae_fiscal_descricao,
    city: data.municipio,
    state: data.uf,
    source: 'brasilapi',
  }
}

async function lookupViaReceitaWs(
  cnpj: string,
): Promise<CnpjIdentification> {
  const response = await fetch(
    `https://receitaws.com.br/v1/cnpj/${cnpj}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error(`ReceitaWS returned ${response.status}`)
  }

  const data = await response.json()

  return {
    cnpj: data.cnpj?.replace(/[.\-/]/g, '') ?? cnpj,
    companyName: data.fantasia || data.nome,
    legalName: data.nome,
    activityCode: data.atividade_principal?.[0]?.code
      ? parseInt(data.atividade_principal[0].code.replace(/[.\-]/g, ''), 10)
      : 0,
    activityDescription:
      data.atividade_principal?.[0]?.text ?? 'Unknown',
    city: data.municipio,
    state: data.uf,
    source: 'receitaws',
  }
}

/**
 * Look up a CNPJ using BrasilAPI (primary) with ReceitaWS fallback.
 */
export async function lookupCnpj(cnpj: string): Promise<CnpjIdentification> {
  const cleanCnpj = cnpj.replace(/[.\-/]/g, '')

  try {
    return await lookupViaBrasilApi(cleanCnpj)
  } catch {
    // BrasilAPI failed, try ReceitaWS
  }

  try {
    return await lookupViaReceitaWs(cleanCnpj)
  } catch {
    // Both failed
  }

  throw new Error(
    'CNPJ lookup failed: both BrasilAPI and ReceitaWS returned errors',
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test src/lib/cnpj/__tests__/lookup.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cnpj/
git commit -m "feat: add CNPJ lookup service with BrasilAPI primary and ReceitaWS fallback"
```

---

## Task 3: Enliv types and API client
**Files:**
- Create: `src/lib/providers/enliv/types.ts`
- Create: `src/lib/providers/enliv/api-client.ts`
- Create: `src/lib/providers/enliv/__tests__/api-client.test.ts`

- [ ] **Step 1: Write Enliv types**

Create `src/lib/providers/enliv/types.ts`:

```typescript
export interface EnlivDebito {
  id: string
  cadastroDistribuidora: string
  cadastroAuxDistribuidora: string | null
  endereco: string
  vencimento: string // ISO 8601 date
  status: string // e.g. "PENDENTE"
  valor: number
  link: string // URL to PDF report
  linha_digitavel: string
  emv_pix: string // PIX QR code payload
}

export interface EnlivResumoDebitos {
  nome_cliente: string
  debitos: EnlivDebito[]
}

export interface EnlivBillExtraction {
  providerName: string
  providerCnpj: string
  customerName: string
  customerCpf: string
  installationNumber: string
  address: string
  referenceMonth: string // e.g. "MAR/2026"
  issueDate: string // e.g. "22/03/2026"
  dueDate: string // e.g. "24/04/2026"
  consumptionKwh: number
  amountDue: number // in BRL (e.g. 218.47)
  linhaDigitavel: string
  lineItems: EnlivLineItem[]
}

export interface EnlivLineItem {
  description: string
  quantity: string | null
  tariff: string | null
  value: number
}
```

- [ ] **Step 2: Write the failing test for API client**

Create `src/lib/providers/enliv/__tests__/api-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchEnlivDebitos } from '../api-client'

describe('fetchEnlivDebitos', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns debitos for a valid CPF', async () => {
    const mockResponse: unknown = {
      nome_cliente: 'Test User',
      debitos: [
        {
          id: 'abc-123',
          cadastroDistribuidora: '59069412',
          cadastroAuxDistribuidora: null,
          endereco: 'Rua Test, 123',
          vencimento: '2026-04-24',
          status: 'PENDENTE',
          valor: 218.47,
          link: '/v1/cobrancas/id/abc-123/get-relatorio',
          linha_digitavel: '74891.16009 06660.307304 32263.871033 5 14260000021847',
          emv_pix: 'pix-payload-here',
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const result = await fetchEnlivDebitos('04003232909')

    expect(fetch).toHaveBeenCalledWith(
      'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com/v1/cobrancas/cliente/04003232909/resumo-debitos',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result.nome_cliente).toBe('Test User')
    expect(result.debitos).toHaveLength(1)
    expect(result.debitos[0].valor).toBe(218.47)
    expect(result.debitos[0].status).toBe('PENDENTE')
  })

  it('strips formatting from CPF input', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ nome_cliente: '', debitos: [] }), { status: 200 }),
    )

    await fetchEnlivDebitos('040.032.329-09')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/04003232909/'),
      expect.anything(),
    )
  })

  it('throws on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not found', { status: 404 }),
    )

    await expect(fetchEnlivDebitos('00000000000')).rejects.toThrow(
      'Enliv API returned 404',
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test src/lib/providers/enliv/__tests__/api-client.test.ts
```

Expected: FAIL — `fetchEnlivDebitos` not found.

- [ ] **Step 4: Implement the API client**

Create `src/lib/providers/enliv/api-client.ts`:

```typescript
import type { EnlivResumoDebitos } from './types'

const ENLIV_API_BASE =
  'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com'

function stripCpfFormatting(cpf: string): string {
  return cpf.replace(/[.\-/]/g, '')
}

export async function fetchEnlivDebitos(
  cpf: string,
): Promise<EnlivResumoDebitos> {
  const cleanCpf = stripCpfFormatting(cpf)
  const url = `${ENLIV_API_BASE}/v1/cobrancas/cliente/${cleanCpf}/resumo-debitos`

  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Enliv API returned ${response.status}`)
  }

  return response.json()
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test src/lib/providers/enliv/__tests__/api-client.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/enliv/types.ts src/lib/providers/enliv/api-client.ts src/lib/providers/enliv/__tests__/api-client.test.ts
git commit -m "feat: add Enliv API client with types and tests"
```

---

## Task 4: Enliv PDF parser
**Files:**
- Create: `src/lib/providers/enliv/pdf-parser.ts`
- Create: `src/lib/providers/enliv/__tests__/pdf-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/providers/enliv/__tests__/pdf-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseEnlivBillText } from '../pdf-parser'

// This is the raw text that pdf-parse extracts from the Enliv PDF.
// We test against this known text output rather than the PDF binary.
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
Consumo Total do Mês: 269 kWh Consumo de Energia 
Limpa: 7,61 kWh
Valor sem Enliv:
R$ 236,77
Desconto Enliv:
R$ 18,30
Valor a pagar:
R$ 218,47
74891.16009 06660.307304 32263.871033 5 14260000021847
Tarifa com Impostos 
e Bandeiras 269 kWh R$ 0,829554 R$ 223,15
Iluminação Pública R$ 13,62
Demais Encargos R$ 0,00
Ajuste Desconto R$ 17,23
Desconto ENLIV 
sobre Energia Limpa -7,61 kWh R$ 0,140604 R$ 1,07`

describe('parseEnlivBillText', () => {
  it('extracts customer info', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.customerName).toBe('Alex Amorim Anton')
    expect(result.customerCpf).toBe('040.032.329-09')
    expect(result.installationNumber).toBe('59069412')
  })

  it('extracts provider info', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.providerName).toBe('Enliv')
    expect(result.providerCnpj).toBe('49.449.868/0001-62')
  })

  it('extracts billing details', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.referenceMonth).toBe('MAR/2026')
    expect(result.issueDate).toBe('22/03/2026')
    expect(result.dueDate).toBe('24/04/2026')
    expect(result.consumptionKwh).toBe(269)
    expect(result.amountDue).toBe(218.47)
  })

  it('extracts barcode', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.linhaDigitavel).toBe(
      '74891.16009 06660.307304 32263.871033 5 14260000021847',
    )
  })

  it('extracts line items', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.lineItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Tarifa com Impostos e Bandeiras',
          value: 223.15,
        }),
        expect.objectContaining({
          description: 'Iluminação Pública',
          value: 13.62,
        }),
        expect.objectContaining({
          description: 'Demais Encargos',
          value: 0.0,
        }),
        expect.objectContaining({
          description: 'Ajuste Desconto',
          value: 17.23,
        }),
      ]),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/providers/enliv/__tests__/pdf-parser.test.ts
```

Expected: FAIL — `parseEnlivBillText` not found.

- [ ] **Step 3: Implement the PDF parser**

Create `src/lib/providers/enliv/pdf-parser.ts`:

```typescript
import type { EnlivBillExtraction, EnlivLineItem } from './types'

function extractAfterLabel(text: string, label: string): string {
  const regex = new RegExp(`${label}\\s*[:\\n]\\s*(.+?)\\s*(?:\\n|$)`, 's')
  const match = text.match(regex)
  return match?.[1]?.trim() ?? ''
}

function extractMultilineAfterLabel(
  text: string,
  label: string,
  stopBefore: string,
): string {
  const labelIndex = text.indexOf(label)
  if (labelIndex === -1) return ''
  const afterLabel = text.slice(labelIndex + label.length)
  const stopIndex = afterLabel.indexOf(stopBefore)
  const segment = stopIndex === -1 ? afterLabel : afterLabel.slice(0, stopIndex)
  return segment.replace(/[\n\r]+/g, ' ').trim()
}

function parseBrlAmount(text: string): number {
  // Matches "R$ 218,47" or "R$ 0,00" — Brazilian format
  const match = text.match(/R\$\s*([\d.,]+)/)
  if (!match) return 0
  return parseFloat(match[1].replace('.', '').replace(',', '.'))
}

function extractLinhaDigitavel(text: string): string {
  // Matches the boleto barcode pattern: 5 groups of digits separated by spaces/dots
  const match = text.match(
    /(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})/,
  )
  return match?.[1] ?? ''
}

function parseLineItems(text: string): EnlivLineItem[] {
  const items: EnlivLineItem[] = []

  // Tarifa com Impostos e Bandeiras
  const tarifaMatch = text.match(
    /Tarifa com Impostos\s*(?:e|\n)\s*Bandeiras\s+([\d,.]+)\s*kWh\s+R\$\s*([\d,.]+)\s+R\$\s*([\d,.]+)/s,
  )
  if (tarifaMatch) {
    items.push({
      description: 'Tarifa com Impostos e Bandeiras',
      quantity: `${tarifaMatch[1]} kWh`,
      tariff: `R$ ${tarifaMatch[2]}`,
      value: parseFloat(tarifaMatch[3].replace('.', '').replace(',', '.')),
    })
  }

  // Simple line items: "Description R$ X,XX"
  const simpleItems = [
    'Iluminação Pública',
    'Demais Encargos',
    'Ajuste Desconto',
  ]
  for (const name of simpleItems) {
    const regex = new RegExp(`${name}\\s+R\\$\\s*([\\d.,]+)`)
    const match = text.match(regex)
    if (match) {
      items.push({
        description: name,
        quantity: null,
        tariff: null,
        value: parseFloat(match[1].replace('.', '').replace(',', '.')),
      })
    }
  }

  return items
}

export function parseEnlivBillText(text: string): EnlivBillExtraction {
  const address = extractMultilineAfterLabel(text, 'Endereço:', 'CNPJ/CPF')
    .replace(/\s+/g, ' ')
    .replace(/,\s*$/, '')

  const consumptionMatch = text.match(/Consumo Total do Mês:\s*([\d,.]+)\s*kWh/)
  const consumptionKwh = consumptionMatch
    ? parseFloat(consumptionMatch[1].replace('.', '').replace(',', '.'))
    : 0

  const valorMatch = text.match(/Valor a pagar:\s*R\$\s*([\d.,]+)/)
  const amountDue = valorMatch
    ? parseFloat(valorMatch[1].replace('.', '').replace(',', '.'))
    : 0

  return {
    providerName: 'Enliv',
    providerCnpj: extractAfterLabel(text, 'CNPJ').replace('CNPJ: ', ''),
    customerName: extractAfterLabel(text, 'Cliente'),
    customerCpf: extractAfterLabel(text, 'CNPJ/CPF'),
    installationNumber: extractAfterLabel(text, 'Número da Instalação'),
    address,
    referenceMonth: extractAfterLabel(text, 'Mês de Referência'),
    issueDate: extractAfterLabel(text, 'Data de Emissão'),
    dueDate: extractAfterLabel(text, 'Vencimento'),
    consumptionKwh,
    amountDue,
    linhaDigitavel: extractLinhaDigitavel(text),
    lineItems: parseLineItems(text),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/providers/enliv/__tests__/pdf-parser.test.ts
```

Expected: all 5 tests PASS. If any regex patterns don't match the sample text exactly, adjust the patterns until all tests pass. The sample text in the test is the source of truth for what the PDF extraction produces.

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers/enliv/pdf-parser.ts src/lib/providers/enliv/__tests__/pdf-parser.test.ts
git commit -m "feat: add Enliv PDF text parser with tests"
```

---

## Task 5: Pluggy server-side client and API routes
**Files:**
- Create: `src/lib/pluggy/client.ts`
- Create: `src/lib/pluggy/types.ts`
- Create: `src/app/api/pluggy/connect-token/route.ts`
- Create: `src/app/api/pluggy/webhooks/route.ts`

- [ ] **Step 1: Create Pluggy types**

Create `src/lib/pluggy/types.ts`:

```typescript
export interface PluggyTransaction {
  id: string
  description: string
  descriptionRaw: string | null
  currencyCode: string
  amount: number
  amountInAccountCurrency: number | null
  date: string // ISO 8601
  balance: number
  category: string | null
  categoryId: string | null
  accountId: string
  providerCode: string | null
  status: string
  paymentData: {
    payer: {
      name: string | null
      branchNumber: string | null
      accountNumber: string | null
      routingNumber: string | null
      documentNumber: { type: string; value: string } | null
    } | null
    receiver: {
      name: string | null
      branchNumber: string | null
      accountNumber: string | null
      routingNumber: string | null
      documentNumber: { type: string; value: string } | null
    } | null
    paymentMethod: string | null
    referenceNumber: string | null
  } | null
  type: string // DEBIT or CREDIT
  creditCardMetadata: unknown | null
  merchant: { name: string; businessName: string; cnpj: string } | null
}

export interface PluggyWebhookEvent {
  event: 'item/created' | 'item/updated' | 'item/error'
  itemId: string
  eventId: string
  error?: { code: string; message: string }
}
```

- [ ] **Step 2: Create Pluggy server client**

Create `src/lib/pluggy/client.ts`:

```typescript
import { PluggyClient } from 'pluggy-sdk'

let cachedClient: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (cachedClient) return cachedClient

  cachedClient = new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID!,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
  })

  return cachedClient
}
```

- [ ] **Step 3: Create connect token API route**

Create `src/app/api/pluggy/connect-token/route.ts`:

```typescript
import { getPluggyClient } from '@/lib/pluggy/client'

export async function POST(req: Request) {
  const pluggy = getPluggyClient()
  const { clientUserId } = await req.json()

  const connectToken = await pluggy.createConnectToken({
    clientUserId,
  })

  return Response.json({ accessToken: connectToken.accessToken })
}
```

- [ ] **Step 4: Create webhook API route**

Create `src/app/api/pluggy/webhooks/route.ts`:

```typescript
import type { PluggyWebhookEvent } from '@/lib/pluggy/types'

export async function POST(req: Request) {
  const event: PluggyWebhookEvent = await req.json()

  console.log('[Pluggy Webhook]', event.event, event.itemId)

  switch (event.event) {
    case 'item/created':
      console.log('[Pluggy] Item created:', event.itemId)
      break
    case 'item/updated':
      console.log('[Pluggy] Item updated:', event.itemId)
      break
    case 'item/error':
      console.error('[Pluggy] Item error:', event.itemId, event.error)
      break
  }

  return Response.json({ received: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/pluggy/ src/app/api/pluggy/
git commit -m "feat: add Pluggy client, connect-token route, and webhook handler"
```

---

## Task 6: Server actions for Phase 0 dev page
**Files:**
- Create: `src/app/actions/phase0/enliv-lookup.ts`
- Create: `src/app/actions/phase0/enliv-extract.ts`
- Create: `src/app/actions/phase0/pluggy-transactions.ts`

- [ ] **Step 1: Create Enliv lookup server action**

Create `src/app/actions/phase0/enliv-lookup.ts`:

```typescript
'use server'

import { fetchEnlivDebitos } from '@/lib/providers/enliv/api-client'

export async function lookupEnlivDebitos(cpf: string) {
  try {
    const result = await fetchEnlivDebitos(cpf)
    return { success: true as const, data: result }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

- [ ] **Step 2: Create Enliv PDF extract server action**

Create `src/app/actions/phase0/enliv-extract.ts`:

```typescript
'use server'

import pdf from 'pdf-parse'
import { parseEnlivBillText } from '@/lib/providers/enliv/pdf-parser'

export async function extractEnlivBill(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false as const, error: 'No file provided' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)
    const extraction = parseEnlivBillText(pdfData.text)

    return { success: true as const, data: extraction, rawText: pdfData.text }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    }
  }
}
```

- [ ] **Step 3: Create Pluggy transactions server action**

Create `src/app/actions/phase0/pluggy-transactions.ts`:

```typescript
'use server'

import { getPluggyClient } from '@/lib/pluggy/client'

export async function fetchPluggyTransactions(itemId: string) {
  try {
    const pluggy = getPluggyClient()

    // First get accounts for this item
    const accounts = await pluggy.fetchAccounts(itemId)
    if (accounts.results.length === 0) {
      return { success: false as const, error: 'No accounts found for this item' }
    }

    // Fetch transactions for the first account
    const account = accounts.results[0]
    const transactions = await pluggy.fetchTransactions(account.id)

    return {
      success: true as const,
      data: {
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currencyCode: account.currencyCode,
        },
        transactions: transactions.results.map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          type: t.type,
          category: t.category,
          paymentData: t.paymentData,
          merchant: t.merchant,
        })),
      },
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/phase0/
git commit -m "feat: add Phase 0 server actions for Enliv lookup, PDF extraction, and Pluggy transactions"
```

---

## Task 7: Phase 0 dev page — Enliv lookup panel
**Files:**
- Create: `src/app/app/(main)/dev/phase0/page.tsx`
- Create: `src/app/app/(main)/dev/phase0/enliv-lookup.tsx`

- [ ] **Step 1: Create the main Phase 0 page**

Create `src/app/app/(main)/dev/phase0/page.tsx`:

```tsx
import { EnlivLookupPanel } from './enliv-lookup'
import { EnlivUploadPanel } from './enliv-upload'
import { PluggyConnectPanel } from './pluggy-connect'

export default function Phase0Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Phase 0: Infrastructure Spike</h1>
        <p className="text-muted-foreground mt-1">
          Dev-only page for testing core integrations. Not deployed.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            1. Enliv API Lookup (by CPF)
          </h2>
          <EnlivLookupPanel />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">
            2. Enliv PDF Extraction
          </h2>
          <EnlivUploadPanel />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">
            3. Pluggy Open Finance
          </h2>
          <PluggyConnectPanel />
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the Enliv lookup panel**

Create `src/app/app/(main)/dev/phase0/enliv-lookup.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { lookupEnlivDebitos } from '@/app/actions/phase0/enliv-lookup'
import type { EnlivResumoDebitos } from '@/lib/providers/enliv/types'

export function EnlivLookupPanel() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EnlivResumoDebitos | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup() {
    setLoading(true)
    setError(null)
    setResult(null)

    const response = await lookupEnlivDebitos(cpf)

    if (response.success) {
      setResult(response.data)
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="Enter CPF (e.g. 04003232909)"
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !cpf}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'Lookup'}
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Customer: {result.nome_cliente}
          </div>
          <div className="text-sm text-gray-500">
            {result.debitos.length} open debt(s)
          </div>
          {result.debitos.map((d) => (
            <div key={d.id} className="rounded border p-3 text-sm">
              <div className="flex justify-between">
                <span>Due: {d.vencimento}</span>
                <span className="font-mono font-medium">
                  R$ {d.valor.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 text-gray-500">
                Status: {d.status} | UC: {d.cadastroDistribuidora}
              </div>
              <div className="mt-1 font-mono text-xs text-gray-400 break-all">
                {d.linha_digitavel}
              </div>
            </div>
          ))}

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-400">
              Raw JSON
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\(main\)/dev/
git commit -m "feat: add Phase 0 dev page with Enliv API lookup panel"
```

---

## Task 8: Phase 0 dev page — Enliv PDF upload panel
**Files:**
- Create: `src/app/app/(main)/dev/phase0/enliv-upload.tsx`

- [ ] **Step 1: Create the Enliv upload panel**

Create `src/app/app/(main)/dev/phase0/enliv-upload.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { extractEnlivBill } from '@/app/actions/phase0/enliv-extract'
import type { EnlivBillExtraction } from '@/lib/providers/enliv/types'

export function EnlivUploadPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    data: EnlivBillExtraction
    rawText: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const response = await extractEnlivBill(formData)

    if (response.success) {
      setResult({ data: response.data, rawText: response.rawText })
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="text-sm"
        />
        {loading && (
          <span className="ml-2 text-sm text-gray-500">Extracting...</span>
        )}
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Extracted Fields</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Provider:</span>{' '}
              {result.data.providerName}
            </div>
            <div>
              <span className="text-gray-500">CNPJ:</span>{' '}
              {result.data.providerCnpj}
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>{' '}
              {result.data.customerName}
            </div>
            <div>
              <span className="text-gray-500">CPF:</span>{' '}
              {result.data.customerCpf}
            </div>
            <div>
              <span className="text-gray-500">Installation:</span>{' '}
              {result.data.installationNumber}
            </div>
            <div>
              <span className="text-gray-500">Reference:</span>{' '}
              {result.data.referenceMonth}
            </div>
            <div>
              <span className="text-gray-500">Due Date:</span>{' '}
              {result.data.dueDate}
            </div>
            <div>
              <span className="text-gray-500">Consumption:</span>{' '}
              {result.data.consumptionKwh} kWh
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Amount Due:</span>{' '}
              <span className="font-mono font-medium">
                R$ {result.data.amountDue.toFixed(2)}
              </span>
            </div>
          </div>

          {result.data.lineItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium">Line Items</h4>
              <div className="mt-1 space-y-1">
                {result.data.lineItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm"
                  >
                    <span>{item.description}</span>
                    <span className="font-mono">
                      R$ {item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">
              Raw PDF text
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">
              {result.rawText}
            </pre>
          </details>

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">
              Extracted JSON
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/app/\(main\)/dev/phase0/enliv-upload.tsx
git commit -m "feat: add Enliv PDF upload panel to Phase 0 dev page"
```

---

## Task 9: Phase 0 dev page — CNPJ identification panel

**Files:**
- Create: `src/app/app/(main)/dev/phase0/cnpj-identify.tsx`
- Create: `src/app/actions/phase0/cnpj-identify.ts`

- [ ] **Step 1: Create the CNPJ identify server action**

Create `src/app/actions/phase0/cnpj-identify.ts`:

```typescript
'use server'

import pdf from 'pdf-parse'
import { extractCnpjsFromText, lookupCnpj } from '@/lib/cnpj/lookup'
import type { CnpjIdentification } from '@/lib/cnpj/types'

export async function identifyBillProvider(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false as const, error: 'No file provided' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)

    const cnpjs = extractCnpjsFromText(pdfData.text)

    if (cnpjs.length === 0) {
      return {
        success: false as const,
        error: 'No CNPJ found in PDF',
        rawText: pdfData.text,
      }
    }

    const results: CnpjIdentification[] = []
    const errors: string[] = []

    for (const cnpj of cnpjs) {
      try {
        const result = await lookupCnpj(cnpj)
        results.push(result)
      } catch (err) {
        errors.push(
          `${cnpj}: ${err instanceof Error ? err.message : 'lookup failed'}`,
        )
      }
    }

    return {
      success: true as const,
      data: {
        cnpjsFound: cnpjs,
        lookups: results,
        errors,
      },
      rawText: pdfData.text,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    }
  }
}
```

- [ ] **Step 2: Create the CNPJ identification panel**

Create `src/app/app/(main)/dev/phase0/cnpj-identify.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { identifyBillProvider } from '@/app/actions/phase0/cnpj-identify'
import type { CnpjIdentification } from '@/lib/cnpj/types'

type IdentifyResult = {
  cnpjsFound: string[]
  lookups: CnpjIdentification[]
  errors: string[]
}

export function CnpjIdentifyPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    data: IdentifyResult
    rawText: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const response = await identifyBillProvider(formData)

    if (response.success) {
      setResult({ data: response.data, rawText: response.rawText ?? '' })
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-gray-500">
        Upload any bill PDF. We&apos;ll extract CNPJs, look up each company via
        BrasilAPI (with ReceitaWS fallback), and identify the provider.
      </p>
      <div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="text-sm"
        />
        {loading && (
          <span className="ml-2 text-sm text-gray-500">Identifying...</span>
        )}
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">
              {result.data.cnpjsFound.length} CNPJ(s) found:
            </span>{' '}
            {result.data.cnpjsFound.join(', ')}
          </div>

          {result.data.lookups.map((lookup) => (
            <div
              key={lookup.cnpj}
              className="rounded border p-3 text-sm"
            >
              <div className="font-medium">{lookup.companyName}</div>
              <div className="text-gray-500">
                {lookup.legalName}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-500">
                <div>CNPJ: {lookup.cnpj}</div>
                <div>Source: {lookup.source}</div>
                <div>Activity: {lookup.activityDescription}</div>
                <div>CNAE: {lookup.activityCode}</div>
                <div>
                  Location: {lookup.city}, {lookup.state}
                </div>
              </div>
            </div>
          ))}

          {result.data.errors.length > 0 && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-700">
              <div className="font-medium">Lookup errors:</div>
              {result.data.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">
              Raw PDF text
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">
              {result.rawText}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add CNPJ panel to Phase 0 page**

In `src/app/app/(main)/dev/phase0/page.tsx`, add the import:

```tsx
import { CnpjIdentifyPanel } from './cnpj-identify'
```

Add a new section after the Enliv panels and before Pluggy:

```tsx
<section>
  <h2 className="mb-4 text-lg font-semibold">
    3. CNPJ Bill Identification
  </h2>
  <CnpjIdentifyPanel />
</section>
```

Renumber the Pluggy section to 4 and Cross-Validation to 5.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cnpj/ src/app/actions/phase0/cnpj-identify.ts src/app/app/\(main\)/dev/phase0/cnpj-identify.tsx src/app/app/\(main\)/dev/phase0/page.tsx
git commit -m "feat: add CNPJ identification panel with BrasilAPI + ReceitaWS fallback"
```

---

## Task 10: Phase 0 dev page — Pluggy connect panel
**Files:**
- Create: `src/app/app/(main)/dev/phase0/pluggy-connect.tsx`

- [ ] **Step 1: Create the Pluggy connect panel**

Create `src/app/app/(main)/dev/phase0/pluggy-connect.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { PluggyConnect } from 'react-pluggy-connect'
import { fetchPluggyTransactions } from '@/app/actions/phase0/pluggy-transactions'

type ConnectedItem = {
  itemId: string
  account: {
    id: string
    name: string
    type: string
    balance: number
    currencyCode: string
  }
  transactions: Array<{
    id: string
    description: string
    amount: number
    date: string
    type: string
    category: string | null
    paymentData: unknown
    merchant: unknown
  }>
}

export function PluggyConnectPanel() {
  const [connectToken, setConnectToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [showWidget, setShowWidget] = useState(false)
  const [connectedItem, setConnectedItem] = useState<ConnectedItem | null>(null)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    setTokenLoading(true)
    setTokenError(null)
    try {
      const res = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: 'dev-phase0-test' }),
      })
      const data = await res.json()
      setConnectToken(data.accessToken)
    } catch (err) {
      setTokenError(
        err instanceof Error ? err.message : 'Failed to get connect token',
      )
    }
    setTokenLoading(false)
  }, [])

  async function handleSuccess(itemData: { item: { id: string } }) {
    const itemId = itemData.item.id
    setShowWidget(false)
    setTransactionsLoading(true)
    setTransactionsError(null)

    const result = await fetchPluggyTransactions(itemId)

    if (result.success) {
      setConnectedItem({
        itemId,
        account: result.data.account,
        transactions: result.data.transactions,
      })
    } else {
      setTransactionsError(result.error)
    }
    setTransactionsLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {!showWidget && !connectedItem && (
        <div className="space-y-2">
          <button
            onClick={async () => {
              await fetchToken()
              setShowWidget(true)
            }}
            disabled={tokenLoading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {tokenLoading ? 'Loading...' : 'Connect Bank Account'}
          </button>
          {tokenError && (
            <div className="text-sm text-red-600">{tokenError}</div>
          )}
        </div>
      )}

      {showWidget && connectToken && (
        <div>
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={true}
            onSuccess={handleSuccess}
            onError={(error) => {
              console.error('Pluggy Connect error:', error)
              setShowWidget(false)
            }}
            onClose={() => setShowWidget(false)}
          />
        </div>
      )}

      {transactionsLoading && (
        <div className="text-sm text-gray-500">
          Loading transactions...
        </div>
      )}

      {transactionsError && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {transactionsError}
        </div>
      )}

      {connectedItem && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Connected!</span> Item ID:{' '}
            <code className="text-xs">{connectedItem.itemId}</code>
          </div>

          <div className="rounded bg-gray-50 p-3 text-sm">
            <div className="font-medium">
              {connectedItem.account.name} ({connectedItem.account.type})
            </div>
            <div className="text-gray-500">
              Balance: {connectedItem.account.currencyCode}{' '}
              {connectedItem.account.balance?.toFixed(2)}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium">
              Transactions ({connectedItem.transactions.length})
            </h4>
            <div className="mt-1 max-h-96 space-y-1 overflow-auto">
              {connectedItem.transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between rounded border px-3 py-2 text-sm"
                >
                  <div>
                    <div>{t.description}</div>
                    <div className="text-xs text-gray-400">
                      {t.date} | {t.category ?? 'uncategorized'}
                    </div>
                  </div>
                  <div
                    className={`font-mono ${t.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {t.type === 'DEBIT' ? '-' : '+'}R${' '}
                    {Math.abs(t.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">
              Raw transaction data
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(connectedItem, null, 2)}
            </pre>
          </details>

          <button
            onClick={() => {
              setConnectedItem(null)
              setConnectToken('')
            }}
            className="text-sm text-blue-600 underline"
          >
            Connect another account
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/app/\(main\)/dev/phase0/pluggy-connect.tsx
git commit -m "feat: add Pluggy Connect panel to Phase 0 dev page"
```

---

## Task 11: Cross-validation — compare Enliv API vs PDF extraction
**Files:**
- Modify: `src/app/app/(main)/dev/phase0/page.tsx`

- [ ] **Step 1: Add a comparison section to the page**

Add a fourth section to `page.tsx` after the three existing panels. This section takes a CPF and a PDF, runs both the API lookup and PDF extraction, and shows a side-by-side comparison of values to validate extraction accuracy.

Add to `page.tsx` imports:

```tsx
import { EnlivComparePanel } from './enliv-compare'
```

Add to the page body after section 3:

```tsx
<section>
  <h2 className="mb-4 text-lg font-semibold">
    4. Cross-Validation: API vs PDF
  </h2>
  <EnlivComparePanel />
</section>
```

- [ ] **Step 2: Create the comparison panel**

Create `src/app/app/(main)/dev/phase0/enliv-compare.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { lookupEnlivDebitos } from '@/app/actions/phase0/enliv-lookup'
import { extractEnlivBill } from '@/app/actions/phase0/enliv-extract'
import type { EnlivResumoDebitos, EnlivBillExtraction } from '@/lib/providers/enliv/types'

type ComparisonRow = {
  field: string
  api: string
  pdf: string
  match: boolean
}

function compare(
  apiData: EnlivResumoDebitos,
  pdfData: EnlivBillExtraction,
): ComparisonRow[] {
  const apiDebito = apiData.debitos[0]
  if (!apiDebito) return []

  const rows: ComparisonRow[] = [
    {
      field: 'Customer Name',
      api: apiData.nome_cliente,
      pdf: pdfData.customerName,
      match: apiData.nome_cliente === pdfData.customerName,
    },
    {
      field: 'Amount',
      api: apiDebito.valor.toFixed(2),
      pdf: pdfData.amountDue.toFixed(2),
      match: apiDebito.valor === pdfData.amountDue,
    },
    {
      field: 'Due Date',
      api: apiDebito.vencimento,
      pdf: pdfData.dueDate,
      match:
        apiDebito.vencimento.includes(pdfData.dueDate) ||
        pdfData.dueDate.includes(apiDebito.vencimento),
    },
    {
      field: 'Installation / UC',
      api: apiDebito.cadastroDistribuidora,
      pdf: pdfData.installationNumber,
      match: apiDebito.cadastroDistribuidora === pdfData.installationNumber,
    },
    {
      field: 'Barcode',
      api: apiDebito.linha_digitavel,
      pdf: pdfData.linhaDigitavel,
      match: apiDebito.linha_digitavel.replace(/\s/g, '') === pdfData.linhaDigitavel.replace(/\s/g, ''),
    },
  ]

  return rows
}

export function EnlivComparePanel() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ComparisonRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleCompare(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !cpf) return

    setLoading(true)
    setError(null)
    setRows([])

    const formData = new FormData()
    formData.append('file', file)

    const [apiResult, pdfResult] = await Promise.all([
      lookupEnlivDebitos(cpf),
      extractEnlivBill(formData),
    ])

    if (!apiResult.success) {
      setError(`API error: ${apiResult.error}`)
      setLoading(false)
      return
    }
    if (!pdfResult.success) {
      setError(`PDF error: ${pdfResult.error}`)
      setLoading(false)
      return
    }

    setRows(compare(apiResult.data, pdfResult.data))
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-gray-500">
        Enter a CPF and upload the corresponding Enliv PDF to compare API data
        against PDF extraction.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="CPF"
          className="w-48 rounded border px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept=".pdf"
          onChange={handleCompare}
          disabled={!cpf}
          className="text-sm"
        />
      </div>

      {loading && <div className="text-sm text-gray-500">Comparing...</div>}

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Field</th>
              <th className="py-2">API</th>
              <th className="py-2">PDF</th>
              <th className="py-2">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-b">
                <td className="py-2 font-medium">{row.field}</td>
                <td className="py-2 font-mono text-xs">{row.api}</td>
                <td className="py-2 font-mono text-xs">{row.pdf}</td>
                <td className="py-2">
                  {row.match ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="font-medium text-red-600">NO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/app/\(main\)/dev/phase0/
git commit -m "feat: add Enliv cross-validation panel comparing API vs PDF extraction"
```

---

## Task 12: Manual smoke test

**Files:** None — this is a verification task.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Navigate to the Phase 0 page**

Open `http://localhost:3000/app/dev/phase0` in your browser.

- [ ] **Step 3: Test Enliv API lookup**

Enter CPF `04003232909` in the lookup panel. You should see Alex's open debts with amounts, due dates, and barcodes. Verify the data matches the PDF.

- [ ] **Step 4: Test Enliv PDF extraction**

Upload the Enliv PDF (`enliv_cobranca (3).pdf`). Verify all extracted fields are correct: customer name, CPF, installation number, reference month, due date, consumption, amount, barcode, and line items.

- [ ] **Step 5: Test CNPJ identification**

Upload the Enliv PDF in panel 3 (CNPJ Identification). Verify it finds CNPJ `49.449.868/0001-62`, looks it up via BrasilAPI, and returns "Enliv" with activity description related to electricity distribution. Try uploading a different bill (condo fee PDF) and verify it identifies a different company.

- [ ] **Step 6: Test cross-validation**

Enter the same CPF and upload the same PDF in panel 4. Verify all fields show "Yes" for match. If any show "NO", investigate whether the API returns a different format than the PDF and adjust the comparison logic.

- [ ] **Step 7: Test Pluggy Connect**

Click "Connect Bank Account". The Pluggy Connect widget should open. Select "Pluggy Bank" (sandbox institution). Use the sandbox test credentials (visible in the widget). After connecting, verify that account info and sample transactions appear.

- [ ] **Step 8: Document findings**

Note any issues, discrepancies, or surprises in each integration. These findings inform what needs adjustment before building product features on top of these integrations.

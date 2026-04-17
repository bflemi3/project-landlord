// @vitest-environment node
/**
 * Contract extraction integration tests — hit the real Anthropic API.
 *
 * Run with `pnpm test:llm`. Requires `ANTHROPIC_API_KEY`.
 *
 * Each fixture is extracted once per format (PDF + DOCX share an expected file)
 * and asserted against `fixtures/expected/<name>.expected.json` via the DSL
 * in `assertions.ts`. Per-test and cumulative token usage + USD cost are
 * logged to stdout so the human running the suite can watch spend.
 *
 * To calibrate a single fixture without burning credits on all 14, use
 *   pnpm test:llm -t "pt-br-real"
 * to filter by test name.
 */

import { describe, it, expect, afterAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractContract } from '../extract-contract'
import type {
  ContractExtractionResponse,
  ContractExtractionTelemetry,
} from '../types'
import { assertExtracted, type ExpectedNode } from './assertions'

const FIXTURES = join(__dirname, 'fixtures')
const EXPECTED = join(FIXTURES, 'expected')

// ---------------------------------------------------------------------------
// Pricing (USD per 1M tokens). Sonnet 4.6 published rates.
// Source: https://www.anthropic.com/pricing (API — Claude Sonnet 4.6).
// ---------------------------------------------------------------------------
const PRICING_PER_MTOK = {
  input: 3.0,
  output: 15.0,
  cacheWrite: 3.75, // 1.25× input for Anthropic ephemeral
  cacheRead: 0.3, // 0.1× input for Anthropic ephemeral
}

interface ReportRow {
  name: string
  telemetry: ContractExtractionTelemetry
  costUsd: number
}

const report: ReportRow[] = []

function estimateCostUsd(t: ContractExtractionTelemetry): number {
  const perToken = (rate: number) => rate / 1_000_000
  return (
    t.inputTokens * perToken(PRICING_PER_MTOK.input) +
    t.outputTokens * perToken(PRICING_PER_MTOK.output) +
    t.cacheWriteTokens * perToken(PRICING_PER_MTOK.cacheWrite) +
    t.cacheReadTokens * perToken(PRICING_PER_MTOK.cacheRead)
  )
}

function fmtUsd(v: number): string {
  return `$${v.toFixed(4)}`
}

function logTelemetry(name: string, t: ContractExtractionTelemetry, costUsd: number): void {
  const parts = [
    `in=${t.inputTokens}`,
    `out=${t.outputTokens}`,
    `cache_w=${t.cacheWriteTokens}`,
    `cache_r=${t.cacheReadTokens}`,
    `${t.durationMs}ms`,
    fmtUsd(costUsd),
  ]
  // eslint-disable-next-line no-console
  console.log(`  [${name}] ${parts.join('  ')}`)
}

// ---------------------------------------------------------------------------
// Test matrix — each contract × each format.
// ---------------------------------------------------------------------------

interface FixtureCase {
  /** Stem (e.g. `pt-br-real`) — used to load the companion expected file. */
  stem: string
  /** Filename within fixtures/ (e.g. `pt-br-real.pdf`). */
  file: string
  fileType: 'pdf' | 'docx'
}

const CONTRACT_STEMS = [
  'pt-br-real',
  'pt-br-synthetic-1',
  'pt-br-synthetic-2',
  'en-synthetic-1',
  'en-synthetic-2',
  'es-synthetic-1',
  'es-synthetic-2',
]

const CASES: FixtureCase[] = CONTRACT_STEMS.flatMap((stem) => [
  { stem, file: `${stem}.pdf`, fileType: 'pdf' as const },
  { stem, file: `${stem}.docx`, fileType: 'docx' as const },
])

async function loadExpected(stem: string): Promise<ExpectedNode> {
  const raw = await readFile(join(EXPECTED, `${stem}.expected.json`), 'utf8')
  return JSON.parse(raw) as ExpectedNode
}

describe('extractContract — integration (real LLM)', () => {
  for (const testCase of CASES) {
    it(`extracts ${testCase.file}`, async () => {
      const fileBuffer = await readFile(join(FIXTURES, testCase.file))
      const expected = await loadExpected(testCase.stem)

      let captured: ContractExtractionTelemetry | undefined
      const response: ContractExtractionResponse = await extractContract(
        { fileBuffer, fileType: testCase.fileType },
        {
          onTelemetry: (t) => {
            captured = t
          },
        },
      )

      if (captured) {
        const costUsd = estimateCostUsd(captured)
        report.push({ name: testCase.file, telemetry: captured, costUsd })
        logTelemetry(testCase.file, captured, costUsd)
      }

      if (!response.success) {
        throw new Error(`extractContract failed: ${response.error.code}`)
      }

      const errors = assertExtracted(expected, response.data)
      expect(errors).toEqual([])
    })
  }

  afterAll(() => {
    if (report.length === 0) return

    const totals = report.reduce(
      (acc, r) => {
        acc.inputTokens += r.telemetry.inputTokens
        acc.outputTokens += r.telemetry.outputTokens
        acc.cacheWriteTokens += r.telemetry.cacheWriteTokens
        acc.cacheReadTokens += r.telemetry.cacheReadTokens
        acc.durationMs += r.telemetry.durationMs
        acc.costUsd += r.costUsd
        return acc
      },
      {
        inputTokens: 0,
        outputTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
        durationMs: 0,
        costUsd: 0,
      },
    )

    // eslint-disable-next-line no-console
    console.log('\n  ──────── LLM usage summary ────────')
    // eslint-disable-next-line no-console
    console.log(`  fixtures:         ${report.length}`)
    // eslint-disable-next-line no-console
    console.log(`  input tokens:     ${totals.inputTokens}`)
    // eslint-disable-next-line no-console
    console.log(`  output tokens:    ${totals.outputTokens}`)
    // eslint-disable-next-line no-console
    console.log(`  cache-write:      ${totals.cacheWriteTokens}`)
    // eslint-disable-next-line no-console
    console.log(`  cache-read:       ${totals.cacheReadTokens}`)
    // eslint-disable-next-line no-console
    console.log(`  total duration:   ${totals.durationMs}ms`)
    // eslint-disable-next-line no-console
    console.log(`  estimated cost:   ${fmtUsd(totals.costUsd)}`)
    // eslint-disable-next-line no-console
    console.log(`  avg per fixture:  ${fmtUsd(totals.costUsd / report.length)}`)
    // eslint-disable-next-line no-console
    console.log('  ───────────────────────────────────\n')
  })
})

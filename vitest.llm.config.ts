import { defineConfig } from 'vitest/config'

/**
 * LLM integration tests — run only via `pnpm test:llm`.
 *
 * These hit the real Anthropic API (ANTHROPIC_API_KEY required) and verify
 * end-to-end extraction against fixture contracts. They're deliberately
 * excluded from `pnpm test` (unit) and `pnpm test:integration` (DB) to avoid
 * incurring API costs on every code change.
 *
 * Scoped to `src/lib/contract-extraction/` so future DB integration tests
 * with `.integration.test.ts` suffixes don't leak in.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/lib/contract-extraction/**/*.integration.test.ts'],
    // LLM calls take 10–30s each; 13 fixtures run serial can push past the
    // default 5s timeout. 120s per test plus generous suite budget.
    testTimeout: 120_000,
    hookTimeout: 60_000,
    // Phase 2 will write the actual integration tests — until then, this
    // config must exit 0 when the suite is empty.
    passWithNoTests: true,
  },
})

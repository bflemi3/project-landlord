import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // LLM integration tests have their own config (vitest.llm.config.ts) so
    // they don't pull in the DB globalSetup and don't run with DB tests.
    exclude: ['src/lib/contract-extraction/**/*.integration.test.ts', 'node_modules/**', '.next/**'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    passWithNoTests: true,
    globalSetup: './src/test/setup-integration.ts',
  },
})

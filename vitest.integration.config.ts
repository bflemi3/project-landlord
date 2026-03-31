import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    passWithNoTests: true,
    globalSetup: './src/test/setup-integration.ts',
  },
})

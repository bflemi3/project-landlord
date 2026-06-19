import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    // Design-system guard: an arbitrary value (`w-[104px]`) with an exact
    // token equivalent (`w-26`) must use the token. Emails are excluded —
    // they render through React Email's own Tailwind, not globals.css.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/emails/**'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/app/globals.css' },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/sw.js']),
])

export default eslintConfig

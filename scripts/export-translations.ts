/**
 * Exports translations to CSV for review by native speakers.
 *
 * Usage:
 *   npx tsx scripts/export-translations.ts pt-BR > docs/translations-pt-BR.csv
 *   npx tsx scripts/export-translations.ts es > docs/translations-es.csv
 */

import fs from 'fs'
import path from 'path'

const locale = process.argv[2]
if (!locale || !['pt-BR', 'es'].includes(locale)) {
  console.error('Usage: npx tsx scripts/export-translations.ts <pt-BR|es>')
  process.exit(1)
}

const root = path.resolve(__dirname, '..')
const en = JSON.parse(fs.readFileSync(path.join(root, 'messages/en.json'), 'utf-8'))
const target = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), 'utf-8'))
const context = JSON.parse(fs.readFileSync(path.join(root, 'scripts/translation-context.json'), 'utf-8'))

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

const enFlat = flatten(en)
const targetFlat = flatten(target)

function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// CSV header
const header = ['Chave', 'Contexto', 'Inglês (referência)', locale === 'pt-BR' ? 'Português (BR)' : 'Español']
console.log(header.map(escapeCsv).join(','))

// CSV rows
for (const key of Object.keys(enFlat)) {
  const row = [
    key,
    context[key] ?? '',
    enFlat[key] ?? '',
    targetFlat[key] ?? '⚠️ FALTANDO',
  ]
  console.log(row.map(escapeCsv).join(','))
}

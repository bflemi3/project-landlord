import type { AccuracyReport } from './types'

/**
 * Format an accuracy report into a human-readable string.
 * Shows identification, extraction, and validation as separate sections.
 */
export function formatReport(report: AccuracyReport): string {
  const lines: string[] = []

  const label = report.profileId ?? 'All providers'
  lines.push(`Accuracy Report: ${label}`)
  lines.push('='.repeat(50))
  lines.push(`Total cases: ${report.totalCases}`)
  lines.push('')

  // Identification (only if tested)
  if (report.identification.tested > 0) {
    lines.push(`Identification: ${report.identification.passed}/${report.identification.tested} passed`)
    if (report.identification.failed > 0) {
      lines.push(`  ${report.identification.failed} failed — fix identification before trusting extraction accuracy`)
    }
    lines.push('')
  }

  // Extraction
  const ext = report.extraction
  lines.push(`Extraction: ${(ext.accuracy * 100).toFixed(1)}% (${ext.passedFields}/${ext.totalFields} fields across ${ext.casesScored} cases)`)
  lines.push('')

  // Per-field breakdown
  lines.push('Per-field accuracy:')
  const sorted = Object.entries(report.fieldAccuracy).sort(
    ([, a], [, b]) => a.accuracy - b.accuracy,
  )
  for (const [field, stats] of sorted) {
    const pct = (stats.accuracy * 100).toFixed(1)
    const indicator = stats.accuracy === 1 ? '✓' : stats.accuracy >= 0.9 ? '~' : '✗'
    lines.push(`  ${indicator} ${field}: ${pct}% (${stats.passed}/${stats.total})`)
  }

  // Validation (only if tested)
  if (report.validation.tested > 0) {
    lines.push('')
    lines.push(`Validation: ${report.validation.passed}/${report.validation.tested} passed`)
  }

  return lines.join('\n')
}

/**
 * Check if extraction accuracy meets the minimum threshold.
 * Uses extraction accuracy specifically — identification and validation
 * are separate competencies with their own pass/fail logic.
 */
export function meetsThreshold(report: AccuracyReport, threshold: number): boolean {
  return report.extraction.accuracy >= threshold
}

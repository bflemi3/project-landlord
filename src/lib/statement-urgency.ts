export type UrgencyLevel = 'normal' | 'approaching' | 'overdue'

/**
 * Computes the urgency level for a statement based on proximity to the due date.
 *
 * @param dueDay - The unit's due_day_of_month (1-28)
 * @param periodYear - The billing period year
 * @param periodMonth - The billing period month (1-12)
 * @param now - Current date (injectable for testing)
 */
export function getStatementUrgency(
  dueDay: number,
  periodYear: number,
  periodMonth: number,
  now: Date = new Date(),
): UrgencyLevel {
  const dueDate = new Date(periodYear, periodMonth - 1, dueDay)

  const diffMs = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'approaching'
  return 'normal'
}

/**
 * Returns the number of days until the due date. Negative means overdue.
 */
export function getDaysUntilDue(
  dueDay: number,
  periodYear: number,
  periodMonth: number,
  now: Date = new Date(),
): number {
  const dueDate = new Date(periodYear, periodMonth - 1, dueDay)
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Returns the current billing period (year + month) from the client date.
 */
export function getCurrentPeriod(now: Date = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * Formats a period as a localized month + year string.
 */
export function formatPeriod(year: number, month: number, locale: string = 'en'): string {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export type UrgencyLevel = 'normal' | 'approaching' | 'overdue'

/** Statement should be published this many days before the payment due date */
const PUBLISH_BUFFER_DAYS = 3

/** Urgency kicks in this many days before the publish-by date */
const APPROACHING_THRESHOLD_DAYS = 3

/**
 * Returns the statement publish-by day for a given payment due day.
 * E.g., payment due 10th → publish by 7th.
 */
export function getPublishByDay(paymentDueDay: number): number {
  return Math.max(1, paymentDueDay - PUBLISH_BUFFER_DAYS)
}

/**
 * Computes the urgency level for a statement based on proximity to the publish-by date.
 * The publish-by date is PUBLISH_BUFFER_DAYS before the payment due date,
 * giving tenants time to review before payment is expected.
 *
 * @param paymentDueDay - The unit's due_day_of_month (1-28)
 * @param periodYear - The billing period year
 * @param periodMonth - The billing period month (1-12)
 * @param now - Current date (injectable for testing)
 */
export function getStatementUrgency(
  paymentDueDay: number,
  periodYear: number,
  periodMonth: number,
  now: Date = new Date(),
): UrgencyLevel {
  const publishByDay = getPublishByDay(paymentDueDay)
  const publishByDate = new Date(periodYear, periodMonth - 1, publishByDay)

  const diffMs = publishByDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= APPROACHING_THRESHOLD_DAYS) return 'approaching'
  return 'normal'
}

/**
 * Returns the number of days until the publish-by date. Negative means overdue.
 */
export function getDaysUntilPublishBy(
  paymentDueDay: number,
  periodYear: number,
  periodMonth: number,
  now: Date = new Date(),
): number {
  const publishByDay = getPublishByDay(paymentDueDay)
  const publishByDate = new Date(periodYear, periodMonth - 1, publishByDay)
  return Math.ceil((publishByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Returns the number of days until the payment due date. Negative means overdue.
 */
export function getDaysUntilDue(
  paymentDueDay: number,
  periodYear: number,
  periodMonth: number,
  now: Date = new Date(),
): number {
  const dueDate = new Date(periodYear, periodMonth - 1, paymentDueDay)
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

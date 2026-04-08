/**
 * Formats a day count for display in urgency labels.
 * Handles negative values (overdue) by using the absolute value.
 */
export function formatDays(n: number): string {
  const abs = Math.abs(n)
  if (abs === 0) return 'today'
  return abs === 1 ? '1 day' : `${abs} days`
}

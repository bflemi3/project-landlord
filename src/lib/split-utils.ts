/**
 * Convert a percentage (0-100) to a dollar amount, snapped to the nearest step.
 */
export function percentToAmount(percent: number, total: number, step: number): number {
  const raw = (percent / 100) * total
  return Math.round(raw / step) * step
}

/**
 * Convert a dollar amount to a percentage (0-100) of the total.
 */
export function amountToPercent(amount: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((amount / total) * 100)))
}

/**
 * Snap a percentage so its corresponding dollar amount aligns to the step.
 * Returns the snapped percentage.
 */
export function snapPercentToStep(percent: number, total: number, step: number): number {
  if (total <= 0) return percent
  const snappedAmount = percentToAmount(percent, total, step)
  return amountToPercent(snappedAmount, total)
}

/**
 * Get the slider config for a given split mode.
 */
export function getSliderConfig(
  mode: 'percent' | 'amount',
  percent: number,
  total: number,
  step: number,
): { min: number; max: number; step: number; value: number } {
  if (mode === 'amount' && total > 0) {
    return {
      min: 0,
      max: total,
      step,
      value: percentToAmount(percent, total, step),
    }
  }
  return {
    min: 0,
    max: 100,
    step: 1,
    value: percent,
  }
}

/**
 * Convert a slider value back to a percentage based on the mode.
 */
export function sliderValueToPercent(
  value: number,
  mode: 'percent' | 'amount',
  total: number,
): number {
  if (mode === 'amount' && total > 0) {
    return amountToPercent(value, total)
  }
  return Math.min(100, Math.max(0, value))
}

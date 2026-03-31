import { describe, it, expect } from 'vitest'
import {
  percentToAmount,
  amountToPercent,
  snapPercentToStep,
  getSliderConfig,
  sliderValueToPercent,
} from '../split-utils'

describe('percentToAmount', () => {
  it('converts 50% of 600 to 300', () => {
    expect(percentToAmount(50, 600, 5)).toBe(300)
  })

  it('snaps to nearest step', () => {
    // 83.33% of 600 = 500, which is already a step of 5
    expect(percentToAmount(83, 600, 5)).toBe(500)
  })

  it('snaps 33% of 600 to nearest 5 (198 -> 200)', () => {
    expect(percentToAmount(33, 600, 5)).toBe(200)
  })

  it('handles 0%', () => {
    expect(percentToAmount(0, 600, 5)).toBe(0)
  })

  it('handles 100%', () => {
    expect(percentToAmount(100, 600, 5)).toBe(600)
  })

  it('handles step of 1', () => {
    expect(percentToAmount(33, 600, 1)).toBe(198)
  })

  it('handles total of 0', () => {
    expect(percentToAmount(50, 0, 5)).toBe(0)
  })
})

describe('amountToPercent', () => {
  it('converts 300 of 600 to 50%', () => {
    expect(amountToPercent(300, 600)).toBe(50)
  })

  it('converts 500 of 600 to 83%', () => {
    expect(amountToPercent(500, 600)).toBe(83)
  })

  it('converts 0 to 0%', () => {
    expect(amountToPercent(0, 600)).toBe(0)
  })

  it('converts total to 100%', () => {
    expect(amountToPercent(600, 600)).toBe(100)
  })

  it('clamps above 100', () => {
    expect(amountToPercent(700, 600)).toBe(100)
  })

  it('handles total of 0', () => {
    expect(amountToPercent(100, 0)).toBe(0)
  })
})

describe('snapPercentToStep', () => {
  it('snaps 58% of 600 (348) to 350 -> 58%', () => {
    const result = snapPercentToStep(58, 600, 5)
    const amount = percentToAmount(result, 600, 5)
    expect(amount % 5).toBe(0)
  })

  it('50% of 600 stays as 50% (300 is aligned to 5)', () => {
    expect(snapPercentToStep(50, 600, 5)).toBe(50)
  })

  it('handles total of 0', () => {
    expect(snapPercentToStep(50, 0, 5)).toBe(50)
  })
})

describe('getSliderConfig', () => {
  it('returns 0-100 step 1 for percent mode', () => {
    const config = getSliderConfig('percent', 50, 600, 5)
    expect(config).toEqual({ min: 0, max: 100, step: 1, value: 50 })
  })

  it('returns 0-total step 5 for amount mode', () => {
    const config = getSliderConfig('amount', 50, 600, 5)
    expect(config).toEqual({ min: 0, max: 600, step: 5, value: 300 })
  })

  it('falls back to percent mode if total is 0', () => {
    const config = getSliderConfig('amount', 50, 0, 5)
    expect(config).toEqual({ min: 0, max: 100, step: 1, value: 50 })
  })

  it('snaps amount value to step', () => {
    const config = getSliderConfig('amount', 33, 600, 5)
    expect(config.value % 5).toBe(0)
  })
})

describe('sliderValueToPercent', () => {
  it('passes through in percent mode', () => {
    expect(sliderValueToPercent(50, 'percent', 600)).toBe(50)
  })

  it('converts 300 to 50% in amount mode', () => {
    expect(sliderValueToPercent(300, 'amount', 600)).toBe(50)
  })

  it('converts 500 to 83% in amount mode', () => {
    expect(sliderValueToPercent(500, 'amount', 600)).toBe(83)
  })

  it('converts 0 to 0% in amount mode', () => {
    expect(sliderValueToPercent(0, 'amount', 600)).toBe(0)
  })

  it('converts total to 100% in amount mode', () => {
    expect(sliderValueToPercent(600, 'amount', 600)).toBe(100)
  })

  it('clamps to 0-100', () => {
    expect(sliderValueToPercent(-10, 'percent', 600)).toBe(0)
    expect(sliderValueToPercent(110, 'percent', 600)).toBe(100)
  })
})

import { describe, it, expect } from 'vitest'

import { formatCnpj } from '../format'

describe('formatCnpj', () => {
  it('returns empty string for empty input', () => {
    expect(formatCnpj('')).toBe('')
  })

  it('keeps 1–2 digits unformatted', () => {
    expect(formatCnpj('1')).toBe('1')
    expect(formatCnpj('11')).toBe('11')
  })

  it('inserts the first dot at 3 digits', () => {
    expect(formatCnpj('112')).toBe('11.2')
  })

  it('keeps 5 digits in the first-dot range', () => {
    // 5 digits is the last point before the second dot kicks in.
    expect(formatCnpj('11222')).toBe('11.222')
  })

  it('inserts the second dot at 6 digits', () => {
    expect(formatCnpj('112223')).toBe('11.222.3')
  })

  it('keeps 8 digits in the two-dot range', () => {
    // 8 digits is the last point before the slash kicks in.
    expect(formatCnpj('11222333')).toBe('11.222.333')
  })

  it('inserts the slash at 9 digits', () => {
    expect(formatCnpj('112223333')).toBe('11.222.333/3')
  })

  it('keeps 12 digits in the slash range', () => {
    // 12 digits is the last point before the dash kicks in.
    expect(formatCnpj('112223330001')).toBe('11.222.333/0001')
  })

  it('inserts the dash at 13 digits', () => {
    expect(formatCnpj('1122233300018')).toBe('11.222.333/0001-8')
  })

  it('formats a complete 14-digit CNPJ', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('is idempotent on already-formatted input', () => {
    expect(formatCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })

  it('truncates input beyond 14 digits', () => {
    expect(formatCnpj('112223330001819999')).toBe('11.222.333/0001-81')
  })

  it('strips non-digit punctuation and re-masks', () => {
    expect(formatCnpj('11-222-333-0001-81')).toBe('11.222.333/0001-81')
    expect(formatCnpj('11 222 333 0001 81')).toBe('11.222.333/0001-81')
  })

  it('strips letters', () => {
    expect(formatCnpj('abc11222333000181xyz')).toBe('11.222.333/0001-81')
  })
})

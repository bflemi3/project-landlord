import { describe, it, expect } from 'vitest'

import { formatCpf } from '../format'

describe('formatCpf', () => {
  it('returns empty string for empty input', () => {
    expect(formatCpf('')).toBe('')
  })

  it('keeps 1–3 digits unformatted', () => {
    expect(formatCpf('0')).toBe('0')
    expect(formatCpf('04')).toBe('04')
    expect(formatCpf('040')).toBe('040')
  })

  it('inserts the first dot at 4 digits', () => {
    expect(formatCpf('0400')).toBe('040.0')
  })

  it('inserts the second dot at 7 digits', () => {
    expect(formatCpf('0400323')).toBe('040.032.3')
  })

  it('inserts the dash at 10 digits', () => {
    expect(formatCpf('0400323290')).toBe('040.032.329-0')
  })

  it('formats a complete 11-digit CPF', () => {
    expect(formatCpf('04003232909')).toBe('040.032.329-09')
  })

  it('is idempotent on already-formatted input', () => {
    expect(formatCpf('040.032.329-09')).toBe('040.032.329-09')
  })

  it('truncates input beyond 11 digits', () => {
    expect(formatCpf('040032329091234')).toBe('040.032.329-09')
  })

  it('strips non-digit punctuation and re-masks', () => {
    expect(formatCpf('040-032-329-09')).toBe('040.032.329-09')
    expect(formatCpf('040 032 329 09')).toBe('040.032.329-09')
  })

  it('strips letters', () => {
    expect(formatCpf('abc04003232909xyz')).toBe('040.032.329-09')
  })

  it('handles partial paste with mixed punctuation', () => {
    expect(formatCpf('040.032')).toBe('040.032')
    expect(formatCpf('040.032.')).toBe('040.032')
  })
})

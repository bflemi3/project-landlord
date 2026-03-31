import { describe, it, expect } from 'vitest'
import { isValidEmail } from '../validation'

describe('isValidEmail', () => {
  it('accepts standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true)
  })

  it('accepts email with dots in local part', () => {
    expect(isValidEmail('first.last@example.com')).toBe(true)
  })

  it('accepts email with plus sign', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true)
  })

  it('accepts email with numbers', () => {
    expect(isValidEmail('user123@example.com')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('rejects whitespace only', () => {
    expect(isValidEmail('   ')).toBe(false)
  })

  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
  })

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false)
  })

  it('rejects missing TLD', () => {
    expect(isValidEmail('user@example')).toBe(false)
  })

  it('rejects spaces in email', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })

  it('rejects multiple @ signs', () => {
    expect(isValidEmail('user@@example.com')).toBe(false)
  })
})

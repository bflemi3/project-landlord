import { describe, it, expect } from 'vitest'
import { generateInviteCode } from '../generate-invite-code'

describe('generateInviteCode', () => {
  it('generates a code with MABENN- prefix', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^MABENN-[A-Z2-9]{4}$/)
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()))
    expect(codes.size).toBe(50)
  })

  it('only uses unambiguous characters (no 0, O, 1, I)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode()
      const suffix = code.split('-')[1]
      expect(suffix).not.toMatch(/[01IO]/)
    }
  })
})

import { describe, it, expect } from 'vitest'

import {
  waitlistModalSchema,
  ROLE_TOKENS,
  PROPERTY_COUNT_TOKENS,
  WORKFLOW_TOKENS,
} from '../waitlist'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    email: 'maria@example.com',
    role: 'landlord',
    propertyCount: '2-5',
    workflow: ['spreadsheet'],
    feedback: '',
    ...overrides,
  }
}

function firstIssue(
  result: ReturnType<typeof waitlistModalSchema.safeParse>,
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

function omit(field: string) {
  const v: Record<string, unknown> = valid()
  delete v[field]
  return v
}

describe('waitlistModalSchema — happy paths', () => {
  it('accepts a complete submission', () => {
    expect(waitlistModalSchema.safeParse(valid()).success).toBe(true)
  })

  it('accepts an omitted feedback field (optional)', () => {
    expect(waitlistModalSchema.safeParse(omit('feedback')).success).toBe(true)
  })

  it('accepts every role token', () => {
    for (const role of ROLE_TOKENS) {
      expect(waitlistModalSchema.safeParse(valid({ role })).success).toBe(true)
    }
  })

  it('accepts every property-count token', () => {
    for (const propertyCount of PROPERTY_COUNT_TOKENS) {
      expect(
        waitlistModalSchema.safeParse(valid({ propertyCount })).success,
      ).toBe(true)
    }
  })

  it('accepts every workflow token (including email)', () => {
    expect(WORKFLOW_TOKENS).toContain('email')
    for (const workflow of WORKFLOW_TOKENS) {
      expect(
        waitlistModalSchema.safeParse(valid({ workflow: [workflow] })).success,
      ).toBe(true)
    }
  })

  it('accepts multiple workflow selections', () => {
    expect(
      waitlistModalSchema.safeParse(
        valid({ workflow: ['whatsapp', 'spreadsheet', 'bank_app'] }),
      ).success,
    ).toBe(true)
  })
})

describe('waitlistModalSchema — email', () => {
  it('rejects empty email with "invalidEmail"', () => {
    const r = waitlistModalSchema.safeParse(valid({ email: '' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })

  it('rejects a malformed email with "invalidEmail"', () => {
    const r = waitlistModalSchema.safeParse(valid({ email: 'nope' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'email')).toBe('invalidEmail')
  })
})

describe('waitlistModalSchema — required choice fields', () => {
  it('rejects a missing role with "required"', () => {
    const r = waitlistModalSchema.safeParse(omit('role'))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'role')).toBe('required')
  })

  it('rejects an out-of-set role with "required"', () => {
    const r = waitlistModalSchema.safeParse(valid({ role: 'hacker' }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'role')).toBe('required')
  })

  it('rejects a missing property count with "required"', () => {
    const r = waitlistModalSchema.safeParse(omit('propertyCount'))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'propertyCount')).toBe('required')
  })

  it('rejects an empty workflow selection with "required"', () => {
    const r = waitlistModalSchema.safeParse(valid({ workflow: [] }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'workflow')).toBe('required')
  })

  it('rejects a missing workflow with "required"', () => {
    const r = waitlistModalSchema.safeParse(omit('workflow'))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'workflow')).toBe('required')
  })
})

describe('waitlistModalSchema — feedback', () => {
  it('accepts feedback at exactly 1000 chars', () => {
    expect(
      waitlistModalSchema.safeParse(valid({ feedback: 'a'.repeat(1000) }))
        .success,
    ).toBe(true)
  })

  it('rejects feedback over 1000 chars with "tooLong"', () => {
    const r = waitlistModalSchema.safeParse(valid({ feedback: 'a'.repeat(1001) }))
    expect(r.success).toBe(false)
    expect(firstIssue(r, 'feedback')).toBe('tooLong')
  })

  it('trims feedback before length validation', () => {
    const r = waitlistModalSchema.safeParse(
      valid({ feedback: `  ${'a'.repeat(998)}  ` }),
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.feedback).toBe('a'.repeat(998))
  })
})

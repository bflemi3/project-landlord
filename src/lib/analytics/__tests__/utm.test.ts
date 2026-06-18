import { describe, it, expect } from 'vitest'

import { parseAttribution, type Attribution } from '../utm'

describe('parseAttribution', () => {
  it('extracts all five utm params from the query string', () => {
    const a = parseAttribution(
      '?utm_source=facebook&utm_medium=cpc&utm_campaign=launch&utm_content=hero&utm_term=aluguel',
      '',
      '/',
    )
    expect(a.utm_source).toBe('facebook')
    expect(a.utm_medium).toBe('cpc')
    expect(a.utm_campaign).toBe('launch')
    expect(a.utm_content).toBe('hero')
    expect(a.utm_term).toBe('aluguel')
  })

  it('works without the leading "?"', () => {
    expect(parseAttribution('utm_source=reddit', '', '/').utm_source).toBe(
      'reddit',
    )
  })

  it('returns null for absent utm params', () => {
    const a = parseAttribution('?utm_source=x', '', '/')
    expect(a.utm_source).toBe('x')
    expect(a.utm_medium).toBeNull()
    expect(a.utm_campaign).toBeNull()
    expect(a.utm_content).toBeNull()
    expect(a.utm_term).toBeNull()
  })

  it('ignores non-utm query params', () => {
    const a = parseAttribution('?foo=bar&utm_source=x&ref=y', '', '/')
    expect(a.utm_source).toBe('x')
    expect(Object.keys(a)).not.toContain('foo')
  })

  it('captures the referrer, or null when empty', () => {
    expect(parseAttribution('', 'https://t.co/abc', '/').referrer).toBe(
      'https://t.co/abc',
    )
    expect(parseAttribution('', '', '/').referrer).toBeNull()
    expect(parseAttribution('', '   ', '/').referrer).toBeNull()
  })

  it('captures the landing path, defaulting to "/" when empty', () => {
    expect(parseAttribution('', '', '/precos').landing_path).toBe('/precos')
    expect(parseAttribution('', '', '').landing_path).toBe('/')
  })

  it('trims surrounding whitespace from utm values and drops empties to null', () => {
    const a = parseAttribution('?utm_source=%20%20&utm_medium=%20social%20', '', '/')
    expect(a.utm_source).toBeNull()
    expect(a.utm_medium).toBe('social')
  })

  it('produces an object with exactly the attribution keys', () => {
    const a: Attribution = parseAttribution('', '', '/')
    expect(Object.keys(a).sort()).toEqual(
      [
        'landing_path',
        'referrer',
        'utm_campaign',
        'utm_content',
        'utm_medium',
        'utm_source',
        'utm_term',
      ].sort(),
    )
  })
})

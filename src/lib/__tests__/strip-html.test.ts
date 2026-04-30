import { describe, expect, it } from 'vitest'

import { stripHtml } from '@/lib/strip-html'

describe('stripHtml', () => {
  it('removes html tags while preserving text', () => {
    expect(stripHtml('<strong>Rua Augusta</strong> 123')).toBe('Rua Augusta 123')
  })
})

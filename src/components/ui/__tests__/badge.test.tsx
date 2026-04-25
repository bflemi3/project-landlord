import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Badge } from '../badge'

afterEach(cleanup)

describe('Badge', () => {
  describe('variant="success"', () => {
    it('applies bg-success and text-success-foreground tokens', () => {
      render(<Badge variant="success">Paid</Badge>)
      const badge = screen.getByText('Paid')
      expect(badge.className).toContain('bg-success')
      expect(badge.className).toContain('text-success-foreground')
    })
  })

  describe('variant="success-subtle"', () => {
    it('applies bg-success-subtle and text-success-subtle-foreground tokens', () => {
      render(<Badge variant="success-subtle">Done</Badge>)
      const badge = screen.getByText('Done')
      expect(badge.className).toContain('bg-success-subtle')
      expect(badge.className).toContain('text-success-subtle-foreground')
    })
  })

  describe('icon-only composition', () => {
    it('renders a badge containing only an svg child', () => {
      render(
        <Badge variant="success-subtle" aria-label="Done">
          <svg data-testid="check-icon" viewBox="0 0 24 24" />
        </Badge>,
      )
      const icon = screen.getByTestId('check-icon')
      expect(icon).toBeDefined()
      const badge = icon.parentElement!
      expect(badge.className).toContain('bg-success-subtle')
    })
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

const mockUseReducedMotion = vi.fn(() => false)

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

afterEach(() => {
  cleanup()
  mockUseReducedMotion.mockReset()
  mockUseReducedMotion.mockReturnValue(false)
})

describe('SlideIn', () => {
  it('renders children with motion when reduced motion is not preferred', async () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { SlideIn } = await import('../slide-in')

    render(
      <SlideIn activeKey="step-1">
        <div data-testid="child">Step 1</div>
      </SlideIn>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders children without motion when reduced motion is preferred', async () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { SlideIn } = await import('../slide-in')

    const { container } = render(
      <SlideIn activeKey="step-1">
        <div data-testid="child">Step 1</div>
      </SlideIn>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    const motionDivs = container.querySelectorAll('[style*="transform"]')
    expect(motionDivs.length).toBe(0)
  })
})

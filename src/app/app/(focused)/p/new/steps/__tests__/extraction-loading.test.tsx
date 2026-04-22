import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const enMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'),
) as Record<string, unknown>

const mockUseReducedMotion = vi.fn(() => false)
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('ExtractionLoading', () => {
  it('renders the four section labels', async () => {
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)
    expect(screen.getByText('Property')).toBeInTheDocument()
    expect(screen.getByText('Rent & dates')).toBeInTheDocument()
    expect(screen.getByText('Parties')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
  })

  it('rotates copy lines when motion is allowed', async () => {
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)

    expect(screen.getByText('Reading your contract.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2200)
    })
    expect(screen.getByText('Finding addresses and dates.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2200)
    })
    expect(screen.getByText('Identifying the parties.')).toBeInTheDocument()
  })

  it('prefers-reduced-motion: renders static copy and does not rotate', async () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)

    // Static line uses "static" key
    expect(screen.getByText('Reading your contract…')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Still the static line, no rotation
    expect(screen.getByText('Reading your contract…')).toBeInTheDocument()
    expect(screen.queryByText('Finding addresses and dates.')).not.toBeInTheDocument()
  })

  it('prefers-reduced-motion: uses aria-live="polite" on the static copy', async () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)

    const copy = document.querySelector('[data-slot="extraction-loading-copy"]')
    expect(copy?.getAttribute('aria-live')).toBe('polite')
  })

  it('rotating copy uses aria-live="off" to avoid disruptive announcements', async () => {
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)

    const copy = document.querySelector('[data-slot="extraction-loading-copy"]')
    expect(copy?.getAttribute('aria-live')).toBe('off')
  })

  it('prefers-reduced-motion: skeleton elements carry animate-none', async () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { ExtractionLoading } = await import('../extraction-loading')
    renderWithIntl(<ExtractionLoading />)

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
    for (const s of skeletons) {
      expect(s.className).toContain('animate-none')
    }
  })
})

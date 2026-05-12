import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { WizardShell } from '../wizard-shell'

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
})

afterEach(cleanup)

function Harness({
  initialStep = 1,
  onBack,
  onSaveForLater,
  onDiscard,
}: {
  initialStep?: number
  onBack?: () => void
  onSaveForLater?: () => void
  onDiscard?: () => void
}) {
  const [step] = useState(initialStep)
  const [promptOpen, setPromptOpen] = useState(false)

  return (
    <>
      <WizardShell
        wizardId="test"
        currentStep={step}
        totalSteps={3}
        onBack={onBack}
        onExit={() => setPromptOpen(true)}
      >
        <WizardShell.TopBar>
          <WizardShell.Back label="Back" />
          <WizardShell.StepCount label={`Step ${step} of 3`} />
          <WizardShell.Close ariaLabel="Exit" />
        </WizardShell.TopBar>
        <WizardShell.Progress />
        <WizardShell.Steps>
          <WizardShell.Step step={1}>Step one content</WizardShell.Step>
          <WizardShell.Step step={2}>Step two content</WizardShell.Step>
          <WizardShell.Step step={3}>Step three content</WizardShell.Step>
        </WizardShell.Steps>
      </WizardShell>
      <WizardShell.ExitPrompt
        open={promptOpen}
        onOpenChange={setPromptOpen}
        title="Keep your progress?"
        description="Your work is saved."
        saveForLaterLabel="Save for later"
        discardLabel="Discard"
        exitHref="/app"
        onSaveForLater={onSaveForLater}
        onDiscard={onDiscard}
      />
    </>
  )
}

describe('WizardShell', () => {
  it('hides the back button on step 1', () => {
    render(<Harness initialStep={1} onBack={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })

  it('renders the back button on later steps', () => {
    render(<Harness initialStep={2} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('fires onBack when the back button is clicked', () => {
    const onBack = vi.fn()
    render(<Harness initialStep={2} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('opens the exit prompt when the close button is clicked and fires the save callback', () => {
    const onSaveForLater = vi.fn()
    render(<Harness onSaveForLater={onSaveForLater} />)

    fireEvent.click(screen.getByRole('button', { name: /exit/i }))
    const saveLink = screen.getByRole('link', { name: /save for later/i })
    fireEvent.click(saveLink)

    expect(onSaveForLater).toHaveBeenCalledTimes(1)
    expect(saveLink).toHaveAttribute('href', '/app')
  })

  it('fires the discard callback from the exit prompt', () => {
    const onDiscard = vi.fn()
    render(<Harness onDiscard={onDiscard} />)

    fireEvent.click(screen.getByRole('button', { name: /exit/i }))
    const discardLink = screen.getByRole('link', { name: /discard/i })
    fireEvent.click(discardLink)

    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(discardLink).toHaveAttribute('href', '/app')
  })

  it('renders only the active step slot', () => {
    render(<Harness initialStep={1} onBack={vi.fn()} />)
    expect(screen.getByText('Step one content')).toBeInTheDocument()
    expect(screen.queryByText('Step two content')).not.toBeInTheDocument()
  })
})

'use client'

import * as React from 'react'
import Link from 'next/link'
import { Suspense, lazy } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { StepProgress } from '@/components/step-progress'
import { ResponsiveModal } from '@/components/responsive-modal'

const slideInPromise = import('@/components/slide-in')
const SlideIn = lazy(() => slideInPromise.then((m) => ({ default: m.SlideIn })))

const WIDTH = 'max-w-xl'

interface WizardShellContextValue {
  currentStep: number
  totalSteps: number
  onBack?: () => void
  onExit?: () => void
}

const WizardShellContext = React.createContext<WizardShellContextValue>({
  currentStep: 1,
  totalSteps: 1,
})

interface WizardShellProps {
  wizardId: string
  currentStep: number
  totalSteps: number
  onBack?: () => void
  onExit?: () => void
  className?: string
  children: React.ReactNode
}

function WizardShell({
  wizardId,
  currentStep,
  totalSteps,
  onBack,
  onExit,
  className,
  children,
}: WizardShellProps) {
  return (
    <WizardShellContext.Provider value={{ currentStep, totalSteps, onBack, onExit }}>
      <div
        data-slot="wizard-shell"
        data-wizard-id={wizardId}
        className={cn('flex h-full flex-col overflow-hidden pt-8', className)}
      >
        {children}
      </div>
    </WizardShellContext.Provider>
  )
}

function WizardShellTopBar({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="wizard-shell-top-bar"
      className={cn(`mx-auto w-full px-6 ${WIDTH}`, className)}
      {...props}
    >
      <div className="mb-4 flex items-center justify-between">{children}</div>
    </div>
  )
}

interface WizardShellBackProps extends React.ComponentProps<'div'> {
  label: string
}

function WizardShellBack({ className, label, ...props }: WizardShellBackProps) {
  const { currentStep, onBack } = React.useContext(WizardShellContext)
  return (
    <div className={cn('w-20', className)} {...props}>
      {currentStep > 1 && onBack && (
        <Button variant="ghost"  onClick={onBack} data-slot="wizard-shell-back">
          <ChevronLeft />
          {label}
        </Button>
      )}
    </div>
  )
}

interface WizardShellCloseProps extends React.ComponentProps<'div'> {
  ariaLabel: string
}

function WizardShellClose({ className, ariaLabel, ...props }: WizardShellCloseProps) {
  const { onExit } = React.useContext(WizardShellContext)
  return (
    <div className={cn('flex w-20 justify-end', className)} {...props}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        aria-label={ariaLabel}
        data-slot="wizard-shell-close"
      >
        <X />
      </Button>
    </div>
  )
}

interface WizardShellStepCountProps extends React.ComponentProps<'p'> {
  label: string
}

function WizardShellStepCount({ className, label, ...props }: WizardShellStepCountProps) {
  return (
    <p
      data-slot="wizard-shell-step-count"
      className={cn('text-muted-foreground', className)}
      {...props}
    >
      {label}
    </p>
  )
}

function WizardShellProgress({ className, ...props }: React.ComponentProps<'div'>) {
  const { currentStep, totalSteps } = React.useContext(WizardShellContext)
  return (
    <div
      data-slot="wizard-shell-progress"
      className={cn(`mx-auto w-full px-6 ${WIDTH}`, className)}
      {...props}
    >
      <StepProgress current={currentStep} total={totalSteps} />
    </div>
  )
}

function WizardShellSteps({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { currentStep } = React.useContext(WizardShellContext)
  const childArray = React.Children.toArray(children)
  const firstStepOnly = currentStep === 1

  return (
    <div
      data-slot="wizard-shell-steps"
      className={cn('min-h-0 flex-1 overflow-y-auto', className)}
      {...props}
    >
      {firstStepOnly ? (
        childArray[0]
      ) : (
        <Suspense fallback={null}>
          <SlideIn activeKey={currentStep} className="flex flex-1 flex-col">
            {childArray[currentStep - 1]}
          </SlideIn>
        </Suspense>
      )}
    </div>
  )
}

interface WizardShellStepProps extends React.ComponentProps<'div'> {
  /** 1-indexed step this slot represents. Present for readability; rendering uses position in children. */
  step: number
}

function WizardShellStep({ className, step, children, ...props }: WizardShellStepProps) {
  return (
    <div
      data-slot="wizard-shell-step"
      data-step={step}
      className={cn(`mx-auto flex w-full flex-col px-6 pb-8 ${WIDTH}`, className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface WizardShellExitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  saveForLaterLabel: string
  discardLabel: string
  /** Destination for both CTAs. Rendered as `<Link>` so Next prefetches it. */
  exitHref: string
  /** Runs synchronously before the Link navigates. For analytics only — state cleanup belongs in onDiscard. */
  onSaveForLater?: () => void
  /** Runs synchronously before the Link navigates. Clear persisted wizard state here. */
  onDiscard?: () => void
}

function WizardShellExitPrompt({
  open,
  onOpenChange,
  title,
  description,
  saveForLaterLabel,
  discardLabel,
  exitHref,
  onSaveForLater,
  onDiscard,
}: WizardShellExitPromptProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModal.Header data-slot="wizard-shell-exit-prompt-header">
        <ResponsiveModal.Title>{title}</ResponsiveModal.Title>
        <ResponsiveModal.Description>{description}</ResponsiveModal.Description>
      </ResponsiveModal.Header>
      <ResponsiveModal.Footer
        data-slot="wizard-shell-exit-prompt-actions"
        className="flex flex-col gap-2"
      >
        <Link
          href={exitHref}
          prefetch
          className={cn(buttonVariants({ variant: 'default' }))}
          onClick={onSaveForLater}
        >
          {saveForLaterLabel}
        </Link>
        <Link
          href={exitHref}
          prefetch
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'text-destructive hover:text-destructive',
          )}
          onClick={onDiscard}
        >
          {discardLabel}
        </Link>
      </ResponsiveModal.Footer>
    </ResponsiveModal>
  )
}

WizardShell.TopBar = WizardShellTopBar
WizardShell.Back = WizardShellBack
WizardShell.Close = WizardShellClose
WizardShell.StepCount = WizardShellStepCount
WizardShell.Progress = WizardShellProgress
WizardShell.Steps = WizardShellSteps
WizardShell.Step = WizardShellStep
WizardShell.ExitPrompt = WizardShellExitPrompt

export {
  WizardShell,
  WizardShellTopBar,
  WizardShellBack,
  WizardShellClose,
  WizardShellStepCount,
  WizardShellProgress,
  WizardShellSteps,
  WizardShellStep,
  WizardShellExitPrompt,
}

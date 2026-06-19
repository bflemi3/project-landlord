'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardShellClassName } from '@/components/ui/card'
import { IconTile } from '@/components/icon-tile'
import { cn } from '@/lib/utils'

import { CHECKOUT_SECTIONS, type SectionId } from '../../state/registry'
import {
  useIsSectionActive,
  useIsSectionRequired,
  useIsSectionUpNext,
  usePropertyCreationActions,
  usePropertyCreationState,
  useSectionStatus,
  useSectionValidity,
} from '../../state/use-property-creation'
import { useSectionController } from './use-section-controller'

type SectionStatus = 'upcoming' | 'completed' | 'skipped'

// SectionGroup — controlled root that wraps the underlying accordion primitive.
// Translates between the single-active-id contract the parent uses and the
// array-of-open-ids contract the primitive expects.

interface SectionGroupProps {
  activeId: string | null
  className?: string
  children: ReactNode
  onActiveChange: (id: string) => void
}

function SectionGroup({ activeId, className, children, onActiveChange }: SectionGroupProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="section-group"
      value={activeId === null ? [] : [activeId]}
      onValueChange={(next) => {
        // base-ui emits the new array of open ids. With `multiple=false` (the
        // default) tapping the active header would collapse it to `[]` — the
        // spec forbids tap-to-close on the active section, so ignore.
        if (next.length === 0) return
        onActiveChange(next[0] as string)
      }}
      className={cn('flex flex-col gap-4 md:gap-6', className)}
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

// Section context — provided by Section, consumed by its sub-components so each
// part can derive its own behavior without prop drilling.

// Context only carries the section id. Every other piece (status, isActive,
// isUpNext, validity, handlers) lives in the Zustand store; subcomponents
// subscribe to what they need directly so re-renders stay tight.
const SectionContext = createContext<SectionId | null>(null)

function useSectionId(part: string): SectionId {
  const id = useContext(SectionContext)
  if (!id) {
    throw new Error(`<Section.${part}> must be rendered inside <Section>.`)
  }
  return id
}

// Section — one item in the SectionGroup. Rendered as a card; provides the
// section context to its children.

interface SectionProps {
  children: ReactNode
  className?: string
  id: SectionId
  /** Fires once when the section first becomes active. Sections use this
   *  to promote per-section touched state so extracted-invalid rows light
   *  up the moment the user lands. `markSectionVisited` is handled inside
   *  the primitive — this callback is for section-specific work. */
  onFirstVisit?: () => void
  /** Fires on the active → inactive transition (Continue / Skip / opening
   *  a different section). Sections typically promote touched state here
   *  so partially-filled contents surface inline errors on return. */
  onLeave?: () => void
}

function Section({ children, className, id, onFirstVisit, onLeave }: SectionProps) {
  const isActive = useIsSectionActive(id)
  const isUpNext = useIsSectionUpNext(id)
  const status = useSectionStatus(id)
  const validity = useSectionValidity(id)
  const visited = usePropertyCreationState((s) => s.visitedSectionIds.has(id))
  const { markSectionVisited } = usePropertyCreationActions()
  const isLockedUpcoming = status === 'upcoming' && !isActive && !isUpNext

  useEffect(() => {
    if (isActive && !visited) {
      markSectionVisited(id)
      onFirstVisit?.()
    }
  }, [id, isActive, visited, markSectionVisited, onFirstVisit])

  // The ref initializes to the current `isActive` on each mount, so Strict
  // Mode's double-mount can't synthesize a spurious transition.
  const wasActive = useRef(isActive)
  useEffect(() => {
    if (wasActive.current && !isActive) {
      onLeave?.()
    }
    wasActive.current = isActive
  }, [isActive, onLeave])

  return (
    <SectionContext.Provider value={id}>
      <AccordionPrimitive.Item
        data-slot="section"
        data-section-id={id}
        data-status={validity}
        data-active={isActive ? 'true' : 'false'}
        value={id}
        disabled={isLockedUpcoming}
        className={cn(
          // No padding on the shell so the Trigger fills the collapsed card
          // and tap targets cover the whole surface. Children own padding.
          cardShellClassName({ size: 'none' }),
          'transition-shadow duration-300',
          isActive && 'shadow-card-hover',
          isLockedUpcoming && 'opacity-70',
          className,
        )}
      >
        {children}
      </AccordionPrimitive.Item>
    </SectionContext.Provider>
  )
}

// Section.Header — the tappable row containing icon, text column, status. Its
// children are flex items: typically <Section.Icon>, <Section.HeaderContent>,
// <Section.Status>. Forwards ref to the underlying trigger button so the parent
// can scroll the section into view.

interface SectionHeaderProps {
  children: ReactNode
  className?: string
  ref?: Ref<HTMLButtonElement>
}

function SectionHeader({ children, className, ref }: SectionHeaderProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="section-header"
        className={cn(
          // `p-6` on the trigger (not the parent card) so the entire
          // collapsed-card area is the click target.
          'rounded-card flex w-full scroll-mt-32 items-start gap-4 p-6 text-left',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
          'disabled:cursor-default aria-disabled:cursor-default',
          className,
        )}
      >
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

// Section.Icon — wraps the IconTile and derives its tone from section context.

interface SectionIconProps {
  children: ReactNode
  className?: string
}

function SectionIcon({ children, className }: SectionIconProps) {
  const id = useSectionId('Icon')
  const isActive = useIsSectionActive(id)
  const status = useSectionStatus(id)
  const tone = isActive ? 'primary' : status === 'completed' ? 'success' : 'muted'
  return (
    <IconTile data-slot="section-icon" tone={tone} size="lg" className={className}>
      {children}
    </IconTile>
  )
}

// Section.HeaderContent — the text column inside the header. Holds Title and
// Subtitle. Consumes flex space so Status anchors right.

function SectionHeaderContent({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="section-header-content" className={cn('min-w-0 flex-1', className)} {...props}>
      {children}
    </div>
  )
}

// Section.Title

function SectionTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="section-title"
      className={cn('text-foreground text-base font-semibold', className)}
      {...props}
    />
  )
}

// Section.Subtitle — short description of what the section is about. Visible
// while the section is upcoming or active; hidden when the section is
// completed-collapsed (Section.Summary takes its conceptual place below the
// header).

function SectionSubtitle({ className, ...props }: ComponentProps<'p'>) {
  const id = useSectionId('Subtitle')
  const isActive = useIsSectionActive(id)
  const status = useSectionStatus(id)
  const hidden = status === 'completed' && !isActive
  if (hidden) return null
  return (
    <p
      data-slot="section-subtitle"
      className={cn('text-muted-foreground mt-0.5 text-sm', className)}
      {...props}
    />
  )
}

// Section.Status — derives its content from section context. Consumers pass
// translated label strings so the primitive stays locale-agnostic.
//   active              → nothing (the expanded body speaks for itself)
//   invalid             → destructive Badge with alert icon (icon-only on mobile)
//   completed           → success-subtle Badge with check icon (icon-only on mobile)
//   skipped             → secondary Badge with skipped label
//   upcoming + isUpNext → muted up-next text
//   upcoming + locked   → nothing (header shows the section is not reachable)

interface SectionStatusProps {
  className?: string
  doneLabel: string
  needsAttentionLabel: string
  skippedLabel: string
  upNextLabel: string
}

function SectionStatus({
  className,
  doneLabel,
  needsAttentionLabel,
  skippedLabel,
  upNextLabel,
}: SectionStatusProps) {
  const id = useSectionId('Status')
  const isActive = useIsSectionActive(id)
  const isUpNext = useIsSectionUpNext(id)
  const status = useSectionStatus(id)
  const validity = useSectionValidity(id)

  if (isActive) return null

  if (validity === 'invalid') {
    return (
      <Badge
        data-slot="section-status"
        variant="destructive"
        aria-label={needsAttentionLabel}
        className={className}
      >
        <AlertCircle />
        <span className="hidden md:inline">{needsAttentionLabel}</span>
      </Badge>
    )
  }

  if (status === 'completed') {
    return (
      <Badge
        data-slot="section-status"
        variant="success-subtle"
        aria-label={doneLabel}
        className={className}
      >
        <Check />
        <span className="hidden md:inline">{doneLabel}</span>
      </Badge>
    )
  }

  if (status === 'skipped') {
    return (
      <Badge data-slot="section-status" variant="secondary" className={className}>
        {skippedLabel}
      </Badge>
    )
  }

  if (isUpNext) {
    return (
      <span
        data-slot="section-status"
        className={cn('text-muted-foreground text-sm font-medium', className)}
      >
        {upNextLabel}
      </span>
    )
  }

  return null
}

// Section.Summary — the filled-in data shown when a section is completed and
// collapsed. Replaces the Subtitle's role in the header below the icon column.

function SectionSummary({ children, className }: { children: ReactNode; className?: string }) {
  const id = useSectionId('Summary')
  const isActive = useIsSectionActive(id)
  const status = useSectionStatus(id)
  if (!(status === 'completed' && !isActive)) return null
  return (
    <p
      data-slot="section-summary"
      className={cn('text-muted-foreground mt-0.5 text-sm', className)}
    >
      {children}
    </p>
  )
}

// Section.Body — the expanded content area. Wraps the underlying accordion
// panel so opening/closing animates. Children are unmounted when collapsed
// (base-ui default); per-section forms should read state from the wizard store.

function SectionBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AccordionPrimitive.Panel
      data-slot="section-body"
      // `[--tw-duration:300ms]` sets the var the keyframes read WITHOUT also
      // setting `transition-duration` (which `duration-300` would). base-ui's
      // animation-type detection fails when both transition and animation
      // are declared on the Panel — leaving `--accordion-panel-height`
      // unmeasured and the keyframes inert.
      className="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-clip [--tw-duration:300ms] [overflow-clip-margin:6px]"
    >
      <div className={cn('flex flex-col gap-4 px-6 pb-4', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

// Section.Actions — Back / Skip / Continue row at the bottom of the active
// section.

// Pair with size="sm" to render section-scoped buttons compact on mobile and
// scale them up to the default Button size at md+. Reverses the global rule
// that buttons grow on mobile, because three actions in a row crowd the card.
const RESPONSIVE_BUTTON_CLASS = 'md:h-12 md:gap-2 md:px-6 md:text-base'

interface SectionActionsProps {
  backLabel?: string
  className?: string
  continueDisabled?: boolean
  continueLabel: string
  skipLabel?: string
  /** Async guard run before Continue advances. Return false to block. */
  onBeforeContinue?: () => Promise<boolean>
  /** Optional handler overrides. When provided, replace the default
   * controller-driven behavior — useful when a section needs to short-circuit
   * the standard advance/skip/back flow (rare). */
  onBack?: () => void
  onContinue?: () => void
  onSkip?: () => void
}

function SectionActions({
  backLabel,
  className,
  continueDisabled = false,
  continueLabel,
  skipLabel,
  onBeforeContinue,
  onBack,
  onContinue,
  onSkip,
}: SectionActionsProps) {
  const id = useSectionId('Actions')
  const isActive = useIsSectionActive(id)
  const isRequired = useIsSectionRequired(id)
  const ctrl = useSectionController(id, { onBeforeContinue })

  // First section in checkout order has no Back. Derived from registry so
  // sections don't have to declare it themselves.
  const isFirst = CHECKOUT_SECTIONS[0]?.id === id
  const handleBack = isFirst ? undefined : (onBack ?? ctrl.handleBack)
  const handleContinue = onContinue ?? ctrl.handleContinue
  const handleSkip = onSkip ?? ctrl.handleSkip

  return (
    <div
      data-slot="section-actions"
      aria-hidden={!isActive || undefined}
      className={cn(
        'border-border mt-2 flex items-center justify-between gap-2 border-t pt-4',
        !isActive && 'pointer-events-none',
        className,
      )}
    >
      {handleBack ? (
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ChevronLeft />
          {backLabel}
        </Button>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex items-center gap-2">
        {!isRequired && (
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {skipLabel}
          </Button>
        )}
        <Button
          size="sm"
          disabled={continueDisabled}
          loading={ctrl.isContinuing}
          onClick={handleContinue}
        >
          {continueLabel}
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

Section.Header = SectionHeader
Section.Icon = SectionIcon
Section.HeaderContent = SectionHeaderContent
Section.Title = SectionTitle
Section.Subtitle = SectionSubtitle
Section.Status = SectionStatus
Section.Summary = SectionSummary
Section.Body = SectionBody
Section.Actions = SectionActions

export { RESPONSIVE_BUTTON_CLASS, Section, SectionGroup }
export type { SectionStatus }

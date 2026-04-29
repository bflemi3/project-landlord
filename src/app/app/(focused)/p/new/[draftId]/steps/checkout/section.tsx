'use client'

import * as React from 'react'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardShellClassName } from '@/components/ui/card'
import { IconTile } from '@/components/icon-tile'
import { cn } from '@/lib/utils'

type SectionStatus = 'upcoming' | 'completed' | 'skipped'

// =============================================================================
// SectionGroup — controlled root that wraps the underlying accordion primitive.
// Translates between the single-active-id contract the parent uses and the
// array-of-open-ids contract the primitive expects.
// =============================================================================

interface SectionGroupProps {
  activeId: string | null
  className?: string
  children: React.ReactNode
  onActiveChange: (id: string) => void
}

function SectionGroup({ activeId, className, children, onActiveChange }: SectionGroupProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="section-group"
      value={activeId === null ? [] : [activeId]}
      onValueChange={(value) => {
        // base-ui emits the new array of open ids. With `multiple=false` (the
        // default) tapping the active header would collapse it to `[]` — the
        // spec forbids tap-to-close on the active section, so ignore.
        if (value.length === 0) return
        onActiveChange(value[0] as string)
      }}
      className={cn('flex flex-col gap-4 md:gap-6', className)}
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

// =============================================================================
// Section context — provided by Section, consumed by its sub-components so each
// part can derive its own behavior without prop drilling.
// =============================================================================

interface SectionContextValue {
  id: string
  isActive: boolean
  isUpNext: boolean
  status: SectionStatus
}

const SectionContext = React.createContext<SectionContextValue | null>(null)

function useSection(part: string): SectionContextValue {
  const ctx = React.useContext(SectionContext)
  if (!ctx) {
    throw new Error(`<Section.${part}> must be rendered inside <Section>.`)
  }
  return ctx
}

// =============================================================================
// Section — one item in the SectionGroup. Rendered as a card; provides the
// section context to its children.
// =============================================================================

interface SectionProps {
  children: React.ReactNode
  className?: string
  id: string
  isActive: boolean
  /** Marks the single upcoming section that is the immediate next step. When
   * true on an upcoming section, the trigger is tappable and `Section.Status`
   * shows an "Up next" hint. When false on an upcoming section, the trigger is
   * disabled. */
  isUpNext?: boolean
  status: SectionStatus
}

function Section({ children, className, id, isActive, isUpNext = false, status }: SectionProps) {
  const isLockedUpcoming = status === 'upcoming' && !isActive && !isUpNext

  const ctx = React.useMemo<SectionContextValue>(
    () => ({ id, isActive, isUpNext, status }),
    [id, isActive, isUpNext, status],
  )

  return (
    <SectionContext.Provider value={ctx}>
      <AccordionPrimitive.Item
        data-slot="section"
        data-section-id={id}
        data-status={status}
        data-active={isActive ? 'true' : 'false'}
        value={id}
        disabled={isLockedUpcoming}
        className={cn(
          cardShellClassName({ size: 'md' }),
          'transition-shadow',
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

// =============================================================================
// Section.Header — the tappable row containing icon, text column, status. Its
// children are flex items: typically <Section.Icon>, <Section.HeaderContent>,
// <Section.Status>. Forwards ref to the underlying trigger button so the parent
// can scroll the section into view.
// =============================================================================

interface SectionHeaderProps {
  children: React.ReactNode
  className?: string
  ref?: React.Ref<HTMLButtonElement>
}

function SectionHeader({ children, className, ref }: SectionHeaderProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="section-header"
        className={cn(
          'flex w-full scroll-mt-32 items-start gap-4 rounded-lg text-left',
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

// =============================================================================
// Section.Icon — wraps the IconTile and derives its tone from section context.
// =============================================================================

interface SectionIconProps {
  children: React.ReactNode
  className?: string
}

function SectionIcon({ children, className }: SectionIconProps) {
  const { isActive, status } = useSection('Icon')
  const tone = isActive ? 'primary' : status === 'completed' ? 'success' : 'muted'
  return (
    <IconTile data-slot="section-icon" tone={tone} size="lg" className={className}>
      {children}
    </IconTile>
  )
}

// =============================================================================
// Section.HeaderContent — the text column inside the header. Holds Title and
// Subtitle. Consumes flex space so Status anchors right.
// =============================================================================

function SectionHeaderContent({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="section-header-content" className={cn('min-w-0 flex-1', className)} {...props}>
      {children}
    </div>
  )
}

// =============================================================================
// Section.Title
// =============================================================================

function SectionTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="section-title"
      className={cn('text-foreground text-base font-semibold', className)}
      {...props}
    />
  )
}

// =============================================================================
// Section.Subtitle — short description of what the section is about. Visible
// while the section is upcoming or active; hidden when the section is
// completed-collapsed (Section.Summary takes its conceptual place below the
// header).
// =============================================================================

function SectionSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  const { isActive, status } = useSection('Subtitle')
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

// =============================================================================
// Section.Status — derives its content from section context. Consumers pass
// translated label strings so the primitive stays locale-agnostic.
//   active              → nothing (the expanded body speaks for itself)
//   completed           → success-subtle Badge with check icon (icon-only on mobile)
//   skipped             → secondary Badge with skipped label
//   upcoming + isUpNext → muted up-next text
//   upcoming + locked   → nothing (header shows the section is not reachable)
// =============================================================================

interface SectionStatusProps {
  className?: string
  doneLabel: string
  skippedLabel: string
  upNextLabel: string
}

function SectionStatus({
  className,
  doneLabel,
  skippedLabel,
  upNextLabel,
}: SectionStatusProps) {
  const { isActive, isUpNext, status } = useSection('Status')

  if (isActive) return null

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

// =============================================================================
// Section.Summary — the filled-in data shown when a section is completed and
// collapsed. Replaces the Subtitle's role in the header below the icon column.
// =============================================================================

function SectionSummary({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isActive, status } = useSection('Summary')
  if (!(status === 'completed' && !isActive)) return null
  return (
    <div
      data-slot="section-summary"
      // Left padding clears the icon column (size-10 IconTile + gap-4 header
      // gap = 56px) so summary text aligns under the title.
      className={cn('text-muted-foreground mt-3 pl-14 text-sm', className)}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Section.Body — the expanded content area. Wraps the underlying accordion
// panel so opening/closing animates. Children are unmounted when collapsed
// (base-ui default); per-section forms should read state from the wizard store.
// =============================================================================

function SectionBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AccordionPrimitive.Panel
      data-slot="section-body"
      className="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden"
    >
      <div className={cn('flex flex-col gap-4 pt-6', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

// =============================================================================
// Section.Actions — Back / Skip / Continue row at the bottom of the active
// section. Returns null when the section is not active, so consumers can keep
// it as a JSX sibling of Section.Body without conditional rendering at the
// call site.
// =============================================================================

interface SectionActionsProps {
  backLabel?: string
  className?: string
  continueLabel: string
  showSkip?: boolean
  skipLabel?: string
  onBack?: () => void
  onContinue: () => void
  onSkip?: () => void
}

function SectionActions({
  backLabel,
  className,
  continueLabel,
  showSkip = false,
  skipLabel,
  onBack,
  onContinue,
  onSkip,
}: SectionActionsProps) {
  const { isActive } = useSection('Actions')
  if (!isActive) return null

  return (
    <div
      data-slot="section-actions"
      className={cn(
        'border-border mt-2 flex items-center justify-between gap-2 border-t pt-4',
        className,
      )}
    >
      {onBack ? (
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft />
          {backLabel}
        </Button>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex items-center gap-2">
        {showSkip && onSkip && (
          <Button size="sm" variant="ghost" onClick={onSkip}>
            {skipLabel}
          </Button>
        )}
        <Button size="sm" onClick={onContinue}>
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

export { Section, SectionGroup }
export type { SectionStatus }

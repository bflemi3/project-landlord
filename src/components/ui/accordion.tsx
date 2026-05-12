'use client'

import { useEffect, useState } from 'react'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

type AccordionItemProps = AccordionPrimitive.Item.Props & {
  /**
   * When true, swaps the mount-in animation for an exit animation and disables
   * pointer events for the duration. Pair with a `setTimeout(..., 200)` in the
   * caller to remove the row from the data after the animation finishes.
   */
  isRemoving?: boolean
  /**
   * Opt-in entrance animation: row mounts at `grid-rows-[0fr]` and transitions
   * to `[1fr]` for a fade-in. Default `false` so rows render at full height
   * immediately — required when the row mounts inside a parent that's measuring
   * its own scrollHeight (e.g. inside a section's accordion panel that's just
   * opening), since a row stuck at `[0fr]` during measurement causes the parent
   * to under-measure and snap to its real size at animation end. List parents
   * should set `animateEntrance` only for rows the user just added.
   */
  animateEntrance?: boolean
}

function AccordionItem({
  className,
  isRemoving,
  animateEntrance,
  children,
  ...props
}: AccordionItemProps) {
  // Mount in the "off" state (collapsed + transparent), then defer one paint
  // frame before flipping to "on" so the browser sees a real property change
  // and runs the transition. Without the RAF, React/browser would commit the
  // final state on first paint and skip the entrance animation entirely. Only
  // engages when `animateEntrance` is true; otherwise the row is visible at
  // full size from first paint.
  const [mounted, setMounted] = useState(!animateEntrance)
  useEffect(() => {
    if (mounted) return
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [mounted])

  // Steady visible state. Both entrance (off → show) and exit (show → off)
  // transition the same two properties through the same duration, so add and
  // remove read as mirror images.
  const show = mounted && !isRemoving

  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      data-removing={isRemoving ? 'true' : undefined}
      className={cn(
        // Grid `1fr → 0fr` is a CSS-only height trick: as the row track
        // expands or collapses, the inner clipped wrapper grows/squeezes its
        // content from 0 → natural height (or back), so siblings glide up and
        // down smoothly with no JS measurement. Pairs with the opacity
        // transition for a synchronized fade + size on both add and remove.
        'grid w-full min-w-0 transition-[grid-template-rows,opacity] duration-200',
        show
          ? 'grid-rows-[1fr] opacity-100'
          : 'pointer-events-none grid-rows-[0fr] opacity-0',
        className,
      )}
      {...props}
    >
      {/* `min-h-0` lets the grid row actually shrink past content height;
          `overflow-clip` (with the standard 6px margin) clips during the
          collapse without cutting focus rings on inner controls. */}
      <div className="min-h-0 min-w-0 overflow-clip [overflow-clip-margin:6px]">
        {children}
      </div>
    </AccordionPrimitive.Item>
  )
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-2 rounded-lg border border-transparent py-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-70',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      // `overflow-clip` (vs. `overflow-hidden`) plus `overflow-clip-margin:6px`
      // keeps the height-collapse animation working while letting focus rings
      // (~3px) on inner controls render past the panel's bounds without being
      // cut off. Same pattern as `section.tsx`'s SectionBody.
      className="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-clip [overflow-clip-margin:6px] text-sm"
      {...props}
    >
      <div
        className={cn(
          'h-(--accordion-panel-height) pb-3 data-ending-style:h-0 data-starting-style:h-0',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

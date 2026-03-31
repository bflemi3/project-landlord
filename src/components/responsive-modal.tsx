'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

// =============================================================================
// Context — shares state between composable parts
// =============================================================================

interface ResponsiveModalContextValue {
  isDesktop: boolean
  contentScrollable: boolean
  setContentScrollable: (v: boolean) => void
}

const ResponsiveModalContext = React.createContext<ResponsiveModalContextValue>({
  isDesktop: false,
  contentScrollable: false,
  setContentScrollable: () => {},
})

// =============================================================================
// Root — renders Dialog (desktop) or Sheet (mobile)
// =============================================================================

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Visible title. When empty, the header is visually hidden but remains accessible. */
  title?: string
  description?: string
  children: React.ReactNode
  /** Dialog max-width on desktop. Default: 'sm:max-w-lg' */
  className?: string
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [contentScrollable, setContentScrollable] = React.useState(false)

  const inner = (
    <ResponsiveModalContext.Provider value={{ isDesktop, contentScrollable, setContentScrollable }}>
      {children}
    </ResponsiveModalContext.Provider>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('flex max-h-[85svh] flex-col overflow-hidden', className ?? 'sm:max-w-lg')}>
          <DialogHeader className={title ? undefined : 'sr-only'}>
            <DialogTitle>{title || 'Dialog'}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {inner}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[90svh] flex-col overflow-hidden rounded-t-2xl px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className={title ? undefined : 'sr-only'}>
          <SheetTitle>{title || 'Dialog'}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {!title && <div className="pt-2" />}
        {inner}
      </SheetContent>
    </Sheet>
  )
}

// =============================================================================
// Content — scrollable area, scrollbar flush to edge
// =============================================================================

function ResponsiveModalContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const { setContentScrollable } = React.useContext(ResponsiveModalContext)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => setContentScrollable(el.scrollHeight > el.clientHeight)

    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [setContentScrollable])

  return (
    <div
      ref={ref}
      data-slot="responsive-modal-content"
      className={cn('min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Footer — sticky bottom, fade mask only when content is scrollable
// =============================================================================

function ResponsiveModalFooter({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { contentScrollable } = React.useContext(ResponsiveModalContext)

  return (
    <div
      data-slot="responsive-modal-footer"
      className={cn(
        'relative shrink-0 pt-6',
        contentScrollable && 'fade-mask-top',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

ResponsiveModal.Content = ResponsiveModalContent
ResponsiveModal.Footer = ResponsiveModalFooter

export { ResponsiveModalContent, ResponsiveModalFooter }

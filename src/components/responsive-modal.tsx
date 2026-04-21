'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
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
  registerTitle: () => void
  unregisterTitle: () => void
}

const ResponsiveModalContext = React.createContext<ResponsiveModalContextValue>({
  isDesktop: false,
  contentScrollable: false,
  setContentScrollable: () => {},
  registerTitle: () => {},
  unregisterTitle: () => {},
})

// =============================================================================
// Root — renders Dialog (desktop) or Sheet (mobile)
// =============================================================================

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Dialog max-width on desktop. Default: 'sm:max-w-lg' */
  className?: string
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  className,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [contentScrollable, setContentScrollable] = React.useState(false)
  const [titleCount, setTitleCount] = React.useState(0)

  const registerTitle = React.useCallback(() => setTitleCount((n) => n + 1), [])
  const unregisterTitle = React.useCallback(() => setTitleCount((n) => Math.max(0, n - 1)), [])

  // Dev-only warning when no ResponsiveModal.Title is composed while the modal is open.
  // Radix/base-ui Dialog expects an accessible title — we emit a warning and fall back to an
  // sr-only title so production never crashes or leaves screen-reader users stranded.
  React.useEffect(() => {
    if (!open) return
    if (titleCount > 0) return
    if (process.env.NODE_ENV === 'production') return
    console.warn(
      '[ResponsiveModal] No <ResponsiveModal.Title> composed. Add a Title inside a Header (use className="sr-only" to hide it visually) for accessible dialogs.',
    )
  }, [open, titleCount])

  const contextValue = React.useMemo<ResponsiveModalContextValue>(
    () => ({
      isDesktop,
      contentScrollable,
      setContentScrollable,
      registerTitle,
      unregisterTitle,
    }),
    [isDesktop, contentScrollable, registerTitle, unregisterTitle],
  )

  const needsFallbackTitle = open && titleCount === 0

  const inner = (
    <ResponsiveModalContext.Provider value={contextValue}>
      {needsFallbackTitle && (
        isDesktop ? (
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        ) : (
          <SheetTitle className="sr-only">Dialog</SheetTitle>
        )
      )}
      {children}
    </ResponsiveModalContext.Provider>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-card bg-card p-6 text-base text-foreground shadow-card',
            className ?? 'sm:max-w-lg',
          )}
        >
          {inner}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-t-3xl bg-background px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground',
          className,
        )}
      >
        {inner}
      </SheetContent>
    </Sheet>
  )
}

// =============================================================================
// Header — composes DialogHeader (desktop) or SheetHeader (mobile)
// =============================================================================

function ResponsiveModalHeader({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="responsive-modal-header"
      className={cn('shrink-0 space-y-1 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Title — wraps Dialog/Sheet Title primitive with title-scale typography
// =============================================================================

function ResponsiveModalTitle({
  className,
  children,
  ...props
}: React.ComponentProps<'h2'>) {
  const { isDesktop, registerTitle, unregisterTitle } = React.useContext(ResponsiveModalContext)

  React.useEffect(() => {
    registerTitle()
    return () => unregisterTitle()
  }, [registerTitle, unregisterTitle])

  const classes = cn('text-lg font-semibold text-foreground', className)

  if (isDesktop) {
    return (
      <DialogTitle data-slot="responsive-modal-title" className={classes} {...props}>
        {children}
      </DialogTitle>
    )
  }
  return (
    <SheetTitle data-slot="responsive-modal-title" className={classes} {...props}>
      {children}
    </SheetTitle>
  )
}

// =============================================================================
// Description — wraps Dialog/Sheet Description primitive with body typography
// =============================================================================

function ResponsiveModalDescription({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>) {
  const { isDesktop } = React.useContext(ResponsiveModalContext)
  const classes = cn('text-base text-muted-foreground', className)

  if (isDesktop) {
    return (
      <DialogDescription data-slot="responsive-modal-description" className={classes} {...props}>
        {children}
      </DialogDescription>
    )
  }
  return (
    <SheetDescription data-slot="responsive-modal-description" className={classes} {...props}>
      {children}
    </SheetDescription>
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
        'relative shrink-0 pt-6 [&>a]:h-12 [&>a]:w-full [&>a]:rounded-2xl [&>a]:text-base [&>button]:h-12 [&>button]:w-full [&>button]:rounded-2xl [&>button]:text-base',
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

ResponsiveModal.Header = ResponsiveModalHeader
ResponsiveModal.Title = ResponsiveModalTitle
ResponsiveModal.Description = ResponsiveModalDescription
ResponsiveModal.Content = ResponsiveModalContent
ResponsiveModal.Footer = ResponsiveModalFooter

export {
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalContent,
  ResponsiveModalFooter,
}

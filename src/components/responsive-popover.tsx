'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface ResponsivePopoverContextValue {
  isDesktop: boolean
}

const ResponsivePopoverContext = React.createContext<ResponsivePopoverContextValue>({
  isDesktop: false,
})

interface ResponsivePopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function ResponsivePopover({ open, onOpenChange, children }: ResponsivePopoverProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const value = React.useMemo<ResponsivePopoverContextValue>(
    () => ({ isDesktop }),
    [isDesktop],
  )

  if (isDesktop) {
    return (
      <ResponsivePopoverContext.Provider value={value}>
        <Popover open={open} onOpenChange={onOpenChange}>
          {children}
        </Popover>
      </ResponsivePopoverContext.Provider>
    )
  }

  return (
    <ResponsivePopoverContext.Provider value={value}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    </ResponsivePopoverContext.Provider>
  )
}

interface ResponsivePopoverTriggerProps {
  render: React.ReactElement
  children?: React.ReactNode
}

function ResponsivePopoverTrigger({ render, children }: ResponsivePopoverTriggerProps) {
  const { isDesktop } = React.useContext(ResponsivePopoverContext)
  return isDesktop ? (
    <PopoverTrigger render={render}>{children}</PopoverTrigger>
  ) : (
    <SheetTrigger render={render}>{children}</SheetTrigger>
  )
}

interface ResponsivePopoverContentProps
  extends Omit<React.ComponentProps<typeof PopoverContent>, 'title'> {
  /** Sr-only title for the mobile sheet variant. Required for accessibility. */
  title: string
  /** Override the sheet content className on mobile. */
  sheetClassName?: string
}

function ResponsivePopoverContent({
  title,
  className,
  sheetClassName,
  children,
  ...popoverProps
}: ResponsivePopoverContentProps) {
  const { isDesktop } = React.useContext(ResponsivePopoverContext)

  if (isDesktop) {
    return (
      <PopoverContent className={className} {...popoverProps}>
        {children}
      </PopoverContent>
    )
  }

  return (
    <SheetContent
      side="bottom"
      showCloseButton={false}
      className={cn(
        'flex flex-col gap-0 rounded-t-3xl bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground',
        sheetClassName,
      )}
    >
      <SheetTitle className="sr-only">{title}</SheetTitle>
      <div className="flex items-center justify-end pb-2">
        <SheetClose
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          }
        />
      </div>
      {children}
    </SheetContent>
  )
}

ResponsivePopover.Trigger = ResponsivePopoverTrigger
ResponsivePopover.Content = ResponsivePopoverContent

export { ResponsivePopoverTrigger, ResponsivePopoverContent }

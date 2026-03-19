'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function PageHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="page-header"
      className={cn('flex items-center gap-3', className)}
      {...props}
    />
  )
}

function PageHeaderBack({
  className,
  mode = 'chevron',
  onBack,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'onClick'> & {
  mode?: 'chevron' | 'close'
  onBack?: () => void
}) {
  const router = useRouter()

  function handleBack() {
    if (onBack) {
      onBack()
    } else if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const Icon = mode === 'close' ? X : ChevronLeft

  return (
    <Button
      data-slot="page-header-back"
      variant="ghost"
      size="icon"
      onClick={handleBack}
      className={className}
      {...props}
    >
      <Icon />
    </Button>
  )
}

function PageHeaderContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-header-content"
      className={cn('min-w-0 flex-1', className)}
      {...props}
    />
  )
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="page-header-title"
      className={cn('text-lg font-semibold leading-tight', className)}
      {...props}
    />
  )
}

function PageHeaderSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="page-header-subtitle"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function PageHeaderActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-header-actions"
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

export {
  PageHeader,
  PageHeaderBack,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderSubtitle,
  PageHeaderActions,
}

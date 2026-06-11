'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

function PageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="page-header" className={cn('mb-6', className)} {...props} />
}

function PageHeaderBack({
  className,
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="page-header-back"
      href={href}
      prefetch
      className={cn(
        'text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm transition-colors',
        className,
      )}
      {...props}
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  )
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="page-header-title"
      className={cn(
        'font-display text-foreground text-2xl font-medium tracking-[-0.015em]',
        className,
      )}
      {...props}
    />
  )
}

function PageHeaderSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="page-header-subtitle"
      className={cn('text-muted-foreground mt-0.5 text-sm', className)}
      {...props}
    />
  )
}

export { PageHeader, PageHeaderBack, PageHeaderTitle, PageHeaderSubtitle }

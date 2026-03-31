'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

function PageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-header"
      className={cn('mb-6', className)}
      {...props}
    />
  )
}

function PageHeaderBack({ className, href, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="page-header-back"
      href={href}
      className={cn(
        'mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
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
      className={cn('text-2xl font-bold text-foreground', className)}
      {...props}
    />
  )
}

function PageHeaderSubtitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="page-header-subtitle"
      className={cn('mt-0.5 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  PageHeader,
  PageHeaderBack,
  PageHeaderTitle,
  PageHeaderSubtitle,
}

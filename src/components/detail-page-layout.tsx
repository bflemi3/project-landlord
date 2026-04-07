import * as React from 'react'
import { cn } from '@/lib/utils'

function DetailPageLayout({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-full flex-col', className)} {...props}>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 md:pt-6">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}

function DetailPageLayoutHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="detail-page-header" className={className} {...props} />
}

function DetailPageLayoutBody({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="detail-page-body" className={cn('mt-8 md:flex md:gap-8', className)} {...props}>
      {children}
    </div>
  )
}

function DetailPageLayoutMain({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="detail-page-main" className={cn('flex-1 space-y-8', className)} {...props} />
}

function DetailPageLayoutSidebar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-page-sidebar"
      className={cn('mt-8 space-y-8 md:mt-0 md:w-96 md:shrink-0', className)}
      {...props}
    />
  )
}

export {
  DetailPageLayout,
  DetailPageLayoutHeader,
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
}

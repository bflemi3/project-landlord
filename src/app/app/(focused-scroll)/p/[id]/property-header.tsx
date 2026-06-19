import Link from 'next/link'
import { X } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'
import { cn } from '@/lib/utils'

import { PropertyTitle } from './property-title'
import { PropertyStatus } from './property-status'
import { PropertyMenu } from './property-menu'

// Desktop: title (left) + contract status and the overflow menu far-right; the
// layout's fixed corner close provides the escape hatch. Mobile: the header is
// the page's frozen chrome — sticky over the scroll area (full-bleed via -mx/px
// against the layout's px-6 pt-4) with a top row of status (left) and in-flow
// ··· / X (right, one centered row — nothing floats over scrolling content).
export async function PropertyHeader({
  className,
  propertyId,
}: {
  className?: string
  propertyId: string
}) {
  const t = await getTranslations('common')

  return (
    <header
      className={cn(
        'flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between md:gap-3',
        'max-md:bg-background max-md:sticky max-md:top-0 max-md:z-20 max-md:-mx-6 max-md:px-6 max-md:pt-3',
        className,
      )}
    >
      <SuspenseFadeIn fallback={<PropertyTitleSkeleton />}>
        <PropertyTitle propertyId={propertyId} />
      </SuspenseFadeIn>
      <div className="order-first flex shrink-0 items-center gap-1.5 md:order-0">
        <SuspenseFadeIn fallback={<PropertyStatusSkeleton />}>
          <PropertyStatus propertyId={propertyId} />
        </SuspenseFadeIn>
        <span className="ml-auto inline-flex items-center gap-1.5 md:ml-0">
          <PropertyMenu propertyId={propertyId} />
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/app" />}
            nativeButton={false}
            aria-label={t('close')}
            className="md:hidden"
          >
            <X />
          </Button>
        </span>
      </div>
    </header>
  )
}

function PropertyTitleSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

function PropertyStatusSkeleton() {
  return <Skeleton className="h-4 w-20" />
}

'use client'

import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'
import type { SectionId } from '../../../state/registry'

interface SectionSkeletonProps {
  /** Whether to render the icon tile in `primary` tone — used by the first
   * section to visually mirror Step 2's initial active card. */
  active?: boolean
  icon: LucideIcon
  sectionId: SectionId
}

/**
 * Generic placeholder skeleton for an accordion section card. Each per-section
 * file (`property.tsx`, etc.) re-exports this under its own name (e.g.
 * `PropertySectionSkeleton`) so future per-section plans can swap in a layout
 * that matches the real section body — `step-one-skeleton-layout.tsx` and the
 * route's hydration gate compose those exports without further changes.
 *
 * Today every section uses this generic shape (icon + title shimmer + subtitle
 * shimmer) because the bodies are placeholders. When real forms land, each
 * section overrides its own skeleton.
 */
export function SectionSkeleton({ active = false, icon: Icon, sectionId }: SectionSkeletonProps) {
  return (
    <Card
      size="md"
      data-slot="section-skeleton"
      data-section-id={sectionId}
      data-active={active ? 'true' : 'false'}
      className="flex items-start gap-4"
    >
      <IconTile tone={active ? 'primary' : 'muted'} size="lg">
        <Icon />
      </IconTile>
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-56 rounded-full" />
      </div>
    </Card>
  )
}

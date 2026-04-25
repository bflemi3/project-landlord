'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/icon-tile'
import { cn } from '@/lib/utils'
import { usePropertyCreationState } from '../../../state/use-property-creation'
import type { SectionId } from '../../../state/registry'

interface SectionShellProps {
  sectionId: SectionId
  title: string
  subtitle: string
  icon: LucideIcon
  children?: ReactNode
}

export function SectionShell({
  sectionId,
  title,
  subtitle,
  icon: Icon,
  children,
}: SectionShellProps) {
  const status = usePropertyCreationState((s) => s.sectionStates[sectionId])
  const isActive = usePropertyCreationState(
    (s) => s.activeSectionId === sectionId,
  )
  const rootRef = useRef<HTMLDivElement | null>(null)
  const prevActive = useRef(isActive)

  useEffect(() => {
    if (!prevActive.current && isActive) {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevActive.current = isActive
  }, [isActive])

  const tone = isActive ? 'primary' : status === 'completed' ? 'success' : 'muted'

  return (
    <Card
      ref={rootRef}
      size="md"
      data-slot="checkout-section"
      data-section-id={sectionId}
      data-status={status}
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        'flex flex-col gap-3',
        isActive && 'shadow-lg dark:shadow-none dark:border-primary/40',
      )}
    >
      <div className="flex items-start gap-4">
        <IconTile tone={tone} size="lg">
          <Icon />
        </IconTile>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {isActive && children && (
        <div className="pl-[calc(2.5rem+1rem)]">{children}</div>
      )}
    </Card>
  )
}

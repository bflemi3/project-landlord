'use client'

import { useTranslations } from 'next-intl'

import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from '@/components/empty-state'

import { PROPERTY_TAB_META } from './property-tabs-config'
import { type PropertyTab } from './state/store'

// Stand-in for tabs whose real content lands in a later milestone. Reads its
// label + one-line teaser from `property.tabs.<id>` / `property.placeholders.<id>`.
export function TabPlaceholder({ tab }: { tab: PropertyTab }) {
  const t = useTranslations('property')
  const Icon = PROPERTY_TAB_META[tab].icon

  return (
    <EmptyState>
      <EmptyStateIcon>
        <Icon />
      </EmptyStateIcon>
      <EmptyStateTitle>{t(`tabs.${tab}`)}</EmptyStateTitle>
      <EmptyStateDescription className="text-base">
        {t(`placeholders.${tab}`)}
      </EmptyStateDescription>
    </EmptyState>
  )
}

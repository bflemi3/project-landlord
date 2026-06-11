'use client'

import { type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FloatingBar,
  FloatingBarIcon,
  FloatingBarItem,
  FloatingBarLabel,
} from '@/components/ui/floating-bar'

import { PROPERTY_TAB_META } from './property-tabs-config'
import { useTab, usePropertyPageActions } from './state/provider'
import { type PropertyTab } from './state/store'

/**
 * Owns the property page's tab chrome for both breakpoints — desktop underline
 * tabs and the mobile floating bottom bar — both driving the shared store
 * (`useTab`/`setTab`). The role view passes its ordered `tabs` and composes the
 * panels (header + `TabsContent`) as `children`; this just renders the nav
 * around them.
 */
export function PropertyTabs({
  indicators,
  tabs,
  children,
}: {
  /** Attention dot (or similar) per tab — e.g. Bills' overdue dot, slotted
   *  from the server so this nav stays data-free. */
  indicators?: Partial<Record<PropertyTab, ReactNode>>
  tabs: readonly PropertyTab[]
  children: ReactNode
}) {
  const t = useTranslations('property')
  const tab = useTab()
  const { setTab } = usePropertyPageActions()

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as PropertyTab)}>
      <TabsList className="mb-6 hidden md:flex">
        {tabs.map((id) => (
          <TabsTrigger key={id} value={id} className="inline-flex items-center gap-1.5">
            {t(`tabs.${id}`)}
            {indicators?.[id]}
          </TabsTrigger>
        ))}
      </TabsList>

      {children}

      <FloatingBar position="bottom" showOn="mobile">
        {tabs.map((id) => {
          const Icon = PROPERTY_TAB_META[id].icon
          return (
            <FloatingBarItem key={id} active={tab === id} onClick={() => setTab(id)}>
              <span className="relative inline-flex">
                <FloatingBarIcon>
                  <Icon />
                </FloatingBarIcon>
                {indicators?.[id] ? (
                  <span className="absolute -top-0.5 -right-0.5">{indicators[id]}</span>
                ) : null}
              </span>
              <FloatingBarLabel>{t(`tabs.${id}`)}</FloatingBarLabel>
            </FloatingBarItem>
          )
        })}
      </FloatingBar>
    </Tabs>
  )
}

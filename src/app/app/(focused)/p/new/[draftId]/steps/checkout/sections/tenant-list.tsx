'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  defaultTenantRow,
  type TenantRow,
} from '../../../state/tenant-row-schema'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../state/use-property-creation'
import { RESPONSIVE_BUTTON_CLASS } from '../section'
import { TenantForm } from './tenant-form'
import { TenantSummary } from './tenant-summary'

const REMOVE_ANIMATION_MS = 200

type ListMode = 'all-expanded' | 'single-active'

export function TenantList() {
  const t = useTranslations('propertyCreation.checkout.tenants')
  const { setSectionData } = usePropertyCreationActions()

  // Shallow equality keeps this list from re-rendering on row content changes
  // — only add/remove/reorder triggers a re-render. Each row reads its own
  // slice from the store inside TenantForm or TenantSummary.
  const tenantIds = usePropertyCreationState(
    useShallow((s) => (s.sectionData.tenants as TenantRow[]).map((row) => row.id)),
  )

  // Initial state: all tenants render as expanded forms (preserves the
  // review-extraction-at-a-glance UX). Once the user clicks Add the first
  // time, switch to single-active mode and stay there for the session.
  const [mode, setMode] = useState<ListMode>('all-expanded')
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null)
  // Set when a row is just added — drives autoFocus on the new TenantForm's
  // name input. AutoFocus only fires on mount; this never needs clearing.
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  // Ids in the middle of an exit animation. Render with `animate-out` then
  // remove from the store after the animation finishes.
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const handleAdd = useCallback(() => {
    const newRow = defaultTenantRow()
    setSectionData<TenantRow[]>('tenants', (prev) => [...prev, newRow])
    setMode('single-active')
    setActiveTenantId(newRow.id)
    setJustAddedId(newRow.id)
  }, [setSectionData])

  const handleActivate = useCallback((id: string) => {
    setActiveTenantId(id)
  }, [])

  const handleRemove = useCallback(
    (id: string) => {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      setTimeout(() => {
        setSectionData<TenantRow[]>('tenants', (prev) =>
          prev.filter((row) => row.id !== id),
        )
        setRemovingIds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setActiveTenantId((current) => (current === id ? null : current))
      }, REMOVE_ANIMATION_MS)
    },
    [setSectionData],
  )

  if (tenantIds.length === 0) {
    return <TenantListEmptyState onAdd={handleAdd} />
  }

  return (
    <div className="flex flex-col gap-6">
      {tenantIds.map((id, index) => {
        const isRemoving = removingIds.has(id)
        const isActive =
          !isRemoving && (mode === 'all-expanded' || id === activeTenantId)
        return (
          <div
            key={id}
            className={cn(
              'animate-in fade-in duration-200',
              index > 0 && 'border-border/60 border-t pt-6',
              isRemoving && 'animate-out fade-out pointer-events-none',
            )}
          >
            {isActive ? (
              <TenantForm id={id} autoFocus={id === justAddedId} />
            ) : (
              <TenantSummary
                id={id}
                onActivate={() => handleActivate(id)}
                onRemove={() => handleRemove(id)}
              />
            )}
          </div>
        )
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAdd}
        className={cn(
          'text-muted-foreground hover:text-foreground self-start',
          RESPONSIVE_BUTTON_CLASS,
        )}
      >
        <Plus />
        {t('addTenant')}
      </Button>
    </div>
  )
}

function TenantListEmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations('propertyCreation.checkout.tenants')
  const tEmpty = useTranslations('propertyCreation.checkout.tenants.emptyState')

  const bullets = useMemo(
    () => [
      tEmpty('bulletPayments'),
      tEmpty('bulletReminders'),
      tEmpty('bulletLateNotices'),
    ],
    [tEmpty],
  )

  return (
    <div className="bg-muted/40 flex flex-col items-center gap-4 rounded-2xl px-6 py-8 text-center md:px-10 md:py-10">
      <h3 className="text-foreground text-base font-semibold">
        {tEmpty('title')}
      </h3>
      <p className="text-muted-foreground text-sm">{tEmpty('leadIn')}</p>
      <ul className="flex flex-col gap-2 text-left text-sm">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check className="text-primary mt-0.5 size-4 shrink-0" />
            <span className="text-foreground">{bullet}</span>
          </li>
        ))}
      </ul>
      <Button onClick={onAdd} className="mt-2">
        <Plus />
        {t('addTenant')}
      </Button>
    </div>
  )
}


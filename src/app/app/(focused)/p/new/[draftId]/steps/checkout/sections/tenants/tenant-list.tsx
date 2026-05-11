'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  ExplainerCard,
  ExplainerCardAction,
  ExplainerCardContent,
  ExplainerCardDescription,
  ExplainerCardList,
  ExplainerCardListItem,
  ExplainerCardTitle,
} from '@/components/explainer-card'
import { useDelayedRemoval } from '@/lib/hooks/use-delayed-removal'
import { useRecentlyAdded } from '@/lib/hooks/use-recently-added'

import {
  defaultTenantRow,
  TENANT_ROW_FIELD_NAMES,
  type TenantRow,
} from './schemas'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../../state/use-property-creation'
import { clearRowServerErrors, type TenantsTouched } from './state'
import { TenantRow as TenantRowComponent } from './tenant-row'

export function TenantList() {
  const t = useTranslations('propertyCreation.checkout.tenants')
  const {
    setSectionData,
    setTenantsListUI,
    setTouched,
    setServerErrors,
  } = usePropertyCreationActions()
  const tenantIds = usePropertyCreationState(
    useShallow((s) => (s.sectionData.tenants as TenantRow[]).map((row) => row.id)),
  )
  const activeTenantId = usePropertyCreationState(
    (s) => s.tenantsListUI.activeTenantId,
  )
  // Drives autoFocus on the new TenantForm's name input. AutoFocus only fires
  // on mount; resetting on section close is correct (no auto-focus when the
  // user reopens the section), which is exactly what `useRecentlyAdded`'s
  // mount-scoped state gives us.
  const { markAdded, isJustAdded } = useRecentlyAdded()
  const { isRemoving, remove } = useDelayedRemoval()

  const handleAdd = useCallback(() => {
    const newRow = defaultTenantRow()
    setSectionData<TenantRow[]>('tenants', (prev) => [...prev, newRow])
    setTenantsListUI({ activeTenantId: newRow.id })
    markAdded(newRow.id)
  }, [markAdded, setSectionData, setTenantsListUI])

  const handleRemove = useCallback(
    (id: string) => {
      remove(id, () => {
        setSectionData<TenantRow[]>('tenants', (prev) =>
          prev.filter((row) => row.id !== id),
        )
        setServerErrors('tenants', clearRowServerErrors(id))
        setTenantsListUI((current) =>
          current.activeTenantId === id ? { activeTenantId: null } : {},
        )
      })
    },
    [remove, setSectionData, setTenantsListUI, setServerErrors],
  )

  const handleActiveChange = useCallback(
    (value: string[]) => {
      // Tap-to-toggle: pressing the open row's header closes it (`value[]`
      // empty), pressing a closed row opens it (and replaces any prior open
      // id since this list is single-active). The id leaving the open slot
      // gets every field marked touched — its inline errors and badge can
      // surface on next expand.
      const nextActive = value[0] ?? null
      if (activeTenantId && activeTenantId !== nextActive) {
        const closingId = activeTenantId
        setTouched<TenantsTouched>('tenants', (prev) => {
          const existing = prev[closingId]
          if (existing && TENANT_ROW_FIELD_NAMES.every((f) => existing.has(f))) {
            return prev
          }
          return { ...prev, [closingId]: new Set(TENANT_ROW_FIELD_NAMES) }
        })
      }
      setTenantsListUI({ activeTenantId: nextActive })
    },
    [activeTenantId, setTenantsListUI, setTouched],
  )

  if (tenantIds.length === 0) {
    return <TenantListEmptyState onAdd={handleAdd} />
  }

  return (
    <div className="flex flex-col gap-6">
      <Accordion
        className="divide-border/60 divide-y"
        value={activeTenantId ? [activeTenantId] : []}
        onValueChange={handleActiveChange}
      >
        {tenantIds.map((id) => (
          <TenantRowComponent
            key={id}
            id={id}
            isRemoving={isRemoving(id)}
            autoFocus={isJustAdded(id)}
            animateEntrance={isJustAdded(id)}
            onRemove={() => handleRemove(id)}
          />
        ))}
      </Accordion>
      {/* Full-width chip-shaped Add button — same chrome as the expense
          list's add affordance and the radio chip controls, so it reads as
          part of the row rhythm rather than a small ghost button tucked at
          the bottom-left. */}
      <Button onClick={handleAdd}>
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
    <ExplainerCard>
      <ExplainerCardTitle>{tEmpty('title')}</ExplainerCardTitle>
      <ExplainerCardDescription>{tEmpty('leadIn')}</ExplainerCardDescription>
      <ExplainerCardContent>
        <ExplainerCardList>
          {bullets.map((bullet) => (
            <ExplainerCardListItem key={bullet}>{bullet}</ExplainerCardListItem>
          ))}
        </ExplainerCardList>
      </ExplainerCardContent>
      <ExplainerCardAction>
        <Button onClick={onAdd}>
          <Plus />
          {t('addTenant')}
        </Button>
      </ExplainerCardAction>
    </ExplainerCard>
  )
}

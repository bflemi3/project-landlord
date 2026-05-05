'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { SectionId } from '../../../state/registry'
import {
  defaultTenantRow,
  type TenantRow,
} from '../../../state/tenant-row-schema'
import { useCheckoutContext } from '../checkout-context'
import { RESPONSIVE_BUTTON_CLASS, Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'
import { TenantForm } from './tenant-form'

const SECTION_ID: SectionId = 'tenants'
const ICON = Users

// Local-only state until the store-backed tenants slice + extraction seeding
// land in follow-up pieces. Two dummy tenants are seeded so the section opens
// already showing the multi-form layout.
const INITIAL_TENANTS: TenantRow[] = [
  {
    id: 'demo-1',
    name: 'Maria Silva',
    email: 'maria.silva@example.com',
    taxId: '040.032.329-09',
    inviteNow: true,
    isExtracted: true,
  },
  {
    id: 'demo-2',
    name: 'João Santos',
    email: '',
    taxId: '529.982.247-25',
    inviteNow: true,
    isExtracted: true,
  },
]

export function TenantsSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tTenants = useTranslations('propertyCreation.checkout.tenants')
  const { registerHeaderRef } = useCheckoutContext()
  const ctrl = useSectionController(SECTION_ID)

  const [tenants, setTenants] = useState<TenantRow[]>(INITIAL_TENANTS)

  const handleChange = useCallback((updated: TenantRow) => {
    setTenants((prev) =>
      prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)),
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    setTenants((prev) => prev.filter((tenant) => tenant.id !== id))
  }, [])

  const handleAdd = useCallback(() => {
    setTenants((prev) => [...prev, defaultTenantRow()])
  }, [])

  return (
    <Section
      id={SECTION_ID}
      isActive={ctrl.isActive}
      isUpNext={ctrl.isUpNext}
      status={ctrl.status}
    >
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{tTenants('title')}</Section.Title>
          <Section.Subtitle>{tTenants('subtitle')}</Section.Subtitle>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <div className="flex flex-col gap-6">
          {tenants.map((tenant, i) => (
            <div
              key={tenant.id}
              className={i > 0 ? 'border-border/60 border-t pt-6' : undefined}
            >
              <TenantForm
                tenant={tenant}
                onChange={handleChange}
                onRemove={() => handleRemove(tenant.id)}
              />
            </div>
          ))}
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
            {tTenants('addTenant')}
          </Button>
        </div>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          skipLabel={t('actions.skip')}
          showSkip={!ctrl.isRequired}
          onBack={ctrl.handleBack}
          onContinue={ctrl.handleContinue}
          onSkip={ctrl.handleSkip}
        />
      </Section.Body>
    </Section>
  )
}

export function TenantsSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function TenantsSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.tenants')
  return <SummaryRow sectionId={SECTION_ID} title={t('title')} />
}

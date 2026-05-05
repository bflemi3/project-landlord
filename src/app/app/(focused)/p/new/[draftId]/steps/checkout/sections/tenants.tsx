'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'

import type { PropertyInput } from '../../../state/extraction-seeding'
import type { SectionId } from '../../../state/registry'
import {
  getTenantRowSchema,
  type TenantRow,
} from '../../../state/tenant-row-schema'
import { usePropertyCreationState } from '../../../state/use-property-creation'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'
import { TenantList } from './tenant-list'

const SECTION_ID: SectionId = 'tenants'
const ICON = Users
const SUMMARY_NAME_LIMIT = 2

export function TenantsSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tTenants = useTranslations('propertyCreation.checkout.tenants')
  const { registerHeaderRef } = useCheckoutContext()
  const ctrl = useSectionController(SECTION_ID)

  const tenants = usePropertyCreationState(
    (s) => s.sectionData.tenants as TenantRow[],
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )

  // Section-level aggregate validity. The empty list is vacuously valid, so
  // Continue stays enabled at zero rows; with rows present, every row must
  // pass its country-aware schema before Continue can advance.
  const isValid = useMemo(
    () => getTenantRowSchema(countryCode).array().safeParse(tenants).success,
    [tenants, countryCode],
  )

  const sectionSummary = useMemo(
    () =>
      formatTenantsSummary(tenants, {
        newTenantLabel: tTenants('newTenant'),
        andMoreLabel: (count) => tTenants('summaryAndMore', { count }),
      }),
    [tenants, tTenants],
  )

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
          <Section.Summary>{sectionSummary}</Section.Summary>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <TenantList />
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={!isValid}
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
  const tenants = usePropertyCreationState(
    (s) => s.sectionData.tenants as TenantRow[],
  )
  const detail = useMemo(
    () =>
      formatTenantsSummary(tenants, {
        newTenantLabel: t('newTenant'),
        andMoreLabel: (count) => t('summaryAndMore', { count }),
      }),
    [tenants, t],
  )
  return (
    <SummaryRow sectionId={SECTION_ID} title={t('title')} detail={detail || null} />
  )
}

// Builds the recap line shown both in the section's collapsed header and the
// desktop summary panel. Up to two labels are shown verbatim; anything beyond
// is rolled into "+N more". Each tenant's label falls back through name →
// email → newTenantLabel so partially-filled rows still surface meaningfully.
function formatTenantsSummary(
  tenants: TenantRow[],
  labels: {
    newTenantLabel: string
    andMoreLabel: (count: number) => string
  },
): string {
  if (tenants.length === 0) return ''
  const rendered = tenants.map(
    (tenant) => tenant.name || tenant.email || labels.newTenantLabel,
  )
  if (rendered.length <= SUMMARY_NAME_LIMIT) return rendered.join(', ')
  const head = rendered.slice(0, SUMMARY_NAME_LIMIT).join(', ')
  return `${head} ${labels.andMoreLabel(rendered.length - SUMMARY_NAME_LIMIT)}`
}

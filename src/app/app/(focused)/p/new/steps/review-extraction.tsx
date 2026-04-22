'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ChevronLeft,
  FileWarning,
  Receipt,
  User,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/icon-tile'
import { SectionLabel } from '@/components/section-label'
import {
  List,
  ListRow,
  ListRowBody,
  ListRowDescription,
  ListRowLeading,
  ListRowTitle,
} from '@/components/list-row'
import { AmountDisplay } from '@/components/amount-display'
import {
  loadWizardState,
  clearWizardState,
  PROPERTY_CREATION_STATE_VERSION,
  type PropertyCreationData,
} from '@/lib/wizard-state'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/i18n/routing'
import type {
  ContractAddress,
  ContractExtractionResult,
  ContractExpense,
  ContractParty,
  ContractRent,
  ContractRentAdjustment,
} from '@/lib/contract-extraction/types'

const DASH = '—'

function isAllNull(result: ContractExtractionResult): boolean {
  return (
    !result.propertyType &&
    !result.address &&
    !result.rent &&
    !result.contractDates &&
    !result.rentAdjustment &&
    (!result.landlords || result.landlords.length === 0) &&
    (!result.tenants || result.tenants.length === 0) &&
    (!result.expenses || result.expenses.length === 0)
  )
}

function formatAddress(addr: ContractAddress): string {
  const parts = [
    addr.street,
    addr.number,
    addr.complement,
    addr.neighborhood,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country,
  ].filter(Boolean)
  return parts.join(', ') || DASH
}

interface ReviewExtractionProps {
  wizardKey: string
  onStartOver: () => void
}

export function ReviewExtraction({ wizardKey, onStartOver }: ReviewExtractionProps) {
  const t = useTranslations('propertyCreation.review')
  const locale = useLocale() as Locale
  const [result, setResult] = useState<ContractExtractionResult | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [confirmingStartOver, setConfirmingStartOver] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const stored = await loadWizardState<PropertyCreationData>(wizardKey, {
        expectedVersion: PROPERTY_CREATION_STATE_VERSION,
      })
      if (cancelled) return
      setResult(stored?.data.extractionResult ?? null)
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [wizardKey])

  if (!loaded) return null

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-6 pt-16 text-center">
        <IconTile tone="warning" size="lg">
          <FileWarning />
        </IconTile>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{t('recovery.title')}</h2>
          <p className="text-base text-muted-foreground">{t('recovery.description')}</p>
        </div>
        <Button variant="default" onClick={onStartOver}>
          {t('recovery.cta')}
        </Button>
      </div>
    )
  }

  if (isAllNull(result)) {
    return (
      <div className="flex flex-col items-center gap-6 pt-16 text-center">
        <IconTile tone="warning" size="lg">
          <FileWarning />
        </IconTile>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{t('empty.title')}</h2>
          <p className="text-base text-muted-foreground">{t('empty.description')}</p>
        </div>
        <Button variant="default" onClick={onStartOver}>
          {t('empty.cta')}
        </Button>
      </div>
    )
  }

  function handleStartOver() {
    if (!confirmingStartOver) {
      setConfirmingStartOver(true)
      return
    }
    void clearWizardState(wizardKey)
    onStartOver()
  }

  return (
    <div className="flex flex-col gap-8 pt-8" data-slot="review-extraction">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('description')}</p>
      </div>

      <PropertySection result={result} />
      <RentSection result={result} locale={locale} />
      <PartiesSection result={result} />
      <ExpensesSection result={result} />

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => toast.message(t('nextStepComingSoon'))}
          size="wizard"
        >
          {t('next')}
        </Button>

        <Button
          variant="ghost"
          size="wizard"
          className={confirmingStartOver ? 'text-destructive hover:text-destructive' : ''}
          onClick={handleStartOver}
        >
          {confirmingStartOver && <ChevronLeft data-icon="inline-start" />}
          {confirmingStartOver ? t('startOverYes') : t('startOver')}
        </Button>
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListRow variant="embedded" interactive={false}>
      <ListRowBody>
        <ListRowDescription>{label}</ListRowDescription>
        <ListRowTitle>{value || DASH}</ListRowTitle>
      </ListRowBody>
    </ListRow>
  )
}

function PropertySection({
  result,
}: {
  result: ContractExtractionResult
}) {
  const t = useTranslations('propertyCreation.review')

  return (
    <section>
      <SectionLabel>{t('sections.property')}</SectionLabel>
      <Card size="none">
        <List>
          <FieldRow
            label={t('fields.address')}
            value={result.address ? formatAddress(result.address) : null}
          />
          <FieldRow
            label={t('fields.propertyType')}
            value={result.propertyType}
          />
        </List>
      </Card>
    </section>
  )
}

function RentSection({
  result,
  locale,
}: {
  result: ContractExtractionResult
  locale: Locale
}) {
  const t = useTranslations('propertyCreation.review')
  const rent: ContractRent | null = result.rent
  const dates = result.contractDates
  const adj: ContractRentAdjustment | null = result.rentAdjustment

  return (
    <section>
      <SectionLabel>{t('sections.rent')}</SectionLabel>
      <Card size="none">
        <List>
          <ListRow variant="embedded" interactive={false}>
            <ListRowBody>
              <ListRowDescription>{t('fields.rentAmount')}</ListRowDescription>
              {rent ? (
                <AmountDisplay
                  amountMinor={rent.amount}
                  currency={rent.currency ?? 'BRL'}
                  size="sm"
                />
              ) : (
                <ListRowTitle>{DASH}</ListRowTitle>
              )}
            </ListRowBody>
          </ListRow>
          <FieldRow
            label={t('fields.dueDay')}
            value={rent?.dueDay ? t('dueDayValue', { day: rent.dueDay }) : null}
          />
          {rent?.includes && rent.includes.length > 0 && (
            <FieldRow
              label={t('fields.includes')}
              value={rent.includes.join(', ')}
            />
          )}
          <FieldRow
            label={t('fields.startDate')}
            value={dates?.start ? formatDate(dates.start, locale) : null}
          />
          <FieldRow
            label={t('fields.endDate')}
            value={dates?.end ? formatDate(dates.end, locale) : null}
          />
          {adj && (
            <>
              <FieldRow
                label={t('fields.adjustmentFrequency')}
                value={adj.frequency}
              />
              <FieldRow
                label={t('fields.adjustmentMethod')}
                value={adj.method}
              />
              {adj.indexName && (
                <FieldRow
                  label={t('fields.adjustmentIndex')}
                  value={adj.indexName}
                />
              )}
            </>
          )}
        </List>
      </Card>
    </section>
  )
}

function PartyRow({ party }: { party: ContractParty }) {
  return (
    <ListRow variant="embedded" interactive={false}>
      <ListRowLeading>
        <IconTile tone="muted" size="md">
          <User />
        </IconTile>
      </ListRowLeading>
      <ListRowBody>
        <ListRowTitle>{party.name || DASH}</ListRowTitle>
        {(party.taxId || party.email) && (
          <ListRowDescription>
            {[party.taxId, party.email].filter(Boolean).join(' · ')}
          </ListRowDescription>
        )}
      </ListRowBody>
    </ListRow>
  )
}

function PartiesSection({ result }: { result: ContractExtractionResult }) {
  const t = useTranslations('propertyCreation.review')
  const landlords = result.landlords ?? []
  const tenants = result.tenants ?? []

  return (
    <section>
      <SectionLabel>{t('sections.parties')}</SectionLabel>
      <Card size="none">
        <List>
          {landlords.map((p, i) => (
            <PartyRow key={`landlord-${i}`} party={p} />
          ))}
          {tenants.map((p, i) => (
            <PartyRow key={`tenant-${i}`} party={p} />
          ))}
          {landlords.length === 0 && tenants.length === 0 && (
            <FieldRow label={t('sections.parties')} value={null} />
          )}
        </List>
      </Card>
    </section>
  )
}

function ExpensesSection({ result }: { result: ContractExtractionResult }) {
  const t = useTranslations('propertyCreation.review')
  const expenses: ContractExpense[] = result.expenses ?? []

  if (expenses.length === 0) {
    return (
      <section>
        <SectionLabel>{t('sections.expenses')}</SectionLabel>
        <Card size="none">
          <List>
            <ListRow variant="embedded" interactive={false}>
              <ListRowLeading>
                <IconTile tone="muted" size="md">
                  <Receipt />
                </IconTile>
              </ListRowLeading>
              <ListRowBody>
                <ListRowTitle className="text-muted-foreground">
                  {t('noExpenses')}
                </ListRowTitle>
              </ListRowBody>
            </ListRow>
          </List>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <SectionLabel>{t('sections.expenses')}</SectionLabel>
      <Card size="none">
        <List>
          {expenses.map((exp, i) => (
            <ListRow key={i} variant="embedded" interactive={false}>
              <ListRowLeading>
                <IconTile tone="muted" size="md">
                  <Zap />
                </IconTile>
              </ListRowLeading>
              <ListRowBody>
                <ListRowTitle>{exp.type ?? DASH}</ListRowTitle>
                <ListRowDescription>
                  {[exp.providerName, exp.providerTaxId].filter(Boolean).join(' · ') || DASH}
                </ListRowDescription>
              </ListRowBody>
            </ListRow>
          ))}
        </List>
      </Card>
    </section>
  )
}

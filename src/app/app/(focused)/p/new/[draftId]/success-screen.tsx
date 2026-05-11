'use client'

/**
 * Wizard success screen. Rendered after `createProperty` resolves
 * with `{ ok: true, summary }`. Lives in the focused-route shell so the
 * Wordmark stays in the top-left and there's no app chrome bleed.
 *
 * Reads exclusively from the `summary` payload — no follow-up fetch. Each
 * card section renders only when its corresponding data is present and
 * non-empty (spec §Success Behavior).
 *
 * No theatrical animation: the icon and copy fade in with the existing
 * 800ms `animate-fade-in` keyframe, matching the design system's calm
 * motion direction.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Home,
  Receipt,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { EyebrowLabel } from '@/components/eyebrow-label'
import { FadeIn } from '@/components/fade-in'
import { IconTile } from '@/components/icon-tile'
import { formatAddress } from '@/lib/address/format-address'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'

import type {
  ExpenseType,
  SubmitSummary,
} from '@/data/properties/actions/server-errors'

interface SuccessScreenProps {
  summary: SubmitSummary
}

export function PropertyCreationSuccessScreen({ summary }: SuccessScreenProps) {
  const t = useTranslations('propertyCreation.success')
  const tExpenses = useTranslations('propertyCreation.checkout.expenses.typeOptions')
  const tPropertyTypes = useTranslations('properties.propertyTypeOptions')
  const locale = useLocale() as Locale

  const showContract = summary.contract !== null
  const contractFailed =
    summary.contract !== null &&
    (summary.contract.upload_status === 'failed' || summary.contract.upload_failed === true)
  const showRent = summary.rent !== null
  const showTenants =
    summary.tenants.invited_count > 0 ||
    summary.tenants.deferred_count > 0 ||
    (summary.tenants.email_failed_count ?? 0) > 0
  const showExpenses = summary.expenses.count > 0
  const providerRequestNewCount = summary.provider_requests.new_count ?? 0
  const showProviderRequests = providerRequestNewCount > 0
  const billUploadFailedCount =
    summary.provider_requests.bill_upload_failed_count ?? 0
  const showBillUploadFailed = billUploadFailedCount > 0

  // Address line is the same helper the property page uses for consistency.
  const addressLine = useMemo(
    () => formatAddress(summary.property_address),
    [summary.property_address],
  )

  // Translated property-type label. Pulls from the existing
  // `properties.propertyTypeOptions` namespace so the wording matches the
  // wizard form. Returns null when no property type was chosen.
  const propertyTypeLabel = useMemo(() => {
    if (!summary.property_type) return null
    return tPropertyTypes(summary.property_type)
  }, [summary.property_type, tPropertyTypes])

  // Provider requests note. The summary payload carries counts only — the
  // RPC return shape does not include provider names today (spec lines
  // 905-909). The copy is intentionally generic (no name interpolation) so
  // landlord A's request never leaks landlord A's identity to landlord B
  // on a deduped read path. See `.claude/rules/security-lgpd.md` §LGPD
  // posture for shared rows.

  return (
    <FadeIn className="mx-auto flex w-full max-w-xl flex-col px-6 pb-12 pt-8">
      <div className="flex flex-col items-center text-center">
        <IconTile tone="success" size="lg" shape="circle" aria-hidden="true">
          <CheckCircle2 />
        </IconTile>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>
      </div>

      <Card className="mt-8 flex flex-col gap-5">
        <SummarySection
          icon={<Home aria-hidden="true" />}
          eyebrow={t('summary.property.title')}
        >
          <p className="text-sm font-bold text-foreground sm:text-base">
            {summary.property_name}
          </p>
          {addressLine ? (
            <p className="text-sm text-muted-foreground">{addressLine}</p>
          ) : null}
          {propertyTypeLabel ? (
            <p className="text-sm text-muted-foreground">{propertyTypeLabel}</p>
          ) : null}
        </SummarySection>

        {showRent && summary.rent ? (
          <SummarySection
            icon={<Wallet aria-hidden="true" />}
            eyebrow={t('summary.rent.title')}
          >
            <p className="text-sm font-bold text-foreground sm:text-base">
              {formatCurrency(summary.rent.amount_minor, summary.rent.currency, locale)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('summary.rent.dueEvery', {
                ordinal: ordinal(summary.rent.due_day_of_month, locale),
              })}
            </p>
            {(summary.rent.includes ?? []).length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('summary.rent.includes', {
                  list: (summary.rent.includes ?? [])
                    .map((expenseType) => tExpenses(expenseType as ExpenseType))
                    .join(', '),
                })}
              </p>
            ) : null}
          </SummarySection>
        ) : null}

        {showContract && summary.contract ? (
          <SummarySection
            icon={<FileText aria-hidden="true" />}
            eyebrow={t('summary.contract.title')}
          >
            {contractFailed ? (
              <ContractUploadFailed
                propertyId={summary.property_id}
                message={t('summary.contract.uploadFailed')}
                reuploadLabel={t('summary.contract.reupload')}
              />
            ) : (
              <p className="text-sm text-foreground sm:text-base">
                {t('summary.contract.uploaded')}
              </p>
            )}
            {summary.contract.original_filename ? (
              <p className="text-sm text-muted-foreground">
                {summary.contract.original_filename}
              </p>
            ) : null}
          </SummarySection>
        ) : null}

        {showTenants ? (
          <SummarySection
            icon={<Users aria-hidden="true" />}
            eyebrow={t('summary.tenants.title')}
          >
            {summary.tenants.invited_count > 0 ? (
              <p className="text-sm text-foreground sm:text-base">
                {t('summary.tenants.invited', {
                  count: summary.tenants.invited_count,
                })}
              </p>
            ) : null}
            {summary.tenants.deferred_count > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('summary.tenants.deferred', {
                  count: summary.tenants.deferred_count,
                })}
              </p>
            ) : null}
            {(summary.tenants.email_failed_count ?? 0) > 0 ? (
              <InlineWarning>
                {t('summary.tenants.emailFailed', {
                  count: summary.tenants.email_failed_count ?? 0,
                })}
              </InlineWarning>
            ) : null}
          </SummarySection>
        ) : null}

        {showExpenses ? (
          <SummarySection
            icon={<Receipt aria-hidden="true" />}
            eyebrow={t('summary.expenses.title')}
          >
            <p className="text-sm text-foreground sm:text-base">
              {t('summary.expenses.tracked', {
                count: summary.expenses.count,
              })}
            </p>
            {Object.keys(summary.expenses.by_type).length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('summary.expenses.byTypeList', {
                  list: formatByTypeList(summary.expenses.by_type, tExpenses),
                })}
              </p>
            ) : null}
          </SummarySection>
        ) : null}

        {showProviderRequests ? (
          <SummarySection
            icon={<Wrench aria-hidden="true" />}
            eyebrow={t('summary.providerRequests.title')}
          >
            <p className="text-sm text-muted-foreground">
              {t('summary.providerRequests.note')}
            </p>
            {showBillUploadFailed ? (
              <InlineWarning>
                {t('summary.providerRequests.billUploadFailed', {
                  count: billUploadFailedCount,
                })}
              </InlineWarning>
            ) : null}
          </SummarySection>
        ) : null}
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse sm:justify-center">
        {/* <Link
          href={`/app/p/${summary.property_id}`}
          className={cn(buttonVariants({ size: 'default' }), 'w-full sm:w-auto')}
        >
          {t('cta.viewProperty')}
        </Link> */}
        <Link
          href="/app"
          className={cn(
            buttonVariants({ size: 'default', variant: 'outline' }),
            'w-full sm:w-auto',
          )}
        >
          {t('cta.goToDashboard')}
        </Link>
      </div>
    </FadeIn>
  )
}

// Internal sub-components — colocated to keep the success-screen file
// self-contained. None of these should be reused outside this screen; if a
// similar pattern arises elsewhere, promote it into a shared primitive
// rather than re-exporting from here.

function SummarySection({
  icon,
  eyebrow,
  children,
}: {
  icon: React.ReactNode
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <IconTile tone="muted" size="sm" shape="square" aria-hidden="true">
        {icon}
      </IconTile>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <EyebrowLabel tone="muted" className="text-[0.6875rem]">
          {eyebrow}
        </EyebrowLabel>
        {children}
      </div>
    </div>
  )
}

function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function ContractUploadFailed({
  propertyId,
  message,
  reuploadLabel,
}: {
  propertyId: string
  message: string
  reuploadLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-1.5 text-sm text-destructive">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </p>
      <Link
        href={`/app/p/${propertyId}`}
        className={cn(
          buttonVariants({ size: 'xs', variant: 'outline' }),
          'self-start',
        )}
      >
        {reuploadLabel}
      </Link>
    </div>
  )
}

// Builders & formatters

/**
 * Formats `expenses.by_type` into a comma-joined translated list, omitting
 * entries with a zero count. Stable order: matches the enum order so the
 * line reads predictably across submits.
 */
function formatByTypeList(
  byType: SubmitSummary['expenses']['by_type'],
  tExpenses: (key: ExpenseType) => string,
): string {
  const EXPENSE_ORDER: ExpenseType[] = [
    'electricity',
    'water',
    'gas',
    'internet',
    'condo',
    'trash',
    'sewer',
    'cable',
    'insurance',
    'maintenance',
    'other',
  ]
  return EXPENSE_ORDER.filter((key) => (byType[key] ?? 0) > 0)
    .map((key) => tExpenses(key))
    .join(', ')
}

/**
 * Locale-aware ordinal formatter for the rent due-day line ("every 10th").
 * Uses `Intl.PluralRules` to pick the correct suffix in English, and
 * falls back to "{day}º" / "{day}°" for PT-BR / ES (Brazilian Portuguese
 * and Spanish both use the masculine ordinal indicator for day-of-month).
 */
function ordinal(day: number, locale: Locale): string {
  if (locale === 'en') {
    const pr = new Intl.PluralRules('en-US', { type: 'ordinal' })
    const rule = pr.select(day)
    const suffix: Record<Intl.LDMLPluralRule, string> = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      other: 'th',
      zero: 'th',
      many: 'th',
    }
    return `${day}${suffix[rule] ?? 'th'}`
  }
  // pt-BR and es both use the masculine ordinal indicator for day numerals.
  return `${day}º`
}

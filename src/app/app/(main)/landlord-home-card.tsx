'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { cardShellClassName } from '@/components/ui/card'
import { AmountDisplay } from '@/components/amount-display'
import { IconTile } from '@/components/icon-tile'
import { PROPERTY_TYPE_ICONS } from '@/lib/property/constants'
import type {
  LandlordHomePropertyCard,
  LeaseEndState,
} from '@/data/landlord-home/client'

type IconTileTone = 'success' | 'warning' | 'destructive'

function iconTileTone(
  hasActiveContract: boolean,
  endState: LeaseEndState,
): IconTileTone | null {
  if (!hasActiveContract) return null
  if (endState === 'ending-imminent') return 'destructive'
  if (endState === 'ending-soon') return 'warning'
  return 'success'
}

type StatusInfo = {
  label: string
  dotClass: string
  textClass: string
}

function statusInfo(
  card: LandlordHomePropertyCard,
  t: ReturnType<typeof useTranslations<'landlordHome'>>,
): StatusInfo {
  if (card.monthly_minor === null) {
    if (card.end_state === 'ended') {
      return {
        label: t('statusEnded'),
        dotClass: 'bg-muted-foreground/50',
        textClass: 'text-muted-foreground',
      }
    }
    return {
      label: t('statusNoContract'),
      dotClass: 'bg-muted-foreground/40',
      textClass: 'text-muted-foreground',
    }
  }
  if (card.end_state === 'ending-imminent') {
    return {
      label: t('statusEndsInDays', { days: card.days_until_end ?? 0 }),
      dotClass: 'bg-destructive-subtle-foreground',
      textClass: 'text-destructive-subtle-foreground',
    }
  }
  if (card.end_state === 'ending-soon') {
    return {
      label: t('statusEndsInDays', { days: card.days_until_end ?? 0 }),
      dotClass: 'bg-warning-subtle-foreground',
      textClass: 'text-warning-subtle-foreground',
    }
  }
  return {
    label: t('statusActive'),
    dotClass: 'bg-success',
    textClass: 'text-success-subtle-foreground',
  }
}

export function LandlordHomeCard({ card }: { card: LandlordHomePropertyCard }) {
  const t = useTranslations('landlordHome')
  const tTypes = useTranslations('properties.propertyTypeOptions')

  const locationLine = card.property_address.neighborhood
    ? [
        card.property_address.neighborhood,
        card.property_address.city,
        card.property_address.state,
      ]
        .filter(Boolean)
        .join(', ')
    : ''

  const hasActiveContract = card.monthly_minor !== null
  const propertyTypeLabel = card.property_type ? tTypes(card.property_type) : null
  const PropertyTypeIcon = card.property_type ? PROPERTY_TYPE_ICONS[card.property_type] : null
  const tone = iconTileTone(hasActiveContract, card.end_state)
  const status = statusInfo(card, t)

  return (
    <Link
      href={`/app/p/${card.property_id}`}
      prefetch
      className={cardShellClassName({ size: 'none', interactive: true, className: 'block' })}
    >
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
        {PropertyTypeIcon ? (
          tone ? (
            <IconTile
              size="sm"
              shape="circle"
              tone={tone}
              aria-label={propertyTypeLabel ?? undefined}
              className="hidden sm:inline-flex"
            >
              <PropertyTypeIcon />
            </IconTile>
          ) : (
            <PropertyTypeIcon
              aria-label={propertyTypeLabel ?? undefined}
              className="hidden size-5 shrink-0 text-muted-foreground/40 sm:block"
            />
          )
        ) : null}

        <div className="min-w-0 sm:flex-1">
          <div className="mb-1.5 flex items-center justify-between sm:hidden">
            <p
              className={`inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide ${status.textClass}`}
            >
              <span className={`size-1.5 rounded-full ${status.dotClass}`} aria-hidden="true" />
              {status.label}
            </p>
            <ChevronRight className="size-4 text-muted-foreground/50" aria-hidden="true" />
          </div>
          <h3
            className={`text-base font-display font-medium sm:truncate ${
              hasActiveContract ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {card.property_name}
          </h3>
          {locationLine ? (
            <p className="mt-0.5 text-sm text-muted-foreground sm:truncate">{locationLine}</p>
          ) : null}

          {hasActiveContract ? (
            <p className="mt-3 flex items-baseline gap-2 sm:hidden">
              <AmountDisplay
                amountMinor={card.monthly_minor ?? 0}
                currency={card.currency}
                size="sm"
                fractionDigits={0}
              />
              <span className="text-sm text-muted-foreground">/ {t('perMonth')}</span>
              <span aria-hidden="true" className="text-muted-foreground/40">·</span>
              <AmountDisplay
                amountMinor={card.earned_minor ?? 0}
                currency={card.currency}
                size="xs"
                tone="muted"
                fractionDigits={0}
              />
              <span className="text-sm text-muted-foreground">{t('earned').toLowerCase()}</span>
            </p>
          ) : null}
        </div>

        {hasActiveContract ? (
          <div className="hidden shrink-0 items-baseline justify-end gap-3 sm:flex sm:flex-col sm:items-end sm:gap-0.5">
            <p className="flex items-baseline gap-1">
              <AmountDisplay
                amountMinor={card.monthly_minor ?? 0}
                currency={card.currency}
                size="sm"
                fractionDigits={0}
              />
              <span className="text-sm text-muted-foreground">/ {t('perMonth')}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t('earned')}{' '}
              <AmountDisplay
                amountMinor={card.earned_minor ?? 0}
                currency={card.currency}
                size="xs"
                tone="muted"
                fractionDigits={0}
              />
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

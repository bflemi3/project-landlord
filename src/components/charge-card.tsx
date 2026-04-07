'use client'

import { useTranslations } from 'next-intl'
import { Zap, Home, Repeat } from 'lucide-react'
import {
  ChargeRow,
  ChargeRowIcon,
  ChargeRowContent,
  ChargeRowTitle,
  ChargeRowDescription,
  ChargeRowAmount,
} from '@/components/charge-row'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format-currency'
import type { ChargeDefinition } from '@/lib/hooks/use-unit-charges'

const CHARGE_TYPE_ICONS: Record<string, React.ElementType> = {
  rent: Home,
  recurring: Repeat,
  variable: Zap,
}

export function ChargeCard({
  charge,
  configured = false,
  onClick,
  className,
}: {
  charge: ChargeDefinition
  configured?: boolean
  onClick?: () => void
  className?: string
}) {
  const t = useTranslations('propertyDetail')
  const Icon = CHARGE_TYPE_ICONS[charge.chargeType] ?? Repeat
  const subtitle = buildSubtitle(charge, t)

  return (
    <ChargeRow configured={configured} onClick={onClick} className={cn(!charge.isActive && 'opacity-50', className)}>
      <ChargeRowIcon>
        <Icon className="size-4" />
      </ChargeRowIcon>

      <ChargeRowContent>
        <ChargeRowTitle>{charge.name}</ChargeRowTitle>
        {subtitle && <ChargeRowDescription>{subtitle}</ChargeRowDescription>}
      </ChargeRowContent>

      {!charge.isActive ? (
        <Badge variant="secondary" className="text-xs">{t('chargeInactive')}</Badge>
      ) : charge.amountMinor ? (
        <ChargeRowAmount className="text-sm">
          {formatCurrency(charge.amountMinor, charge.currency)}
        </ChargeRowAmount>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">{t('variable')}</span>
      )}
    </ChargeRow>
  )
}

function buildSubtitle(
  charge: ChargeDefinition,
  t: ReturnType<typeof useTranslations<'propertyDetail'>>,
): string | null {
  const { split } = charge

  const parts: string[] = []

  // Type label
  if (charge.chargeType === 'rent') parts.push(t('rent'))
  else if (charge.chargeType === 'recurring') parts.push(t('recurring'))

  // Split label
  if (split.payer === 'landlord') {
    parts.push(t('landlordPays'))
  } else if (split.payer === 'split' && split.allocationType === 'fixed_amount' && split.tenantFixedMinor != null) {
    parts.push(t('splitFixedLabel', {
      tenant: formatCurrency(split.tenantFixedMinor, charge.currency),
      landlord: formatCurrency(split.landlordFixedMinor ?? 0, charge.currency),
    }))
  } else if (split.payer === 'split' && split.allocationType === 'percentage') {
    parts.push(t('splitLabel', {
      tenant: Math.round(split.tenantPercent),
      landlord: Math.round(split.landlordPercent),
    }))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

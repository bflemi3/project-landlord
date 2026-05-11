'use client'

import { useTranslations } from 'next-intl'
import {
  Zap, Repeat,
  Bolt, Droplet, Flame, Wifi, Building2, Trash2, Waves, Tv, ShieldCheck, Wrench, Receipt,
} from 'lucide-react'
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
import type { ChargeDefinition, ExpenseType } from '@/data/units/client'

// Icons by expense_type. Variable charges get a generic Zap when the type
// doesn't itself imply an icon. Rent rows are not in this table, so no Home.
const EXPENSE_TYPE_ICONS: Record<ExpenseType, React.ElementType> = {
  electricity: Bolt,
  water: Droplet,
  gas: Flame,
  internet: Wifi,
  condo: Building2,
  trash: Trash2,
  sewer: Waves,
  cable: Tv,
  insurance: ShieldCheck,
  maintenance: Wrench,
  other: Receipt,
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
  const Icon =
    EXPENSE_TYPE_ICONS[charge.expenseType] ??
    (charge.amountBehavior === 'variable' ? Zap : Repeat)
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

  // Behavior label: render "Fixed" for fixed-amount charges. Variable
  // already shows in the right-side amount slot ("variable" label).
  if (charge.amountBehavior === 'fixed') parts.push(t('amountBehaviorFixed'))

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

'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type AmountDisplaySize = 'xs' | 'sm' | 'default' | 'lg' | 'xl'
type AmountDisplayTone = 'default' | 'muted' | 'primary' | 'destructive' | 'highlight'

const sizeClasses: Record<AmountDisplaySize, string> = {
  xs: 'text-sm font-medium',
  sm: 'text-lg font-semibold',
  default: 'text-2xl font-bold',
  lg: 'text-3xl font-bold tracking-tight',
  xl: 'text-4xl font-bold tracking-tight',
}

const toneClasses: Record<AmountDisplayTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  destructive: 'text-destructive',
  highlight: 'text-highlight',
}

function AmountDisplay({
  className,
  amountMinor,
  currency = 'BRL',
  size = 'default',
  tone = 'default',
  fractionDigits,
  ...props
}: React.ComponentProps<'span'> & {
  amountMinor: number
  currency?: string
  size?: AmountDisplaySize
  tone?: AmountDisplayTone
  fractionDigits?: number
}) {
  const locale = useLocale() as Locale

  return (
    <span
      data-slot="amount-display"
      data-size={size}
      data-tone={tone}
      className={cn('tabular-nums', sizeClasses[size], toneClasses[tone], className)}
      {...props}
    >
      {formatCurrency(
        amountMinor,
        currency,
        locale,
        fractionDigits !== undefined ? { fractionDigits } : undefined,
      )}
    </span>
  )
}

export { AmountDisplay }

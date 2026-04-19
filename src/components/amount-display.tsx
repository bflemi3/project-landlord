'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type AmountDisplaySize = 'sm' | 'default' | 'lg' | 'xl'
type AmountDisplayTone = 'default' | 'muted' | 'primary' | 'destructive'

const sizeClasses: Record<AmountDisplaySize, string> = {
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
}

function AmountDisplay({
  className,
  amountMinor,
  currency = 'BRL',
  size = 'default',
  tone = 'default',
  ...props
}: React.ComponentProps<'span'> & {
  amountMinor: number
  currency?: string
  size?: AmountDisplaySize
  tone?: AmountDisplayTone
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
      {formatCurrency(amountMinor, currency, locale)}
    </span>
  )
}

export { AmountDisplay }

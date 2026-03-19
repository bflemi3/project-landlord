'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import { type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type AmountDisplaySize = 'sm' | 'default' | 'lg'

const sizeClasses: Record<AmountDisplaySize, string> = {
  sm: 'text-lg font-semibold',
  default: 'text-2xl font-bold',
  lg: 'text-4xl font-bold tracking-tight',
}

function AmountDisplay({
  className,
  amountMinor,
  currency = 'BRL',
  size = 'default',
  ...props
}: React.ComponentProps<'span'> & {
  amountMinor: number
  currency?: string
  size?: AmountDisplaySize
}) {
  const locale = useLocale() as Locale

  return (
    <span
      data-slot="amount-display"
      data-size={size}
      className={cn('tabular-nums', sizeClasses[size], className)}
      {...props}
    >
      {formatCurrency(amountMinor, currency, locale)}
    </span>
  )
}

export { AmountDisplay }

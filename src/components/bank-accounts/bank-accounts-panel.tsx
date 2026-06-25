'use client'

import { Landmark } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from '@/components/empty-state'
import { List } from '@/components/list-row'
import { Card } from '@/components/ui/card'
import { useBankItems } from '@/data/bank-accounts/client'

import { BankAccountRow } from './bank-account-row'
import { ConnectButton } from './connect-button'

type Props = {
  /**
   * Where this panel is mounted. Reserved for analytics labelling — both
   * surfaces currently render the same shape.
   */
  surface?: 'wizard' | 'settings'
}

// surface is reserved for analytics; not used in rendering yet.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BankAccountsPanel({ surface }: Props = {}) {
  const t = useTranslations('bankAccounts')
  const { data: items } = useBankItems()

  if (items.length === 0) {
    return (
      <Card size="lg">
        <EmptyState className="py-8">
          <EmptyStateIcon tone="primary">
            <Landmark />
          </EmptyStateIcon>
          <EmptyStateTitle>{t('empty.title')}</EmptyStateTitle>
          <EmptyStateDescription>{t('empty.body')}</EmptyStateDescription>
          <EmptyStateActions>
            <ConnectButton />
          </EmptyStateActions>
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card size="none">
        <List>
          {items.map((item) => (
            <BankAccountRow key={item.id} item={item} />
          ))}
        </List>
      </Card>
      <div className="flex justify-start">
        <ConnectButton variant="secondary" size="sm" />
      </div>
    </div>
  )
}

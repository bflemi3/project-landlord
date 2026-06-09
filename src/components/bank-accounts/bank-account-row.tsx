'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Landmark, MoreVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// react-pluggy-connect touches `window` at module-eval time; load it only on
// the client so SSR doesn't crash.
const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((m) => m.PluggyConnect),
  { ssr: false },
)

import { IconTile } from '@/components/icon-tile'
import {
  ListRow,
  ListRowBody,
  ListRowDescription,
  ListRowLeading,
  ListRowTitle,
  ListRowTrailing,
} from '@/components/list-row'
import { StatusBadge, type StatusBadgeVariant } from '@/components/status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useDisconnectBankItemMutation,
  type BankItemWithAccounts,
} from '@/data/bank-accounts/client'
import { registerPluggyItem } from '@/data/bank-accounts/actions/register-item'
import { bankAccountsQueryKey } from '@/data/bank-accounts/shared'

import { usePluggyConnect } from './use-pluggy-connect'

type Props = {
  item: BankItemWithAccounts
}

const statusToBadgeVariant: Record<
  BankItemWithAccounts['status'],
  StatusBadgeVariant
> = {
  connected: 'paid',
  reconnect_required: 'pending',
  disconnected: 'draft',
}

function badgeStatusKey(
  status: BankItemWithAccounts['status'],
): 'connected' | 'reconnectRequired' | 'disconnected' {
  if (status === 'reconnect_required') return 'reconnectRequired'
  return status
}

function formatMaskedAccounts(item: BankItemWithAccounts): string {
  const masks = item.accounts
    .map((a) => a.masked_number)
    .filter((m): m is string => Boolean(m && m.trim().length > 0))
  return masks.join(' · ')
}

export function BankAccountRow({ item }: Props) {
  const t = useTranslations('bankAccounts')
  const queryClient = useQueryClient()
  const disconnect = useDisconnectBankItemMutation()
  const connect = usePluggyConnect()

  const maskedAccounts = formatMaskedAccounts(item)

  const handleDisconnect = useCallback(() => {
    if (!window.confirm(t('actions.disconnectConfirm'))) return
    disconnect.mutate(item.id, {
      onError: () => toast.error(t('errors.disconnectFailed')),
    })
  }, [disconnect, item.id, t])

  const handleReconnect = useCallback(() => {
    void connect.open({ itemId: item.pluggy_item_id })
  }, [connect, item.pluggy_item_id])

  const handleSuccess = useCallback(
    async ({ item: pluggyItem }: { item: { id: string } }) => {
      const result = await registerPluggyItem(pluggyItem.id)
      connect.reset()
      if (!result.success) {
        toast.error(t('errors.registerFailed'))
        return
      }
      void queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey() })
    },
    [connect, queryClient, t],
  )

  const handleWidgetError = useCallback(() => {
    connect.reset()
    toast.error(t('errors.tokenFailed'))
  }, [connect, t])

  return (
    <ListRow variant="embedded" interactive={false}>
      <ListRowLeading>
        <IconTile tone="primary" shape="square" size="md">
          <Landmark />
        </IconTile>
      </ListRowLeading>
      <ListRowBody>
        <ListRowTitle>{item.institution_name}</ListRowTitle>
        {maskedAccounts && (
          <ListRowDescription>{maskedAccounts}</ListRowDescription>
        )}
      </ListRowBody>
      <ListRowTrailing className="flex items-center gap-2">
        <StatusBadge variant={statusToBadgeVariant[item.status]}>
          {t(`status.${badgeStatusKey(item.status)}`)}
        </StatusBadge>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('actions.menu')}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-popup-open:bg-muted/40"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status === 'reconnect_required' && (
              <>
                <DropdownMenuItem onClick={handleReconnect}>
                  {t('actions.reconnect')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
            >
              {t('actions.disconnect')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ListRowTrailing>

      {connect.state.phase === 'open' && (
        <PluggyConnect
          connectToken={connect.state.connectToken}
          includeSandbox
          updateItem={item.pluggy_item_id}
          onSuccess={handleSuccess}
          onError={handleWidgetError}
          onClose={connect.reset}
        />
      )}
    </ListRow>
  )
}

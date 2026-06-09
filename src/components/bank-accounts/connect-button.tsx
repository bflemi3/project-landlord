'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// react-pluggy-connect touches `window` at module-eval time; load it only on
// the client so SSR doesn't crash.
const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((m) => m.PluggyConnect),
  { ssr: false },
)

import { Button } from '@/components/ui/button'
import { bankAccountsQueryKey } from '@/data/bank-accounts/shared'
import { registerPluggyItem } from '@/data/bank-accounts/actions/register-item'

import { usePluggyConnect } from './use-pluggy-connect'

type Props = {
  /** Pluggy item id — when set, the widget opens in update / reconnect mode. */
  itemId?: string
  /** Defaults to the localized "Connect a bank" label. */
  label?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}

export function ConnectButton({ itemId, label, variant, size, className }: Props) {
  const t = useTranslations('bankAccounts')
  const queryClient = useQueryClient()
  const { state, open, reset } = usePluggyConnect()

  const handleClick = useCallback(() => {
    void open({ itemId })
  }, [open, itemId])

  const handleSuccess = useCallback(
    async ({ item }: { item: { id: string } }) => {
      const result = await registerPluggyItem(item.id)
      reset()
      if (!result.success) {
        toast.error(t('errors.registerFailed'))
        return
      }
      void queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey() })
    },
    [queryClient, reset, t],
  )

  const handleError = useCallback(() => {
    reset()
    toast.error(t('errors.tokenFailed'))
  }, [reset, t])

  const handleClose = useCallback(() => {
    reset()
  }, [reset])

  // Surface the connect-token error to the user; the widget itself never
  // mounted, so there's nothing to clean up.
  if (state.phase === 'error') {
    toast.error(t('errors.tokenFailed'))
    reset()
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={state.phase === 'minting' || state.phase === 'open'}
      >
        {state.phase === 'minting'
          ? t('connecting')
          : (label ?? t('connectCta'))}
      </Button>

      {state.phase === 'open' && (
        <PluggyConnect
          connectToken={state.connectToken}
          includeSandbox
          updateItem={itemId}
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={handleClose}
        />
      )}
    </>
  )
}

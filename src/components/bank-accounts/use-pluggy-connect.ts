'use client'

import { useCallback, useState } from 'react'

import { createPluggyConnectToken } from '@/data/bank-accounts/actions/create-connect-token'

type ConnectState =
  | { phase: 'idle' }
  | { phase: 'minting' }
  | { phase: 'open'; connectToken: string }
  | { phase: 'error'; reason: 'unauthenticated' | 'pluggy_error' }

/**
 * Two-step Pluggy Connect launcher.
 *
 *  1. Caller invokes `open()` → we mint a short-lived connect_token server-side.
 *  2. While `state.phase === 'open'`, render <PluggyConnect connectToken=… />
 *     with the consumer's onSuccess / onError / onClose handlers.
 *  3. The consumer's handlers call `reset()` to dismount the widget.
 *
 * Keeping the widget render in the consumer (rather than inside this hook)
 * lets each surface compose its own onSuccess flow (e.g. invalidate query,
 * surface toast, navigate).
 */
export function usePluggyConnect() {
  const [state, setState] = useState<ConnectState>({ phase: 'idle' })

  const open = useCallback(async (options: { itemId?: string } = {}) => {
    setState({ phase: 'minting' })
    const result = await createPluggyConnectToken(options)
    if (!result.success) {
      setState({ phase: 'error', reason: result.reason })
      return
    }
    setState({ phase: 'open', connectToken: result.accessToken })
  }, [])

  const reset = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return { state, open, reset }
}

'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const BROADCAST_CHANNEL = 'mabenn-email-verification'

/**
 * Listens for email verification from another tab (via BroadcastChannel)
 * with a polling fallback for cross-device/browser confirmation.
 */
export function useEmailVerification(enabled: boolean, onVerified: () => void) {
  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    // Primary: BroadcastChannel for instant cross-tab detection
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL)
      channel.onmessage = (event) => {
        if (event.data.type === 'EMAIL_VERIFIED') {
          onVerified()
        }
      }
    } catch {
      // BroadcastChannel not supported
    }

    // Fallback: poll every 3s checking email_confirmed_at
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        clearInterval(interval)
        onVerified()
      }
    }, 3000)

    return () => {
      channel?.close()
      clearInterval(interval)
    }
  }, [enabled, onVerified])
}

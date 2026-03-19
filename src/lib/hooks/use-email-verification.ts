'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const BROADCAST_CHANNEL = 'mabenn-email-verification'

/**
 * Listens for email verification from another tab (via BroadcastChannel)
 * with a polling fallback for cross-device/browser confirmation.
 *
 * @param enabled — only starts listening when true (e.g., after sign-up success)
 * @param onVerified — called when verification is detected
 */
export function useEmailVerification(enabled: boolean, onVerified: () => void) {
  useEffect(() => {
    if (!enabled) return

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

    // Fallback: poll session every 3s (handles different device/browser)
    const interval = setInterval(async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
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

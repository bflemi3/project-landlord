'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

interface PostHogIdentifyProps {
  userId: string
  email?: string
  name?: string
  locale?: string
  acquisitionChannel?: string
}

export function PostHogIdentify({ userId, email, name, locale, acquisitionChannel }: PostHogIdentifyProps) {
  useEffect(() => {
    if (userId) {
      posthog.identify(userId, {
        ...(email && { email }),
        ...(name && { name }),
        ...(locale && { locale }),
        ...(acquisitionChannel && { acquisition_channel: acquisitionChannel }),
      })
    }
  }, [userId, email, name, locale, acquisitionChannel])

  return null
}

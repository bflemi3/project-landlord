'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

interface PostHogIdentifyProps {
  userId: string
  email?: string
  name?: string
  locale?: string
}

export function PostHogIdentify({ userId, email, name, locale }: PostHogIdentifyProps) {
  useEffect(() => {
    if (userId && posthog.__loaded) {
      posthog.identify(userId, {
        ...(email && { email }),
        ...(name && { name }),
        ...(locale && { locale }),
      })
    }
  }, [userId, email, name, locale])

  return null
}

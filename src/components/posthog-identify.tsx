'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { useProfile } from '@/data/profiles/client'

export function PostHogIdentify() {
  const { data: profile } = useProfile()

  useEffect(() => {
    if (profile?.id) {
      posthog.identify(profile.id, {
        ...(profile.email && { email: profile.email }),
        ...(profile.fullName && { name: profile.fullName }),
      })
    }
  }, [profile])

  return null
}

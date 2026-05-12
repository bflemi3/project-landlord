'use client'

import { useEffect, useRef } from 'react'
import { captureEvent } from '@/lib/analytics/capture'

export function LandlordHomeAnalytics({ endingSoonCount }: { endingSoonCount: number }) {
  const viewedFired = useRef(false)
  const endingFired = useRef(false)

  useEffect(() => {
    if (viewedFired.current) return
    viewedFired.current = true
    captureEvent('landlord_home_viewed', { ending_soon_count: endingSoonCount })
  }, [endingSoonCount])

  useEffect(() => {
    if (endingFired.current) return
    if (endingSoonCount <= 0) return
    endingFired.current = true
    captureEvent('landlord_home_lease_ending_visible', {
      ending_soon_count: endingSoonCount,
    })
  }, [endingSoonCount])

  return null
}

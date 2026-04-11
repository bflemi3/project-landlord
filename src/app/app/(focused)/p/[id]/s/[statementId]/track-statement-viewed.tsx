'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export function TrackStatementViewed({ statementId }: { statementId: string }) {
  useEffect(() => {
    posthog.capture('statement_viewed', {
      statement_id: statementId,
      viewer_role: 'landlord',
    })
  }, [statementId])

  return null
}

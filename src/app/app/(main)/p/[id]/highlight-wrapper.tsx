'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HighlightProvider } from '@/lib/hooks/use-highlight-target'

export function HighlightWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const highlightTarget = searchParams.get('highlight')

  // Clear the param from the URL so refresh doesn't re-trigger
  useEffect(() => {
    if (!highlightTarget) return
    const url = new URL(window.location.href)
    url.searchParams.delete('highlight')
    router.replace(url.pathname + url.search, { scroll: false })
  }, [highlightTarget, router])

  return (
    <HighlightProvider value={highlightTarget}>
      {children}
    </HighlightProvider>
  )
}

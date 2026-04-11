import { Suspense } from 'react'
import { FadeIn } from '@/components/fade-in'

/**
 * Suspense boundary + FadeIn wrapper for streaming server components.
 * Children fade in smoothly when their data resolves.
 */
export function SuspenseFadeIn({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback ?? null}>
      <FadeIn>
        {children}
      </FadeIn>
    </Suspense>
  )
}

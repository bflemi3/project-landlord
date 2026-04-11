import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PostHogIdentifyWrapper } from './posthog-identify-wrapper'

export const metadata: Metadata = {
  title: {
    absolute: 'mabenn',
    template: '%s | mabenn',
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col">
      <Suspense fallback={null}>
        <PostHogIdentifyWrapper />
      </Suspense>
      {children}
    </div>
  )
}

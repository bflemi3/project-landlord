import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PostHogIdentify } from '@/components/posthog-identify'

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
        <PostHogIdentify />
      </Suspense>
      {children}
    </div>
  )
}

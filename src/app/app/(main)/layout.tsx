import { Suspense } from 'react'
import { Wordmark } from '@/components/wordmark'
import { UserAvatarMenu } from './user-avatar-menu'
import { MobileHeader } from './mobile-header'
import { SwUpdateNotifier } from '@/components/sw-update-notifier'
import { InstallPrompt } from '@/components/install-prompt'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop header — fixed positioning, hidden on mobile */}
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="h-6" href="/app" />
      </div>
      <Suspense fallback={null}>
        <UserAvatarMenu />
      </Suspense>

      {/* Mobile header — inline, hidden on desktop */}
      <MobileHeader />

      <div className="min-h-0 flex-1">
        {children}
      </div>
      <SwUpdateNotifier />
      <InstallPrompt />
    </>
  )
}
